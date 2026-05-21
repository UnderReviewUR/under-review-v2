import { getDurableJson, setDurableJson } from "./_durableStore.js";
import {
  F1_ODDS_CACHE_TTL_SECONDS,
  F1_ODDS_MARKET_KEYS,
  F1_ODDS_STALE_MS,
  F1_SMARKETS_MARKET_MATCHERS,
  SMARKETS_API_BASE,
  SMARKETS_EVENTS_URL,
  f1OddsCacheKey,
} from "../shared/f1OddsConstants.js";
import {
  smarketsBestBidTick,
  smarketsBidToOdds,
} from "../shared/smarketsOddsConvert.js";

const UA = "UnderReview/1.0 (+https://under-review.app)";
const memCache = new Map();

/**
 * @param {string} path
 */
function smarketsUrl(path) {
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${SMARKETS_API_BASE}${p}`;
}

/**
 * @param {string} url
 */
async function smarketsFetchJson(url) {
  const res = await fetch(url, {
    headers: { Accept: "application/json", "User-Agent": UA },
    signal: AbortSignal.timeout(25000),
  });
  const text = await res.text();
  let body;
  try {
    body = JSON.parse(text);
  } catch {
    body = { raw: text.slice(0, 300) };
  }
  if (!res.ok) {
    const err = new Error(`Smarkets ${res.status} ${url}`);
    err.status = res.status;
    err.body = body;
    throw err;
  }
  return body;
}

/**
 * @param {Record<string, unknown>} ev
 */
export function isF1MainRaceSmarketsEvent(ev) {
  const name = String(ev?.name || "");
  const slug = String(ev?.slug || "");
  if (/nascar|indianapolis 500|indy/i.test(name)) return false;
  if (/^f1\s+race/i.test(name) || /f1-race-/i.test(slug)) return true;
  if (/grand prix/i.test(name) && !/practice|qualification|qualifying|sprint/i.test(name)) {
    return /f1/i.test(name) || /f1/i.test(slug);
  }
  return false;
}

/**
 * @param {Array<Record<string, unknown>>} events
 */
export function pickUpcomingF1RaceEvent(events) {
  const candidates = (events || [])
    .filter(isF1MainRaceSmarketsEvent)
    .map((ev) => ({
      ev,
      startMs: Date.parse(String(ev.start_datetime || ev.start_date || "")),
    }))
    .filter((row) => Number.isFinite(row.startMs) && row.startMs > Date.now() - 60 * 60 * 1000);

  candidates.sort((a, b) => a.startMs - b.startMs);
  return candidates[0]?.ev || null;
}

/**
 * @param {string} marketName
 * @returns {string | null}
 */
export function resolveF1MarketBucket(marketName) {
  const name = String(marketName || "");
  for (const key of F1_ODDS_MARKET_KEYS) {
    const matcher = F1_SMARKETS_MARKET_MATCHERS[key];
    if (matcher?.(name)) return key;
  }
  return null;
}

/**
 * @param {string | number} eventId
 */
async function readCacheEntry(eventId) {
  const key = f1OddsCacheKey(eventId);
  const mem = memCache.get(key);
  if (mem) return mem;
  return getDurableJson(key);
}

/**
 * @param {string | number} eventId
 * @param {{ payload: Record<string, unknown>, fetchedAtMs: number }} entry
 */
async function writeCacheEntry(eventId, entry) {
  const key = f1OddsCacheKey(eventId);
  memCache.set(key, entry);
  try {
    await setDurableJson(key, entry, { ttlSeconds: F1_ODDS_CACHE_TTL_SECONDS });
  } catch {
    /* KV optional locally */
  }
}

/**
 * @param {number} fetchedAtMs
 * @param {number} [nowMs]
 */
export function buildF1OddsFreshness(fetchedAtMs, nowMs = Date.now()) {
  const ageMs = Math.max(0, nowMs - fetchedAtMs);
  const isStale = ageMs > F1_ODDS_STALE_MS;
  return {
    fetchedAt: new Date(fetchedAtMs).toISOString(),
    ageMinutes: Math.round(ageMs / 60000),
    isStale,
    staleWarning: isStale
      ? "F1 Smarkets odds are more than 2 hours old — do not cite specific American prices as current live lines; describe relative value in words or ask the user to confirm prices."
      : null,
  };
}

/**
 * @param {Record<string, unknown>} payload
 * @param {number} fetchedAtMs
 */
export function decorateF1OddsWithFreshness(payload, fetchedAtMs) {
  const freshness = buildF1OddsFreshness(fetchedAtMs);
  return {
    ...payload,
    fetchedAtMs,
    fetchedAt: freshness.fetchedAt,
    freshness,
    hasPostedLines: Boolean(
      payload?.markets?.raceWinner?.some((r) => r.americanOdds != null) ||
        payload?.markets?.fastestLap?.length,
    ),
  };
}

/**
 * @param {string} marketId
 * @param {Array<{ id: string, name: string }>} contracts
 */
async function fetchMarketQuoteRows(marketId, contracts) {
  const quotes = await smarketsFetchJson(smarketsUrl(`/markets/${marketId}/quotes/`));
  const rows = [];
  for (const c of contracts) {
    const tick = smarketsBestBidTick(quotes, c.id);
    const odds = smarketsBidToOdds(tick);
    if (!odds) continue;
    rows.push({
      driverName: c.name,
      contractId: String(c.id),
      decimalOdds: odds.decimalOdds,
      americanOdds: odds.americanOdds,
    });
  }
  rows.sort((a, b) => {
    const da = Number(a.decimalOdds);
    const db = Number(b.decimalOdds);
    return da - db;
  });
  return rows;
}

/**
 * @param {string | number} [eventId]
 */
export async function resolveF1OddsScrapeTarget(eventId) {
  if (eventId != null && String(eventId).trim()) {
    const id = String(eventId).trim();
    const list = await smarketsFetchJson(SMARKETS_EVENTS_URL);
    const events = Array.isArray(list?.events) ? list.events : [];
    const ev = events.find((e) => String(e.id) === id);
    if (!ev) throw new Error(`Smarkets event not found: ${id}`);
    return {
      eventId: id,
      raceStartMs: Date.parse(String(ev.start_datetime || "")) || null,
      raceName: String(ev.name || ""),
      source: "query_eventId",
    };
  }

  const list = await smarketsFetchJson(SMARKETS_EVENTS_URL);
  const events = Array.isArray(list?.events) ? list.events : [];
  const ev = pickUpcomingF1RaceEvent(events);
  if (!ev) throw new Error("No upcoming F1 main race on Smarkets");

  return {
    eventId: String(ev.id),
    raceStartMs: Date.parse(String(ev.start_datetime || "")) || null,
    raceName: String(ev.name || ""),
    source: "upcoming_race",
  };
}

/**
 * Cron / manual refresh — Smarkets REST only.
 * @param {string | number} [eventId]
 */
export async function scrapeAndCacheF1Odds(eventId) {
  const target = await resolveF1OddsScrapeTarget(eventId);
  const nowMs = Date.now();

  const marketsBody = await smarketsFetchJson(
    smarketsUrl(`/events/${target.eventId}/markets/`),
  );
  const smarketsMarkets = Array.isArray(marketsBody?.markets) ? marketsBody.markets : [];

  /** @type {Record<string, Array<{ driverName: string, contractId: string, decimalOdds: number, americanOdds: number }>>} */
  const markets = {
    raceWinner: [],
    top3: [],
    fastestLap: [],
    winningConstructor: [],
  };

  const bucketsFound = new Set();

  for (const m of smarketsMarkets) {
    const bucket = resolveF1MarketBucket(m.name);
    if (!bucket || !markets[bucket]) continue;
    if (bucketsFound.has(bucket)) continue;

    const contractsBody = await smarketsFetchJson(smarketsUrl(`/markets/${m.id}/contracts/`));
    const contracts = (contractsBody?.contracts || []).map((c) => ({
      id: String(c.id),
      name: String(c.name || ""),
    }));
    if (!contracts.length) continue;

    const rows = await fetchMarketQuoteRows(String(m.id), contracts);
    if (rows.length) {
      markets[bucket] = rows;
      bucketsFound.add(bucket);
    }
  }

  const payload = {
    eventId: target.eventId,
    raceName: target.raceName,
    raceStartMs: target.raceStartMs,
    source: "smarkets_v3",
    markets,
  };

  const entry = {
    payload,
    fetchedAtMs: nowMs,
    raceStartMs: target.raceStartMs,
  };

  await writeCacheEntry(target.eventId, entry);

  console.log(
    JSON.stringify({
      event: "f1_odds_cached",
      eventId: target.eventId,
      raceName: target.raceName,
      raceWinnerCount: markets.raceWinner.length,
      top3Count: markets.top3.length,
      fastestLapCount: markets.fastestLap.length,
      winningConstructorCount: markets.winningConstructor.length,
    }),
  );

  return decorateF1OddsWithFreshness(payload, nowMs);
}

/**
 * Self-healing read for UR Take — cold or stale KV triggers live Smarkets scrape.
 * @param {string | number} [eventId]
 */
export async function getF1OddsForUrTake(eventId) {
  let id = eventId != null && String(eventId).trim() ? String(eventId).trim() : null;
  if (!id) {
    try {
      const target = await resolveF1OddsScrapeTarget();
      id = target.eventId;
    } catch {
      return null;
    }
  }

  const nowMs = Date.now();
  const cached = await readCacheEntry(id);
  const stale =
    !cached?.payload ||
    nowMs - Number(cached.fetchedAtMs || 0) >= F1_ODDS_STALE_MS;

  if (cached?.payload && !stale) {
    return decorateF1OddsWithFreshness(cached.payload, cached.fetchedAtMs);
  }

  try {
    const live = await scrapeAndCacheF1Odds(id);
    console.log(
      JSON.stringify({
        event: "f1_odds_self_heal",
        eventId: id,
        hadCache: Boolean(cached?.payload),
        raceWinnerCount: live?.markets?.raceWinner?.length ?? 0,
      }),
    );
    return live;
  } catch (err) {
    console.warn(
      JSON.stringify({
        event: "f1_odds_self_heal_failed",
        eventId: id,
        error: err?.message || String(err),
      }),
    );
    if (cached?.payload) {
      return decorateF1OddsWithFreshness(cached.payload, cached.fetchedAtMs);
    }
    return null;
  }
}

/**
 * Top race-winner lines + fastest-lap block for UR Take system prompt.
 * @param {Record<string, unknown> | null | undefined} odds
 */
export function buildF1OddsPromptBlock(odds) {
  if (!odds?.markets) return "";

  const lines = [];
  const fresh = odds.freshness;
  if (fresh?.staleWarning) {
    lines.push("F1 ODDS FRESHNESS (mandatory):", fresh.staleWarning, `Fetched at: ${fresh.fetchedAt || odds.fetchedAt || "unknown"}.`);
  } else if (odds.fetchedAt) {
    lines.push(
      `F1 ODDS FRESHNESS: Smarkets exchange prices fetched at ${odds.fetchedAt} (${fresh?.ageMinutes ?? "?"} min ago). Cite only prices listed below.`,
    );
  }

  const winners = Array.isArray(odds.markets.raceWinner) ? odds.markets.raceWinner : [];
  const top5 = winners.filter((r) => r.americanOdds != null).slice(0, 5);
  if (top5.length) {
    lines.push("", "F1 RACE WINNER ODDS (Smarkets best bid — top 5 by price):");
    for (const r of top5) {
      lines.push(`- ${r.driverName}: ${r.americanOdds > 0 ? `+${r.americanOdds}` : r.americanOdds} (decimal ${r.decimalOdds})`);
    }
  }

  const fl = Array.isArray(odds.markets.fastestLap) ? odds.markets.fastestLap : [];
  const flTop = fl.filter((r) => r.americanOdds != null).slice(0, 5);
  if (flTop.length) {
    lines.push("", "F1 FASTEST LAP MARKET (Smarkets):");
    for (const r of flTop) {
      lines.push(`- ${r.driverName}: ${r.americanOdds > 0 ? `+${r.americanOdds}` : r.americanOdds}`);
    }
  }

  const wc = Array.isArray(odds.markets.winningConstructor)
    ? odds.markets.winningConstructor
    : [];
  const wcTop = wc.filter((r) => r.americanOdds != null).slice(0, 3);
  if (wcTop.length) {
    lines.push("", "F1 WINNING CONSTRUCTOR (Smarkets):");
    for (const r of wcTop) {
      lines.push(`- ${r.driverName}: ${r.americanOdds > 0 ? `+${r.americanOdds}` : r.americanOdds}`);
    }
  }

  if (!lines.length) return "";
  return `\n${lines.join("\n")}\n`;
}

/**
 * Attach cached Smarkets odds onto F1 UR context.
 * @param {Record<string, unknown>} f1Context
 */
export async function attachF1SmarketsOddsToContext(f1Context) {
  if (!f1Context || typeof f1Context !== "object") return f1Context;
  const odds = await getF1OddsForUrTake();
  if (!odds) return f1Context;
  return {
    ...f1Context,
    odds,
    smarketsOdds: odds,
  };
}
