/**
 * World Cup per-event player props — DK/FD/BetMGM match pages → KV (no Odds API).
 */

import { getDurableJson, setDurableJson } from "./_durableStore.js";
import {
  fetchBookPageHtml,
  parseMatchPlayerPropRowsFromHtml,
  parseMatchPlayerPropRowsFromJson,
} from "./_wcBookScrapeCommon.js";
import {
  listEnabledWcMatchPlayerPropBooks,
  resolveWcMatchPlayerPropsBookUrl,
} from "../shared/wcBookScrapePolicy.js";
import {
  WC_MATCH_PLAYER_PROPS_KV_KEY,
  WC_MATCH_PLAYER_PROPS_TTL_SECONDS,
} from "../shared/wc2026PlayerConstants.js";
import {
  attachMatchPlayerPropsFreshness,
  matchPlayerPropsForEvent,
  readFreshMatchPlayerPropsForEvent,
} from "../shared/wcMatchPlayerProps.js";
import { normalizeWcPlayerName } from "../shared/wcPlayerRegistry.js";
import { WC_MATCH_PLAYER_PROPS_SEED_BY_EVENT } from "../src/data/wc2026MatchPlayerPropsSeed.js";

const MIN_ANYTIME_ROWS = 3;

/**
 * @param {string} bookKey
 * @param {{ eventId: string, homeTeam?: string, awayTeam?: string }} meta
 */
export async function scrapeMatchPlayerPropsForBook(bookKey, meta) {
  const url = resolveWcMatchPlayerPropsBookUrl(bookKey, meta);
  if (!url) {
    return { book: bookKey, ok: false, markets: {}, error: "missing_url" };
  }

  const fetched = await fetchBookPageHtml(url);
  if (!fetched.ok || !fetched.html) {
    console.log(
      JSON.stringify({
        event: "wc_match_props_scrape_fail",
        book: bookKey,
        eventId: meta.eventId,
        error: fetched.error,
        status: fetched.status,
      }),
    );
    return { book: bookKey, ok: false, markets: {}, error: fetched.error || "fetch_failed" };
  }

  const filter = { homeTeam: meta.homeTeam, awayTeam: meta.awayTeam };
  let markets = parseMatchPlayerPropRowsFromHtml(fetched.html, filter);
  if ((markets.anytime_scorer || []).length < MIN_ANYTIME_ROWS && fetched.html.trim().startsWith("{")) {
    try {
      markets = parseMatchPlayerPropRowsFromJson(JSON.parse(fetched.html), filter);
    } catch {
      /* ignore */
    }
  }

  const anytimeCount = (markets.anytime_scorer || []).length;
  if (anytimeCount < MIN_ANYTIME_ROWS) {
    return { book: bookKey, ok: false, markets, error: "parse_empty" };
  }

  console.log(
    JSON.stringify({
      event: "wc_match_props_scrape_ok",
      book: bookKey,
      eventId: meta.eventId,
      anytimeCount,
      firstCount: (markets.first_goalscorer || []).length,
    }),
  );

  return { book: bookKey, ok: true, markets, error: null };
}

/**
 * @param {Array<{ book: string, ok: boolean, markets: Record<string, unknown[]>, error: string | null }>} bookResults
 */
function mergeMatchPropsConsensus(bookResults) {
  /** @type {Record<string, Map<string, { name: string, americanOdds: string, nationAbbr?: string, bookOdds: Record<string, string> }>>} */
  const byMarket = {
    anytime_scorer: new Map(),
    first_goalscorer: new Map(),
    last_goalscorer: new Map(),
  };

  for (const res of bookResults) {
    if (!res.ok || !res.markets) continue;
    for (const marketKey of Object.keys(byMarket)) {
      const rows = res.markets[marketKey] || [];
      for (const row of rows) {
        const name = normalizeWcPlayerName(row.name);
        if (!name || !row.americanOdds) continue;
        const key = name.toLowerCase();
        const existing = byMarket[marketKey].get(key);
        if (!existing) {
          byMarket[marketKey].set(key, {
            name,
            americanOdds: row.americanOdds,
            nationAbbr: row.nationAbbr,
            bookOdds: { [res.book]: row.americanOdds },
          });
        } else {
          existing.bookOdds[res.book] = row.americanOdds;
        }
      }
    }
  }

  /** @type {Record<string, Array<Record<string, unknown>>>} */
  const markets = {};
  for (const [marketKey, map] of Object.entries(byMarket)) {
    markets[marketKey] = [...map.values()].slice(0, 40);
  }
  const booksUsed = bookResults.filter((r) => r.ok).map((r) => r.book);
  return { markets, booksUsed };
}

/**
 * @param {Record<string, Array<Record<string, unknown>>>} markets
 * @param {string} eventId
 */
function mergeMatchPropsWithSeed(markets, eventId) {
  const seed = WC_MATCH_PLAYER_PROPS_SEED_BY_EVENT[String(eventId)];
  if (!seed?.markets) return markets;

  const out = { ...markets };
  for (const [marketKey, seedRows] of Object.entries(seed.markets)) {
    const existing = Array.isArray(out[marketKey]) ? [...out[marketKey]] : [];
    const seen = new Set(existing.map((r) => normalizeWcPlayerName(String(r.name)).toLowerCase()));
    for (const row of seedRows) {
      const name = normalizeWcPlayerName(row.name);
      const key = name.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      existing.push({
        name,
        americanOdds: row.americanOdds,
        nationAbbr: row.nationAbbr,
        bookOdds: { seed: row.americanOdds },
      });
    }
    out[marketKey] = existing;
  }
  return out;
}

/**
 * @param {string | number} eventId
 * @param {{ homeTeam?: string, awayTeam?: string, scrapeMode?: string }} [meta]
 */
export async function scrapeAndCacheWcMatchPlayerProps(eventId, meta = {}) {
  const id = String(eventId);
  const nowMs = Date.now();
  const scrapeMeta = {
    eventId: id,
    homeTeam: meta.homeTeam,
    awayTeam: meta.awayTeam,
  };

  const books = listEnabledWcMatchPlayerPropBooks();
  /** @type {Array<{ book: string, ok: boolean, markets: Record<string, unknown[]>, error: string | null }>} */
  const bookResults = [];
  for (const book of books) {
    bookResults.push(await scrapeMatchPlayerPropsForBook(book, scrapeMeta));
  }

  let { markets, booksUsed } = mergeMatchPropsConsensus(bookResults);
  let source = "consensus";
  const anytimeCount = (markets.anytime_scorer || []).length;

  if (anytimeCount < MIN_ANYTIME_ROWS) {
    markets = mergeMatchPropsWithSeed(markets, id);
    source = anytimeCount > 0 ? "consensus+seed" : "seed";
    if (!booksUsed.includes("seed")) booksUsed = [...booksUsed, "seed"];
  }

  const finalAnytime = (markets.anytime_scorer || []).length;
  if (finalAnytime < MIN_ANYTIME_ROWS) {
    console.log(
      JSON.stringify({
        event: "wc_match_props_skip",
        eventId: id,
        scrapeMode: meta.scrapeMode,
        anytimeCount: finalAnytime,
        error: "insufficient_rows",
      }),
    );
    return { ok: false, eventId: id, error: "insufficient_rows" };
  }

  const cached = (await getDurableJson(WC_MATCH_PLAYER_PROPS_KV_KEY)) || {};
  const byEventId =
    cached.byEventId && typeof cached.byEventId === "object" ? { ...cached.byEventId } : {};

  byEventId[id] = {
    eventId: id,
    homeTeam: meta.homeTeam || null,
    awayTeam: meta.awayTeam || null,
    lastUpdated: nowMs,
    source,
    booksUsed,
    markets,
  };

  await setDurableJson(
    WC_MATCH_PLAYER_PROPS_KV_KEY,
    { lastUpdated: nowMs, byEventId },
    { ttlSeconds: WC_MATCH_PLAYER_PROPS_TTL_SECONDS },
  );

  console.log(
    JSON.stringify({
      event: "wc_match_props_cached",
      eventId: id,
      scrapeMode: meta.scrapeMode,
      source,
      booksUsed,
      anytimeCount: finalAnytime,
      firstCount: (markets.first_goalscorer || []).length,
    }),
  );

  return {
    ok: true,
    eventId: id,
    source,
    booksUsed,
    anytimeCount: finalAnytime,
  };
}

/**
 * @param {number} [nowMs]
 */
export async function readWcMatchPlayerPropsKv(nowMs = Date.now()) {
  const raw = await getDurableJson(WC_MATCH_PLAYER_PROPS_KV_KEY);
  if (!raw) return null;
  return raw;
}

/**
 * @param {string} eventId
 * @param {number} [nowMs]
 */
export async function readWcMatchPlayerPropsForEvent(eventId, nowMs = Date.now()) {
  const kv = await readWcMatchPlayerPropsKv(nowMs);
  return readFreshMatchPlayerPropsForEvent(kv, String(eventId), nowMs);
}

/**
 * @param {string} [eventId]
 */
export async function getWcMatchPlayerPropsPayload(eventId) {
  const kv = await readWcMatchPlayerPropsKv();
  if (!eventId) {
    const by = kv?.byEventId || {};
    const eventIds = Object.keys(by);
    return {
      ok: true,
      eventCount: eventIds.length,
      eventIds: eventIds.slice(0, 50),
      lastUpdated: kv?.lastUpdated || null,
    };
  }

  const event = readFreshMatchPlayerPropsForEvent(kv, String(eventId));
  if (!event) {
    return { ok: false, error: "not_found", eventId: String(eventId) };
  }

  return {
    ok: true,
    eventId: String(eventId),
    ...event,
    anytimeCount: (event.markets?.anytime_scorer || []).length,
  };
}
