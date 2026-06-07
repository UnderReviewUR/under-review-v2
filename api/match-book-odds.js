/**
 * Per-match multi-book moneylines from The Odds API (TNNS-style comparison).
 * Cached in KV; WC UI should use ESPN only (see BookmakerOddsPanel fetchMultiBook).
 *
 * GET ?sportKey=tennis_atp&eventId=...
 *   OR ?sportKey=soccer_fifa_world_cup&home=...&away=...
 */

import { applyCors } from "./_cors.js";
import { getEnv } from "./_env.js";
import { getDurableJson, setDurableJson } from "./_durableStore.js";
import { logOddsApiUsage } from "./_oddsApiUsageLog.js";
import { probeOddsApiCredits } from "./_wcOutrightsFallback.js";
import { getWcTeamByAbbr } from "../src/data/wc2026Teams.js";
import {
  extractMultiBookOddsFromEvent,
  findOddsApiEventByTeams,
} from "../shared/multiBookOdds.js";
import {
  isMatchBookOddsEnabled,
  matchBookOddsEventCacheKey,
  matchBookOddsHasQuota,
  matchBookOddsListCacheKey,
  MATCH_BOOK_ODDS_EVENT_TTL_SECONDS,
  MATCH_BOOK_ODDS_LIST_TTL_SECONDS,
  MATCH_BOOK_ODDS_MARKETS,
  MATCH_BOOK_ODDS_REGIONS,
} from "../shared/matchBookOddsPolicy.js";

const BASE = "https://api.the-odds-api.com/v4";

const WC_SPORT_KEYS = ["soccer_fifa_world_cup", "soccer_world_cup"];
const TENNIS_SPORT_KEYS = ["tennis_atp_miami", "tennis_atp_french_open", "tennis_atp"];

function resolveTeamName(name, abbr) {
  const fromName = String(name || "").trim();
  if (fromName) return fromName;
  const team = getWcTeamByAbbr(abbr);
  return team?.name || String(abbr || "").trim();
}

/**
 * @param {string} sportKey
 * @param {string} eventId
 * @param {string} apiKey
 */
async function fetchEventOddsUpstream(sportKey, eventId, apiKey) {
  const url =
    `${BASE}/sports/${encodeURIComponent(sportKey)}/events/${encodeURIComponent(eventId)}/odds/` +
    `?apiKey=${encodeURIComponent(apiKey)}&regions=${MATCH_BOOK_ODDS_REGIONS}` +
    `&markets=${MATCH_BOOK_ODDS_MARKETS}&oddsFormat=american`;
  const res = await fetch(url, { cache: "no-store" });
  logOddsApiUsage({ label: `match-book-odds.event:${sportKey}`, url, response: res });
  if (!res.ok) return null;
  try {
    return await res.json();
  } catch {
    return null;
  }
}

/**
 * @param {string} sportKey
 * @param {string} apiKey
 */
async function fetchSportOddsListUpstream(sportKey, apiKey) {
  const url =
    `${BASE}/sports/${encodeURIComponent(sportKey)}/odds/` +
    `?apiKey=${encodeURIComponent(apiKey)}&regions=${MATCH_BOOK_ODDS_REGIONS}` +
    `&markets=${MATCH_BOOK_ODDS_MARKETS}&oddsFormat=american`;
  const res = await fetch(url, { cache: "no-store" });
  logOddsApiUsage({ label: `match-book-odds.list:${sportKey}`, url, response: res });
  if (!res.ok) return [];
  try {
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

/**
 * @param {() => Promise<unknown>} fetcher
 */
async function withOddsApiQuota(fetcher) {
  const quota = await probeOddsApiCredits();
  if (!quota.ok || !matchBookOddsHasQuota(quota.remaining)) {
    return { ok: false, error: quota.error || `odds_api_quota_${quota.remaining}`, data: null };
  }
  const data = await fetcher();
  return { ok: true, error: null, data };
}

/**
 * @param {string} cacheKey
 * @param {number} ttlSeconds
 */
async function readCachedPayload(cacheKey) {
  const cached = await getDurableJson(cacheKey);
  if (!cached || typeof cached !== "object") return null;
  if (!cached.payload) return null;
  return cached;
}

/**
 * @param {string} cacheKey
 * @param {unknown} payload
 * @param {number} ttlSeconds
 */
async function writeCachedPayload(cacheKey, payload, ttlSeconds) {
  await setDurableJson(
    cacheKey,
    { lastUpdated: Date.now(), payload },
    { ttlSeconds },
  );
}

/**
 * @param {string} sportKey
 * @param {string} eventId
 * @param {string} apiKey
 */
async function getCachedEventOdds(sportKey, eventId, apiKey) {
  const cacheKey = matchBookOddsEventCacheKey(sportKey, eventId);
  const hit = await readCachedPayload(cacheKey);
  if (hit?.payload) {
    return { event: hit.payload, fromCache: true };
  }

  const fetched = await withOddsApiQuota(() => fetchEventOddsUpstream(sportKey, eventId, apiKey));
  if (!fetched.ok) return { event: null, fromCache: false, error: fetched.error };
  if (fetched.data) {
    await writeCachedPayload(cacheKey, fetched.data, MATCH_BOOK_ODDS_EVENT_TTL_SECONDS);
  }
  return { event: fetched.data, fromCache: false };
}

/**
 * @param {string} sportKey
 * @param {string} apiKey
 */
async function getCachedSportOddsList(sportKey, apiKey) {
  const cacheKey = matchBookOddsListCacheKey(sportKey);
  const hit = await readCachedPayload(cacheKey);
  if (hit?.payload) {
    return { events: /** @type {Array<Record<string, unknown>>} */ (hit.payload), fromCache: true };
  }

  const fetched = await withOddsApiQuota(() => fetchSportOddsListUpstream(sportKey, apiKey));
  if (!fetched.ok) {
    return { events: [], fromCache: false, error: fetched.error };
  }
  const events = Array.isArray(fetched.data) ? fetched.data : [];
  if (events.length) {
    await writeCachedPayload(cacheKey, events, MATCH_BOOK_ODDS_LIST_TTL_SECONDS);
  }
  return { events, fromCache: false };
}

/**
 * @param {string} sportKey
 * @param {string} home
 * @param {string} away
 * @param {string} apiKey
 */
async function resolveEventForTeams(sportKey, home, away, apiKey) {
  const keysToTry =
    sportKey === "soccer_fifa_world_cup" || sportKey === "soccer_world_cup"
      ? WC_SPORT_KEYS
      : sportKey.startsWith("tennis_")
        ? [sportKey, ...TENNIS_SPORT_KEYS.filter((k) => k !== sportKey)]
        : [sportKey];

  for (const key of keysToTry) {
    const listResult = await getCachedSportOddsList(key, apiKey);
    if (listResult.error) return { event: null, sportKey, error: listResult.error };
    const hit = findOddsApiEventByTeams(listResult.events, home, away);
    if (hit) return { event: hit, sportKey: key, fromCache: listResult.fromCache };
  }
  return { event: null, sportKey };
}

export default async function handler(req, res) {
  if (!applyCors(req, res)) return;
  if (req.method !== "GET") {
    return res.status(405).json({ ok: false, error: "method_not_allowed" });
  }

  if (!isMatchBookOddsEnabled()) {
    return res.status(200).json({ ok: false, books: [], error: "match_book_odds_disabled" });
  }

  const apiKey = getEnv("ODDS_API_KEY");
  if (!apiKey) {
    return res.status(200).json({ ok: false, books: [], error: "no_odds_key" });
  }

  const q = req.query || {};
  let sportKey = String(q.sportKey || "").trim();
  const eventId = String(q.eventId || "").trim();
  const home = resolveTeamName(q.home, q.homeAbbr);
  const away = resolveTeamName(q.away, q.awayAbbr);

  if (!sportKey && (q.homeAbbr || q.awayAbbr)) {
    sportKey = "soccer_fifa_world_cup";
  }
  if (!sportKey && (home || away)) {
    sportKey = "tennis_atp";
  }
  if (!sportKey) {
    return res.status(400).json({ ok: false, error: "missing_sport_key" });
  }

  let event = null;
  let usedSportKey = sportKey;
  let fromCache = false;
  let quotaError = null;

  if (eventId) {
    const eventResult = await getCachedEventOdds(sportKey, eventId, apiKey);
    event = eventResult.event;
    fromCache = eventResult.fromCache === true;
    quotaError = eventResult.error || null;
    if (!event && home && away) {
      const resolved = await resolveEventForTeams(sportKey, home, away, apiKey);
      event = resolved.event;
      if (resolved.sportKey) usedSportKey = resolved.sportKey;
      fromCache = resolved.fromCache === true;
      quotaError = resolved.error || quotaError;
    }
  } else if (home && away) {
    const resolved = await resolveEventForTeams(sportKey, home, away, apiKey);
    event = resolved.event;
    if (resolved.sportKey) usedSportKey = resolved.sportKey;
    fromCache = resolved.fromCache === true;
    quotaError = resolved.error || null;
  } else {
    return res.status(400).json({ ok: false, error: "missing_event_or_teams" });
  }

  if (!event) {
    return res.status(200).json({
      ok: false,
      sportKey: usedSportKey,
      books: [],
      error: quotaError || "event_not_found",
    });
  }

  const board = extractMultiBookOddsFromEvent(event);
  if (!board) {
    return res.status(200).json({
      ok: false,
      sportKey: usedSportKey,
      eventId: event.id || eventId || null,
      books: [],
      error: "no_book_lines",
    });
  }

  return res.status(200).json({
    ok: true,
    sportKey: usedSportKey,
    eventId: board.eventId,
    home: board.homeName,
    away: board.awayName,
    hasDraw: board.hasDraw,
    marketAverage: board.marketAverage,
    books: board.books,
    fetchedAt: new Date().toISOString(),
    fromCache,
  });
}
