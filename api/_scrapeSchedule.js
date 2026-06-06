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
import {
  isWcHomePromoWindow,
  WC_OUTRIGHTS_SCRAPE_INTERVAL_MS,
  WC_STANDINGS_SCRAPE_INTERVAL_MS,
  WC_TOURNAMENT_SIM_SCRAPE_INTERVAL_MS,
} from "../shared/wc2026Constants.js";
import {
  WC_GOLDEN_BOOT_SCRAPE_INTERVAL_MS,
  WC_INJURIES_SCRAPE_INTERVAL_MS,
  WC_PLAYERS_SCRAPE_INTERVAL_MS,
} from "../shared/wc2026PlayerConstants.js";
import { isNbaFinalsWindowEt } from "../shared/nbaFinalsHomePrompt.js";
import {
  isNba2026FinalsMatchupGame,
  shouldScrapeNbaFinalsLiveProps,
} from "../shared/nbaFinalsPropsCadence.js";
import { nbaGameIsLiveOrHalftimeForRefresh } from "../shared/nbaLiveBoardRefresh.js";
import { NBA_OUTRIGHTS_SCRAPE_INTERVAL_MS } from "../shared/nba2026Constants.js";
import { loadFinalizedWcMatchDetailIds, readWcMatchesFromKv } from "./_wcData.js";
import {
  selectWcMatchDetailTargets,
} from "../shared/wcMatchDetailTargets.js";
import { WC_MATCH_DETAIL_LIVE_INTERVAL_MS } from "../shared/wc2026Constants.js";
import {
  WC_SCRAPE_PRIORITY,
  priorityForWcMatchBundleTarget,
} from "../shared/wcScrapePriority.js";

/**
 * @typedef {Object} ScrapeTarget
 * @property {string} sport — KV segment (nba_props, nba_spreads, golf_odds, mlb_props, tennis_odds, f1_odds, nfl_props)
 * @property {string} gameId
 * @property {number} gameStartMs
 * @property {number} [priority] — higher = runs first when scheduler cap applies
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

  if (isNbaFinalsWindowEt(new Date(nowMs), true)) {
    out.push({
      sport: "nba_finals_outrights",
      gameId: "finals_futures",
      gameStartMs: nowMs,
      priority: 4,
      meta: { kind: "outrights", fixedIntervalMs: NBA_OUTRIGHTS_SCRAPE_INTERVAL_MS },
    });

    const finalsLiveSeen = new Set();
    for (const game of games) {
      if (!isNba2026FinalsMatchupGame(game)) continue;
      const gameStartMs = canonicalNbaStartUtcMs(game);
      if (!shouldScrapeNbaFinalsLiveProps(game, gameStartMs, nowMs)) continue;
      if (!nbaGameIsLiveOrHalftimeForRefresh(game)) continue;

      const anId = resolveActionNetworkGameIdForBoardGame(game);
      if (anId == null || finalsLiveSeen.has(anId)) continue;
      finalsLiveSeen.add(anId);

      const homeAbbr = canonicalizeTeamAbbr(game?.homeTeam?.abbr);
      const awayAbbr = canonicalizeTeamAbbr(game?.awayTeam?.abbr);
      out.push({
        sport: "nba_finals_props",
        gameId: String(anId),
        gameStartMs: Number.isFinite(gameStartMs) ? gameStartMs : nowMs,
        priority: 6,
        meta: {
          gameId: anId,
          homeAbbr,
          awayAbbr,
          finalsProps: true,
          isLive: true,
          game,
          dateYmd: gameStartMs
            ? new Date(gameStartMs).toLocaleDateString("en-CA", { timeZone: "America/New_York" }).replace(/-/g, "")
            : todayET.replace(/-/g, ""),
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
 * @param {number} [nowMs]
 * @returns {Promise<ScrapeTarget[]>}
 */
export async function collectWcScrapeTargets(nowMs = Date.now()) {
  /** @type {ScrapeTarget[]} */
  const out = [];

  if (!isWcHomePromoWindow(nowMs)) return out;

  const noonEtMs = Date.UTC(2026, 5, 11, 16, 0, 0);

  out.push({
    sport: "wc_data",
    gameId: "standings_fixtures",
    gameStartMs: noonEtMs,
    priority: WC_SCRAPE_PRIORITY.STANDINGS,
    meta: { kind: "standings_fixtures", fixedIntervalMs: WC_STANDINGS_SCRAPE_INTERVAL_MS },
  });

  out.push({
    sport: "wc_outrights",
    gameId: "futures",
    gameStartMs: noonEtMs,
    priority: WC_SCRAPE_PRIORITY.OUTRIGHTS,
    meta: { kind: "outrights", fixedIntervalMs: WC_OUTRIGHTS_SCRAPE_INTERVAL_MS },
  });

  out.push({
    sport: "wc_players",
    gameId: "tournament_players",
    gameStartMs: noonEtMs,
    priority: WC_SCRAPE_PRIORITY.PLAYERS,
    meta: { kind: "players", fixedIntervalMs: WC_PLAYERS_SCRAPE_INTERVAL_MS },
  });
  out.push({
    sport: "wc_golden_boot",
    gameId: "golden_boot",
    gameStartMs: noonEtMs,
    priority: WC_SCRAPE_PRIORITY.GOLDEN_BOOT,
    meta: { kind: "golden_boot", fixedIntervalMs: WC_GOLDEN_BOOT_SCRAPE_INTERVAL_MS },
  });
  out.push({
    sport: "wc_injuries",
    gameId: "injuries",
    gameStartMs: noonEtMs,
    priority: WC_SCRAPE_PRIORITY.INJURIES,
    meta: { kind: "injuries", fixedIntervalMs: WC_INJURIES_SCRAPE_INTERVAL_MS },
  });
  out.push({
    sport: "wc_sim",
    gameId: "tournament_sim",
    gameStartMs: noonEtMs,
    priority: WC_SCRAPE_PRIORITY.TOURNAMENT_SIM,
    meta: { kind: "tournament_sim", fixedIntervalMs: WC_TOURNAMENT_SIM_SCRAPE_INTERVAL_MS },
  });

  const kv = await readWcMatchesFromKv(Number.MAX_SAFE_INTEGER);
  const matches = Array.isArray(kv?.matches) ? kv.matches : [];
  const hasRealFixtures = matches.some((m) => m?.id != null && !String(m.id).startsWith("wc-promo-"));
  if (hasRealFixtures) {
    const matchTargets = await buildWcMatchScrapeTargetsFromMatches(matches, nowMs);
    for (const row of matchTargets.bundle) out.push(row);
  }

  return out;
}

/**
 * Build wc_match_bundle scheduler rows from a matches array.
 * @param {Array<Record<string, unknown>>} matches
 * @param {number} nowMs
 */
export async function buildWcMatchScrapeTargetsFromMatches(matches, nowMs = Date.now()) {
  const finalizedIds = await loadFinalizedWcMatchDetailIds(matches);
  const detailTargets = selectWcMatchDetailTargets(matches, nowMs, { finalizedEventIds: finalizedIds });

  /** @type {import("./_scrapeSchedule.js").ScrapeTarget[]} */
  const bundle = [];
  for (const t of detailTargets) {
    const fixedIntervalMs =
      t.scrapeMode === "live"
        ? WC_MATCH_DETAIL_LIVE_INTERVAL_MS
        : t.scrapeMode === "finalize"
          ? 5 * 60 * 1000
          : undefined;

    bundle.push({
      sport: "wc_match_bundle",
      gameId: t.eventId,
      gameStartMs: t.commenceTs,
      priority: priorityForWcMatchBundleTarget(
        { gameStartMs: t.commenceTs, meta: { scrapeMode: t.scrapeMode } },
        nowMs,
      ),
      meta: {
        date: t.date,
        homeTeam: t.homeTeam,
        awayTeam: t.awayTeam,
        commenceTs: t.commenceTs,
        scrapeMode: t.scrapeMode,
        ...(fixedIntervalMs != null ? { fixedIntervalMs } : {}),
      },
    });
  }

  return { bundle };
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
  const [nba, mlb, golf, tennis, f1, nfl, wc] = await Promise.all([
    collectNbaScrapeTargets(nowMs),
    collectMlbScrapeTargets(nowMs),
    collectGolfScrapeTargets(nowMs),
    collectTennisScrapeTargets(nowMs),
    collectF1ScrapeTargets(nowMs),
    collectNflScrapeTargets(nowMs),
    collectWcScrapeTargets(nowMs),
  ]);

  return [...nba, ...mlb, ...golf, ...tennis, ...f1, ...nfl, ...wc];
}
