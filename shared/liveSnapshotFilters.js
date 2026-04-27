/**
 * Live Snapshot inclusion: NBA/MLB live games, or pregame starts within LIVE_SNAPSHOT_UPCOMING_WINDOW_MS,
 * tennis within LIVE_SNAPSHOT_PRE_WINDOW_MS — next major (F1/NFL handled in plan).
 */

import { canonicalMlbStartUtcMs, canonicalNbaStartUtcMs } from "./eventStartTime.js";
import { LIVE_SNAPSHOT_UPCOMING_WINDOW_MS } from "./homeSlateHorizon.js";

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
