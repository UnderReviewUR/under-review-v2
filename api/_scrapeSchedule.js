/**
 * Collect upcoming scrape targets from live board sources (no user-request scrapes).
 */

import { fetchNbaSlateGamesForOddsRefresh } from "./nba.js";
import { fetchMlbSlateGamesForScrapeSchedule } from "./mlb.js";
import { getUnifiedGolfBoard } from "./_golfProviders.js";
import { isPgaChampionshipEvent } from "./_golfPgaChampionshipOdds.js";
import { resolveActionNetworkGameIdForBoardGame } from "./_nbaPropsApi.js";
import { getNbaPlayoffSlateGamesForEtDates } from "./_nbaPropsGameId.js";
import {
  getEtDateString,
  getTomorrowEtDateString,
} from "../shared/nbaPlayoffSlateFromActionNetwork.js";
import { fetchBdlAtpFixturesForBoard } from "./_tennisAtpBdl.js";
import { buildGameSpreadKey, canonicalizeTeamAbbr } from "../shared/gameLineSpread.js";
import { canonicalMlbStartUtcMs, canonicalNbaStartUtcMs, parseEventStartMs } from "../shared/eventStartTime.js";
import {
  getEtYmdAt,
  isGolfTournamentEtDay,
} from "../shared/golfOddsCachePolicy.js";
import { getGolfRoundStartMsEt, GOLF_ROUND_START_HOUR_ET } from "../shared/scrapeCadencePolicy.js";
import { SMARKETS_EVENTS_URL } from "../shared/f1OddsConstants.js";
import { isF1MainRaceSmarketsEvent, pickUpcomingF1RaceEvent } from "./_f1Odds.js";

/**
 * @typedef {Object} ScrapeTarget
 * @property {string} sport — KV segment (nba_props, nba_spreads, golf_odds, mlb_props, tennis_odds, f1_odds, nfl_props)
 * @property {string} gameId
 * @property {number} gameStartMs
 * @property {Record<string, unknown>} [meta]
 */

/**
 * @param {Record<string, unknown>} game
 */
function isPreGameState(game) {
  const st = String(game?.state || "").toLowerCase();
  return st === "pre" || st === "scheduled" || st === "";
}

/**
 * @param {Record<string, unknown>} game
 * @param {number} gameStartMs
 * @param {number} nowMs
 */
function isUpcomingPreGame(game, gameStartMs, nowMs) {
  if (!isPreGameState(game)) return false;
  if (!Number.isFinite(gameStartMs)) return false;
  if (nowMs >= gameStartMs) return false;
  return true;
}

const GOLF_EXCLUDED_TOUR_PATTERNS = [
  { reason: "liv", pattern: /\bliv\b/i },
  { reason: "lpga", pattern: /\blpga\b/i },
  { reason: "dp_world_tour", pattern: /\bdp\s*world\b/i },
  { reason: "korn_ferry_tour", pattern: /\bkorn\s*ferry\b/i },
];

const GOLF_MAJOR_PATTERNS = [
  /\bmasters\b/i,
  /\bu\.?\s*s\.?\s*open\b/i,
  /\bopen championship\b/i,
  /\bthe open\b/i,
];

/**
 * @param {Record<string, unknown>} ev
 */
function golfEventBlob(ev) {
  const raw = ev?.raw && typeof ev.raw === "object" ? ev.raw : {};
  return [
    ev?.name,
    ev?.shortName,
    ev?.tour,
    ev?.tourName,
    raw?.tour,
    raw?.tour_name,
    raw?.tourName,
    raw?.league?.name,
    raw?.series?.name,
  ]
    .map((v) => String(v || "").trim())
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

/**
 * @param {Record<string, unknown>} ev
 */
function isSupportedPgaTourEvent(ev) {
  return getExcludedGolfTourReason(ev) == null && Boolean(golfEventBlob(ev));
}

/**
 * @param {Record<string, unknown>} ev
 * @returns {string | null}
 */
function getExcludedGolfTourReason(ev) {
  const blob = golfEventBlob(ev);
  if (!blob) return "missing_event_blob";
  const excluded = GOLF_EXCLUDED_TOUR_PATTERNS.find((row) => row.pattern.test(blob));
  return excluded ? excluded.reason : null;
}

/**
 * @param {Record<string, unknown>} ev
 */
function isMajorGolfEvent(ev) {
  if (isPgaChampionshipEvent(ev)) return true;
  const blob = golfEventBlob(ev);
  return GOLF_MAJOR_PATTERNS.some((rx) => rx.test(blob));
}

/**
 * @param {number} [nowMs]
 * @returns {Promise<ScrapeTarget[]>}
 */
function nbaSlatePairKey(game) {
  const aa = String(game?.awayTeam?.abbr || "").toUpperCase();
  const ha = String(game?.homeTeam?.abbr || "").toUpperCase();
  return aa && ha ? `${aa}|${ha}` : "";
}

function mergeNbaSlateGamesByPair(primary, extra) {
  const seen = new Set((primary || []).map(nbaSlatePairKey).filter(Boolean));
  const out = [...(primary || [])];
  for (const g of extra || []) {
    const k = nbaSlatePairKey(g);
    if (!k || seen.has(k)) continue;
    seen.add(k);
    out.push(g);
  }
  return out;
}

export async function collectNbaScrapeTargets(nowMs = Date.now()) {
  /** @type {ScrapeTarget[]} */
  const out = [];
  const todayET = getEtDateString(new Date(nowMs));
  const tomorrowET = getTomorrowEtDateString(todayET);
  const [boardGames, kvPlayoffGames] = await Promise.all([
    fetchNbaSlateGamesForOddsRefresh(),
    getNbaPlayoffSlateGamesForEtDates(todayET, tomorrowET),
  ]);
  const games = mergeNbaSlateGamesByPair(boardGames, kvPlayoffGames);
  const propsAnIdsSeen = new Set();

  for (const game of games) {
    const gameStartMs = canonicalNbaStartUtcMs(game);
    if (!isUpcomingPreGame(game, gameStartMs, nowMs)) continue;

    const homeAbbr = canonicalizeTeamAbbr(game?.homeTeam?.abbr);
    const awayAbbr = canonicalizeTeamAbbr(game?.awayTeam?.abbr);
    if (!homeAbbr || !awayAbbr) continue;

    const gameKey = buildGameSpreadKey(awayAbbr, homeAbbr);
    out.push({
      sport: "nba_spreads",
      gameId: gameKey.replace(/\s+/g, "_"),
      gameStartMs,
      meta: { game, gameKey },
    });

    const anId = resolveActionNetworkGameIdForBoardGame(game);
    if (anId != null && !propsAnIdsSeen.has(anId)) {
      propsAnIdsSeen.add(anId);
      out.push({
        sport: "nba_props",
        gameId: String(anId),
        gameStartMs,
        meta: {
          gameId: anId,
          homeAbbr,
          awayAbbr,
          dateYmd: gameStartMs
            ? new Date(gameStartMs).toLocaleDateString("en-CA", { timeZone: "America/New_York" }).replace(/-/g, "")
            : null,
        },
      });
    }
  }

  for (const game of kvPlayoffGames) {
    const anId = resolveActionNetworkGameIdForBoardGame(game);
    if (anId == null || propsAnIdsSeen.has(anId)) continue;
    propsAnIdsSeen.add(anId);
    const gameStartMs = canonicalNbaStartUtcMs(game);
    const homeAbbr = canonicalizeTeamAbbr(game?.homeTeam?.abbr);
    const awayAbbr = canonicalizeTeamAbbr(game?.awayTeam?.abbr);
    out.push({
      sport: "nba_props",
      gameId: String(anId),
      gameStartMs: Number.isFinite(gameStartMs) ? gameStartMs : nowMs + 3 * 60 * 60 * 1000,
      meta: {
        gameId: anId,
        homeAbbr,
        awayAbbr,
        dateYmd: gameStartMs
          ? new Date(gameStartMs).toLocaleDateString("en-CA", { timeZone: "America/New_York" }).replace(/-/g, "")
          : todayET.replace(/-/g, ""),
        source: "kv_playoff_slate",
      },
    });
  }

  return out;
}

/**
 * @param {number} [nowMs]
 * @returns {Promise<ScrapeTarget[]>}
 */
export async function collectMlbScrapeTargets(nowMs = Date.now()) {
  /** @type {ScrapeTarget[]} */
  const out = [];
  const games = await fetchMlbSlateGamesForScrapeSchedule();

  for (const game of games) {
    const gameStartMs = canonicalMlbStartUtcMs(game);
    if (!isUpcomingPreGame(game, gameStartMs, nowMs)) continue;

    const home = String(game?.homeTeam?.abbr || game?.homeTeam?.name || "").trim();
    const away = String(game?.awayTeam?.abbr || game?.awayTeam?.name || "").trim();
    const day = Number.isFinite(gameStartMs)
      ? new Date(gameStartMs).toISOString().slice(0, 10)
      : "unknown";
    const gameId = `${away}_at_${home}_${day}`.replace(/[^A-Za-z0-9_]+/g, "_");

    out.push({
      sport: "mlb_props",
      gameId,
      gameStartMs,
      meta: { game },
    });
  }

  return out;
}

/**
 * @param {number} [nowMs]
 * @returns {Promise<ScrapeTarget[]>}
 */
export async function collectTennisScrapeTargets(nowMs = Date.now()) {
  /** @type {ScrapeTarget[]} */
  const out = [];

  const start = new Date(nowMs);
  start.setDate(start.getDate() - 1);
  const end = new Date(nowMs);
  end.setDate(end.getDate() + 14);

  const bdl = await fetchBdlAtpFixturesForBoard({
    windowStart: start,
    windowEnd: end,
  });
  if (!bdl.ok || !Array.isArray(bdl.fixtures)) return out;

  for (const match of bdl.fixtures) {
    const commence =
      match.commence_iso ||
      match.commence_time ||
      (match.event_date && match.event_time ? `${match.event_date}T${match.event_time}` : match.event_date);
    const gameStartMs = parseEventStartMs(commence);
    if (!Number.isFinite(gameStartMs) || nowMs >= gameStartMs) continue;

    const status = String(match.event_status || "").toLowerCase();
    if (status.includes("finished") || status.includes("retired")) continue;

    const home = String(match.event_first_player || "").trim();
    const away = String(match.event_second_player || "").trim();
    const id =
      match.bdl_match_id ||
      match.odds_event_id ||
      match.event_key ||
      `${home}-${away}-${match.event_date || "d"}`;

    out.push({
      sport: "tennis_odds",
      gameId: String(id).replace(/[^A-Za-z0-9_-]+/g, "_").slice(0, 80),
      gameStartMs,
      meta: { match },
    });
  }

  return out;
}

/**
 * @param {number} [nowMs]
 * @returns {Promise<ScrapeTarget[]>}
 */
export async function collectGolfScrapeTargets(nowMs = Date.now()) {
  /** @type {ScrapeTarget[]} */
  const out = [];

  let board;
  try {
    board = await getUnifiedGolfBoard();
  } catch {
    return out;
  }

  const ev = board?.currentEvent || board?.tournament;
  if (!ev || typeof ev !== "object") return out;
  const excludedReason = getExcludedGolfTourReason(ev);
  const isPgaTour = excludedReason == null;
  if (!isPgaTour) {
    // Temporary production diagnostic (remove after 7 days of stable golf scraping).
    console.log(
      JSON.stringify({
        event: "golf_target_eval",
        eventName: ev?.name || null,
        eventShortName: ev?.shortName || null,
        isMajor: false,
        isPgaTour: false,
        excluded: excludedReason,
        targetGenerated: false,
      }),
    );
    return out;
  }
  const majorEvent = isMajorGolfEvent(ev);

  const todayEt = getEtYmdAt(nowMs);
  const days = [todayEt];
  const tomorrow = new Date(nowMs + 24 * 60 * 60 * 1000);
  const tomorrowEt = getEtYmdAt(tomorrow.getTime());
  if (tomorrowEt !== todayEt) days.push(tomorrowEt);

  const slug =
    String(ev.shortName || ev.name || "pga")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .slice(0, 40) || "pga";

  for (const etYmd of days) {
    if (!isGolfTournamentEtDay(ev, etYmd)) continue;
    const gameStartMs = getGolfRoundStartMsEt(etYmd, GOLF_ROUND_START_HOUR_ET);
    if (!Number.isFinite(gameStartMs) || nowMs >= gameStartMs) continue;

    out.push({
      sport: "golf_odds",
      gameId: `${slug}_${etYmd}`,
      gameStartMs,
      meta: {
        etYmd,
        eventName: ev.name || ev.shortName,
        eventTier: majorEvent ? "major" : "pga_tour",
      },
    });
  }

  // Temporary production diagnostic (remove after 7 days of stable golf scraping).
  console.log(
    JSON.stringify({
      event: "golf_target_eval",
      eventName: ev?.name || null,
      eventShortName: ev?.shortName || null,
      isMajor: majorEvent,
      isPgaTour,
      excluded: null,
      targetGenerated: out.length > 0,
    }),
  );

  return out;
}

/**
 * @param {number} [nowMs]
 * @returns {Promise<ScrapeTarget[]>}
 */
export async function collectF1ScrapeTargets(nowMs = Date.now()) {
  /** @type {ScrapeTarget[]} */
  const out = [];

  try {
    const res = await fetch(SMARKETS_EVENTS_URL, {
      headers: { Accept: "application/json", "User-Agent": "UnderReview/1.0" },
      signal: AbortSignal.timeout(20000),
    });
    if (!res.ok) return out;
    const body = await res.json();
    const events = Array.isArray(body?.events) ? body.events : [];
    const ev = pickUpcomingF1RaceEvent(events);
    if (!ev || !isF1MainRaceSmarketsEvent(ev)) return out;

    const gameStartMs = Date.parse(String(ev.start_datetime || ""));
    if (!Number.isFinite(gameStartMs) || nowMs >= gameStartMs) return out;

    out.push({
      sport: "f1_odds",
      gameId: String(ev.id),
      gameStartMs,
      meta: { eventId: ev.id, raceName: ev.name },
    });
  } catch (err) {
    console.warn("[scrape-schedule] collectF1ScrapeTargets:", err?.message || err);
  }

  return out;
}

/**
 * NFL: no prop scrape pipeline yet — schedule hook reserved.
 * @returns {Promise<ScrapeTarget[]>}
 */
export async function collectNflScrapeTargets() {
  return [];
}

/**
 * @param {number} [nowMs]
 * @returns {Promise<ScrapeTarget[]>}
 */
export async function collectAllScrapeTargets(nowMs = Date.now()) {
  const [nba, mlb, golf, tennis, f1, nfl] = await Promise.all([
    collectNbaScrapeTargets(nowMs),
    collectMlbScrapeTargets(nowMs),
    collectGolfScrapeTargets(nowMs),
    collectTennisScrapeTargets(nowMs),
    collectF1ScrapeTargets(nowMs),
    collectNflScrapeTargets(nowMs),
  ]);

  return [...nba, ...mlb, ...golf, ...tennis, ...f1, ...nfl];
}
