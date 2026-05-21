/**
 * Collect upcoming scrape targets from live board sources (no user-request scrapes).
 */

import { fetchNbaSlateGamesForOddsRefresh } from "./nba.js";
import { fetchMlbSlateGamesForScrapeSchedule } from "./mlb.js";
import { getUnifiedGolfBoard } from "./_golfProviders.js";
import { isPgaChampionshipEvent } from "./_golfPgaChampionshipOdds.js";
import { resolveActionNetworkGameIdForBoardGame } from "./_nbaPropsApi.js";
import { fetchBdlAtpFixturesForBoard } from "./_tennisAtpBdl.js";
import { buildGameSpreadKey, canonicalizeTeamAbbr } from "../shared/gameLineSpread.js";
import { canonicalMlbStartUtcMs, canonicalNbaStartUtcMs, parseEventStartMs } from "../shared/eventStartTime.js";
import {
  getEtYmdAt,
  isGolfTournamentEtDay,
} from "../shared/golfOddsCachePolicy.js";
import { getGolfRoundStartMsEt, GOLF_ROUND_START_HOUR_ET } from "../shared/scrapeCadencePolicy.js";

/**
 * @typedef {Object} ScrapeTarget
 * @property {string} sport — KV segment (nba_props, nba_spreads, golf_odds, mlb_props, tennis_odds, nfl_props)
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

/**
 * @param {number} [nowMs]
 * @returns {Promise<ScrapeTarget[]>}
 */
export async function collectNbaScrapeTargets(nowMs = Date.now()) {
  /** @type {ScrapeTarget[]} */
  const out = [];
  const games = await fetchNbaSlateGamesForOddsRefresh();

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
    if (anId != null) {
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
  if (!isPgaChampionshipEvent(ev)) return out;

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
      meta: { etYmd, eventName: ev.name || ev.shortName },
    });
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
  const [nba, mlb, golf, tennis, nfl] = await Promise.all([
    collectNbaScrapeTargets(nowMs),
    collectMlbScrapeTargets(nowMs),
    collectGolfScrapeTargets(nowMs),
    collectTennisScrapeTargets(nowMs),
    collectNflScrapeTargets(nowMs),
  ]);

  return [...nba, ...mlb, ...golf, ...tennis, ...nfl];
}
