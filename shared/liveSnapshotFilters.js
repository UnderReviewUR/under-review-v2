/**
 * Live Snapshot inclusion: NBA/MLB live games, or pregame starts within LIVE_SNAPSHOT_UPCOMING_WINDOW_MS,
 * tennis within LIVE_SNAPSHOT_PRE_WINDOW_MS — next major (F1/NFL handled in plan).
 */

import { canonicalMlbStartUtcMs, canonicalNbaStartUtcMs } from "./eventStartTime.js";
import { LIVE_SNAPSHOT_UPCOMING_WINDOW_MS } from "./homeSlateHorizon.js";
import { parseWcKickoffEtMs, resolveWcMatchEtDate, wcTodayEtYmd } from "./wcKickoffDisplay.js";
import { isWcPreKickoffPromoOnly } from "./wc2026PromoFixtures.js";
import { resolveWcXiStatus } from "./wcXiStatus.js";

/** Tennis lookahead (unchanged): short window for odds-backed commence times. */
export const LIVE_SNAPSHOT_PRE_WINDOW_MS = 2 * 60 * 60 * 1000;
export const NBA_TIP_FEED_LAG_GRACE_MS = 30 * 60 * 1000;
export const MAX_LIVE_SNAPSHOT_TILES = 5;

/** @param {"nba"|"mlb"} sport */
export function getNbaMlbStartMs(game, sport = "nba") {
  if (!game || typeof game !== "object") return NaN;
  return sport === "mlb" ? canonicalMlbStartUtcMs(game) : canonicalNbaStartUtcMs(game);
}

/** NBA: live/upcoming slate. MLB: live, or pre/scheduled within the snapshot window. */
export function isNbaMlbIncludedInLiveSnapshot(game, nowMs = Date.now(), sport = "nba") {
  if (!game || typeof game !== "object") return false;
  const state = String(game.state || "").toLowerCase();
  if (state === "in" || state === "live") return true;
  if (state === "pre" || state === "scheduled") {
    const startMs = getNbaMlbStartMs(game, sport);
    if (!Number.isFinite(startMs)) return false;
    const delta = startMs - nowMs;
    if (sport === "nba") {
      const awayScore = Number(game?.awayTeam?.score);
      const homeScore = Number(game?.homeTeam?.score);
      const lagWindow = delta < 0 && delta > -NBA_TIP_FEED_LAG_GRACE_MS;
      if (lagWindow && awayScore === 0 && homeScore === 0) return true;
      return delta >= 0 && delta <= LIVE_SNAPSHOT_UPCOMING_WINDOW_MS;
    }
    return delta >= 0 && delta <= LIVE_SNAPSHOT_UPCOMING_WINDOW_MS;
  }
  return false;
}

/** @param {"nba"|"mlb"} sport */
export function filterAndOrderNbaMlbGames(games, nowMs = Date.now(), sport = "nba") {
  const eligible = (games || []).filter((g) => isNbaMlbIncludedInLiveSnapshot(g, nowMs, sport));
  const live = eligible.filter((g) => {
    const s = String(g.state || "").toLowerCase();
    return s === "in" || s === "live";
  });
  const pre = eligible
    .filter((g) => {
      const s = String(g.state || "").toLowerCase();
      return s === "pre" || s === "scheduled";
    })
    .sort((a, b) => getNbaMlbStartMs(a, sport) - getNbaMlbStartMs(b, sport));
  return [...live, ...pre];
}

/**
 * Tennis: live matches, or upcoming with a real start time within 2h (drops placeholder / unknown commence).
 */
export function isTennisIncludedInLiveSnapshot(match, nowMs = Date.now()) {
  if (!match || typeof match !== "object") return false;
  if (String(match?.raw?.live || "0") === "1") return true;
  const ts = match.commenceTs;
  if (!Number.isFinite(ts)) return false;
  if (ts >= Number.MAX_SAFE_INTEGER / 2) return false;
  const delta = ts - nowMs;
  return delta >= 0 && delta <= LIVE_SNAPSHOT_PRE_WINDOW_MS;
}

export function filterTennisMatchesForSnapshot(matches, nowMs = Date.now()) {
  return (matches || []).filter((m) => isTennisIncludedInLiveSnapshot(m, nowMs));
}

export function isWcLiveStatus(status) {
  return ["live", "in_progress", "1h", "2h", "ht"].includes(String(status || "").toLowerCase());
}

function isWcScheduledStatus(status) {
  const s = String(status || "").toLowerCase();
  return s === "ns" || s === "scheduled" || s === "not started" || s === "upcoming";
}

export function getWcMatchStartMs(match) {
  if (!match || typeof match !== "object") return NaN;
  let ms = Number(match.commenceTs);
  if (Number.isFinite(ms) && ms > 0) return ms;
  const parsed = parseWcKickoffEtMs(match.date, match.time);
  return parsed ?? NaN;
}

/** WC: live matches, today's ET slate, pregame within snapshot window; pre-kickoff promo shows next openers. */
export function isWcIncludedInLiveSnapshot(match, nowMs = Date.now()) {
  if (!match || typeof match !== "object") return false;
  if (isWcLiveStatus(match.status)) return true;
  if (!isWcScheduledStatus(match.status)) return false;

  if (isWcPreKickoffPromoOnly(nowMs)) {
    const startMs = getWcMatchStartMs(match);
    return Number.isFinite(startMs) && startMs > nowMs;
  }

  const etToday = resolveWcMatchEtDate(match) === wcTodayEtYmd(nowMs);
  const startMs = getWcMatchStartMs(match);
  if (!Number.isFinite(startMs)) return etToday;
  const delta = startMs - nowMs;
  return etToday || (delta >= 0 && delta <= LIVE_SNAPSHOT_UPCOMING_WINDOW_MS);
}

function wcXiSnapshotSortRank(match) {
  const status = resolveWcXiStatus(match);
  if (status === "confirmed") return 0;
  if (status === "pending") return 1;
  return 2;
}

function sortWcSnapshotMatches(a, b) {
  const rank = wcXiSnapshotSortRank(a) - wcXiSnapshotSortRank(b);
  if (rank !== 0) return rank;
  return getWcMatchStartMs(a) - getWcMatchStartMs(b);
}

export function filterAndOrderWcMatchesForSnapshot(matches, nowMs = Date.now()) {
  const eligible = (matches || []).filter((m) => isWcIncludedInLiveSnapshot(m, nowMs));
  const live = eligible.filter((m) => isWcLiveStatus(m.status)).sort(sortWcSnapshotMatches);
  const pre = eligible.filter((m) => !isWcLiveStatus(m.status)).sort(sortWcSnapshotMatches);
  return [...live, ...pre];
}
