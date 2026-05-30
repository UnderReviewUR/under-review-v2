import { getEnv } from "./_env.js";
import { logOddsApiUsage } from "./_oddsApiUsageLog.js";
import { getDurableJson, setDurableJson } from "./_durableStore.js";
import {
  extractGolfTournamentIntentFromQuestion,
  golfLabelsMatchIntent,
  slugifyGolfLabel,
} from "../shared/golfTournamentIntent.js";
import {
  buildGolfOddsFreshness,
  getEtHour24At,
  getEtYmdAt,
  isGolfTournamentEtDay,
  shouldRefreshGolfOddsCache,
} from "../shared/golfOddsCachePolicy.js";
import {
  hydratePgaChampionshipBoardOdds,
  isPgaChampionshipEvent,
} from "./_golfPgaChampionshipOdds.js";

const ODDS_BASE = "https://api.the-odds-api.com/v4";
const REGIONS = "us,us2";
const ODDS_FORMAT = "american";
const PREFERRED_BOOKS = ["draftkings", "fanduel", "betmgm", "williamhill_us", "pointsbetus"];

const memOddsCache = new Map();

/** @type {Record<string, string[]>} */
const SPORT_KEYS_BY_INTENT_SLUG = {
  pga_championship: ["golf_pga_championship", "golf_pga"],
  masters: ["golf_masters", "golf_masters_tournament", "golf_pga"],
  us_open: ["golf_us_open", "golf_pga"],
  the_open: ["golf_the_open_championship", "golf_the_open", "golf_pga"],
  players: ["golf_pga"],
  byron_nelson: ["golf_pga"],
  rbc_heritage: ["golf_pga"],
  memorial: ["golf_pga"],
  genesis: ["golf_pga"],
  pebble: ["golf_pga"],
  wells_fargo: ["golf_pga"],
  farmers: ["golf_pga"],
};

const DEFAULT_SPORT_KEYS = [
  "golf_pga",
  "golf_pga_championship",
  "golf_masters",
  "golf_masters_tournament",
  "golf_us_open",
  "golf_the_open_championship",
];

function normalizeName(s) {
  return String(s || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, " ");
}

function pickBookmaker(bookmakers) {
  if (!Array.isArray(bookmakers) || !bookmakers.length) return null;
  for (const key of PREFERRED_BOOKS) {
    const hit = bookmakers.find((b) => b?.key === key);
    if (hit?.markets?.length) return hit;
  }
  return bookmakers.find((b) => Array.isArray(b?.markets) && b.markets.length) || null;
}

function parseMarketOutcomes(market) {
  if (!market || !Array.isArray(market.outcomes)) return [];
  return market.outcomes
    .map((o) => ({
      player: String(o?.name || "").trim(),
      odds: o?.price != null && Number.isFinite(Number(o.price)) ? Number(o.price) : null,
      book: null,
    }))
    .filter((r) => r.player);
}

/**
 * @param {import("../shared/golfTournamentIntent.js").GolfTournamentIntentDef | { slug: string, label: string } | null} intent
 * @param {{ name?: string, shortName?: string } | null | undefined} currentEvent
 */
export function resolveGolfOddsSportKeys(currentEvent, intent = null) {
  const fromIntent =
    intent?.slug && SPORT_KEYS_BY_INTENT_SLUG[intent.slug]
      ? [...SPORT_KEYS_BY_INTENT_SLUG[intent.slug]]
      : [];
  const keys = [...fromIntent];
  for (const k of DEFAULT_SPORT_KEYS) {
    if (!keys.includes(k)) keys.push(k);
  }
  return keys;
}

/**
 * @param {Record<string, unknown>} oddsEvent
 * @param {{ name?: string, shortName?: string } | null | undefined} currentEvent
 * @param {{ slug: string, label: string } | null} intent
 */
export function oddsEventMatchesCurrentTournament(oddsEvent, currentEvent, intent) {
  if (!oddsEvent || !currentEvent) return false;
  const title = `${oddsEvent.home_team || ""} ${oddsEvent.sport_title || ""}`.trim();
  if (intent && golfLabelsMatchIntent(title, null, intent)) return true;
  if (intent && golfLabelsMatchIntent(currentEvent.name, currentEvent.shortName, intent)) {
    return golfLabelsMatchIntent(title, null, intent);
  }
  const a = slugifyGolfLabel(currentEvent.name || currentEvent.shortName || "");
  const b = slugifyGolfLabel(title);
  if (!a || !b) return false;
  return a === b || a.includes(b) || b.includes(a);
}

function buildOddsCacheKey(currentEvent, intent) {
  const slug = intent?.slug || "generic";
  const name = slugifyGolfLabel(currentEvent?.name || currentEvent?.shortName || "pga");
  return `golf_odds_api_v1:${slug}:${name}`;
}

function getMemOddsCache(key) {
  const row = memOddsCache.get(key);
  if (!row) return null;
  if (Date.now() > row.expiresAt) {
    memOddsCache.delete(key);
    return null;
  }
  return row.value;
}

function setMemOddsCache(key, value, ttlMs) {
  memOddsCache.set(key, { value, expiresAt: Date.now() + ttlMs });
}

async function readOddsCache(key) {
  return getMemOddsCache(key) || (await getDurableJson(key));
}

async function writeOddsCache(key, value, ttlMs) {
  setMemOddsCache(key, value, ttlMs);
  const ttlSeconds = Math.max(60, Math.floor(ttlMs / 1000));
  try {
    await setDurableJson(key, value, { ttlSeconds });
  } catch {
    /* KV optional */
  }
}

/**
 * @param {string} url
 */
async function fetchOddsJson(url) {
  const res = await fetch(url, { cache: "no-store" });
  logOddsApiUsage({ label: "golf.odds_api", url, response: res });
  if (!res.ok) return { ok: false, data: null, status: res.status };
  try {
    const data = await res.json();
    return { ok: true, data, status: res.status };
  } catch {
    return { ok: false, data: null, status: res.status };
  }
}

/**
 * @param {string} apiKey
 * @param {string} sportKey
 */
async function fetchGolfOutrightsList(apiKey, sportKey) {
  const url = `${ODDS_BASE}/sports/${encodeURIComponent(sportKey)}/odds/?apiKey=${encodeURIComponent(apiKey)}&regions=${REGIONS}&markets=outrights&oddsFormat=${ODDS_FORMAT}`;
  const result = await fetchOddsJson(url);
  if (!result.ok || !Array.isArray(result.data)) return [];
  return result.data;
}

/**
 * @param {string} apiKey
 * @param {string} sportKey
 * @param {string} eventId
 */
async function fetchGolfEventPlacementMarkets(apiKey, sportKey, eventId) {
  const markets = "top_10_finish,top_20_finish,make_cut";
  const url = `${ODDS_BASE}/sports/${encodeURIComponent(sportKey)}/events/${encodeURIComponent(eventId)}/odds?apiKey=${encodeURIComponent(apiKey)}&regions=${REGIONS}&markets=${markets}&oddsFormat=${ODDS_FORMAT}`;
  const result = await fetchOddsJson(url);
  if (!result.ok || !result.data) return null;
  return result.data;
}

/**
 * @param {unknown} eventPayload
 * @param {string} bookKey
 */
function parseGolfOddsFromEventPayload(eventPayload, bookKey) {
  const bookmakers = eventPayload?.bookmakers;
  const book = pickBookmaker(bookmakers);
  if (!book) {
    return { outrights: [], topFinish: {}, makeCut: {} };
  }

  const outrights = [];
  const topFinish = { top_10: [], top_20: [] };
  const makeCut = {};

  for (const market of book.markets || []) {
    const key = String(market?.key || "");
    const rows = parseMarketOutcomes(market).map((r) => ({
      ...r,
      book: book.key || bookKey,
      source: "odds_api",
    }));
    if (key === "outrights") {
      outrights.push(...rows);
    } else if (key === "top_10_finish") {
      topFinish.top_10.push(...rows);
    } else if (key === "top_20_finish") {
      topFinish.top_20.push(...rows);
    } else if (key === "make_cut") {
      for (const row of rows) {
        if (row.player) makeCut[row.player] = { odds: row.odds, book: row.book, source: "odds_api" };
      }
    }
  }

  return { outrights, topFinish, makeCut, book: book.key };
}

/**
 * @param {string} apiKey
 * @param {{ name?: string, shortName?: string, startDate?: string, endDate?: string, state?: string } | null | undefined} currentEvent
 */
export async function fetchFreshGolfOddsFromApi(apiKey, currentEvent) {
  const intent = extractGolfTournamentIntentFromQuestion(
    `${currentEvent?.name || ""} ${currentEvent?.shortName || ""}`,
  );
  const sportKeys = resolveGolfOddsSportKeys(currentEvent, intent);

  for (const sportKey of sportKeys) {
    const events = await fetchGolfOutrightsList(apiKey, sportKey);
    const match = events.find((ev) => oddsEventMatchesCurrentTournament(ev, currentEvent, intent));
    if (!match?.id) continue;

    let parsed = parseGolfOddsFromEventPayload(match, sportKey);
    const placement = await fetchGolfEventPlacementMarkets(apiKey, sportKey, String(match.id));
    if (placement) {
      const extra = parseGolfOddsFromEventPayload(placement, sportKey);
      if (extra.topFinish.top_10.length) parsed.topFinish.top_10 = extra.topFinish.top_10;
      if (extra.topFinish.top_20.length) parsed.topFinish.top_20 = extra.topFinish.top_20;
      if (Object.keys(extra.makeCut).length) parsed.makeCut = extra.makeCut;
      if (!parsed.outrights.length && extra.outrights.length) {
        parsed.outrights = extra.outrights;
      }
    }

    const hasLines = parsed.outrights.some((o) => o.odds != null && Number.isFinite(o.odds));
    if (hasLines || parsed.outrights.length > 0) {
      return {
        outrights: parsed.outrights,
        topFinish: parsed.topFinish,
        makeCut: parsed.makeCut,
        eventId: String(match.id),
        sportKey,
        eventName: String(match.home_team || match.sport_title || currentEvent?.name || ""),
        marketStatus: hasLines ? "posted" : "field",
        linesUnavailable: !hasLines,
        source: "odds_api",
      };
    }
  }

  return null;
}

/**
 * @param {Record<string, unknown>} apiOdds
 * @param {number} fetchedAtMs
 */
export function decorateGolfOddsWithFreshness(apiOdds, fetchedAtMs) {
  const freshness = buildGolfOddsFreshness(fetchedAtMs);
  return {
    ...apiOdds,
    fetchedAt: freshness.fetchedAt,
    freshness,
    hasPostedLines: (apiOdds.outrights || []).some(
      (o) => o?.odds != null && Number.isFinite(Number(o.odds)),
    ),
  };
}

/**
 * @param {Record<string, unknown>} apiOdds
 * @param {Record<string, unknown>} espnFieldOdds
 */
export function mergeGolfOddsWithEspnField(apiOdds, espnFieldOdds) {
  const espn = espnFieldOdds && typeof espnFieldOdds === "object" ? espnFieldOdds : {};
  const apiRows = Array.isArray(apiOdds?.outrights) ? apiOdds.outrights : [];
  const hasNumeric = apiRows.some((o) => o?.odds != null && Number.isFinite(Number(o.odds)));

  if (!hasNumeric) {
    return {
      ...espn,
      freshness: apiOdds?.freshness || espn.freshness,
      fetchedAt: apiOdds?.fetchedAt || espn.fetchedAt,
    };
  }

  const byNorm = new Map();
  for (const row of apiRows) {
    const k = normalizeName(row.player);
    if (k) byNorm.set(k, row);
  }

  for (const row of espn.outrights || []) {
    const k = normalizeName(row.player);
    if (!k || byNorm.has(k)) continue;
    byNorm.set(k, { ...row, odds: null, source: row.source || "espn_field" });
  }

  return {
    ...espn,
    outrights: [...byNorm.values()].slice(0, 120),
    topFinish:
      apiOdds.topFinish && Object.keys(apiOdds.topFinish).length
        ? apiOdds.topFinish
        : espn.topFinish || {},
    makeCut:
      apiOdds.makeCut && Object.keys(apiOdds.makeCut).length ? apiOdds.makeCut : espn.makeCut || {},
    eventName: apiOdds.eventName || espn.eventName,
    marketStatus: "posted",
    linesUnavailable: false,
    fieldUnavailableMessage: null,
    source: apiOdds.source || "odds_api",
    sportKey: apiOdds.sportKey || null,
    oddsApiEventId: apiOdds.eventId || null,
    fetchedAt: apiOdds.fetchedAt,
    freshness: apiOdds.freshness,
    hasPostedLines: true,
  };
}

/**
 * @param {{ name?: string, shortName?: string, startDate?: string, endDate?: string, state?: string } | null | undefined} currentEvent
 */
export async function getGolfOddsFromOddsApi(currentEvent) {
  const apiKey = getEnv("ODDS_API_KEY");
  if (!apiKey || !currentEvent) return null;

  const intent = extractGolfTournamentIntentFromQuestion(
    `${currentEvent.name || ""} ${currentEvent.shortName || ""}`,
  );
  const cacheKey = buildOddsCacheKey(currentEvent, intent);
  const nowMs = Date.now();
  const cached = await readOddsCache(cacheKey);

  if (cached?.payload && !shouldRefreshGolfOddsCache(cached, nowMs, currentEvent)) {
    return decorateGolfOddsWithFreshness(cached.payload, cached.fetchedAtMs);
  }

  const fresh = await fetchFreshGolfOddsFromApi(apiKey, currentEvent);
  if (fresh) {
    const todayEt = getEtYmdAt(nowMs);
    const openingRefreshEtYmd =
      getEtHour24At(nowMs) >= 8 && isGolfTournamentEtDay(currentEvent, todayEt)
        ? todayEt
        : cached?.openingRefreshEtYmd || null;
    const entry = {
      payload: fresh,
      fetchedAtMs: nowMs,
      openingRefreshEtYmd,
    };
    await writeOddsCache(cacheKey, entry, 2 * 60 * 60 * 1000);
    console.log(
      JSON.stringify({
        event: "golf_odds_api_fetched",
        sportKey: fresh.sportKey,
        eventId: fresh.eventId,
        outrights: fresh.outrights.length,
        posted: fresh.outrights.filter((o) => o.odds != null).length,
      }),
    );
    return decorateGolfOddsWithFreshness(fresh, nowMs);
  }

  if (cached?.payload) {
    return decorateGolfOddsWithFreshness(cached.payload, cached.fetchedAtMs);
  }

  return null;
}

/**
 * Attach posted golf odds for supported tournaments.
 * PGA Championship uses the championship-site cache; regular PGA events use The Odds API when configured.
 * @param {Record<string, unknown>} board
 */
export async function hydrateGolfBoardOdds(board) {
  if (!board || typeof board !== "object") return board;
  if (!board.currentEvent) return board;
  if (isPgaChampionshipEvent(board.currentEvent)) {
    return hydratePgaChampionshipBoardOdds(board);
  }
  const espnOdds =
    board.odds && typeof board.odds === "object"
      ? board.odds
      : { outrights: [], topFinish: {}, makeCut: {}, linesUnavailable: true };
  const apiOdds = await getGolfOddsFromOddsApi(board.currentEvent);
  if (!apiOdds) return board;
  return {
    ...board,
    odds: mergeGolfOddsWithEspnField(apiOdds, espnOdds),
    sourceMeta: {
      ...(board.sourceMeta || {}),
      odds: apiOdds.hasPostedLines ? "odds_api" : board.sourceMeta?.odds,
      oddsFetchedAt: apiOdds.fetchedAt,
      oddsStale: Boolean(apiOdds.freshness?.isStale),
    },
  };
}

/**
 * @param {string | null | undefined} oddsFreshness
 */
export function buildGolfOddsFreshnessPromptBlock(odds) {
  const fresh = odds?.freshness;
  if (!fresh?.isStale && !fresh?.staleWarning) {
    if (odds?.fetchedAt) {
      return `\nODDS FRESHNESS: Posted prices fetched at ${odds.fetchedAt} (${fresh?.ageMinutes ?? "?"} min ago). Cite only prices listed under odds.outrights / odds.topFinish / odds.makeCut.\n`;
    }
    return "";
  }
  return `\nODDS FRESHNESS (mandatory):\n${fresh.staleWarning}\nFetched at: ${fresh.fetchedAt || odds.fetchedAt || "unknown"}.\n`;
}
