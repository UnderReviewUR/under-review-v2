/**
 * Global home priority (highest score wins ordering + dedup tie-break).
 * 1 NBA Playoffs → 2 NBA → 3 MLB live emphasis → 4 NFL major → 5 Tennis → 6 F1 → 7 Golf
 */

export const PRIORITY_BASE = Object.freeze({
  NBA_PLAYOFF: 1_000_000,
  NBA: 900_000,
  MLB_LIVE: 800_000,
  MLB: 750_000,
  NFL_MAJOR: 600_000,
  TENNIS: 500_000,
  F1: 400_000,
  GOLF: 300_000,
});

/** Live games bump within tier */
const LIVE_BUMP = 50_000;
/** Earlier start times slightly preferred within same tier (negative offset applied to start_ms) */
export function tieBreakStart(startMs) {
  if (!Number.isFinite(startMs)) return 0;
  return -startMs / 1e12;
}

export function nbaPriorityScore({ isPlayoff, isLive, startMs }) {
  const base = isPlayoff ? PRIORITY_BASE.NBA_PLAYOFF : PRIORITY_BASE.NBA;
  return base + (isLive ? LIVE_BUMP : 0) + tieBreakStart(startMs);
}

export function mlbPriorityScore({ isLive, startMs }) {
  const base = isLive ? PRIORITY_BASE.MLB_LIVE : PRIORITY_BASE.MLB;
  return base + tieBreakStart(startMs);
}

export function tennisPriorityScore({ isLive, startMs }) {
  return PRIORITY_BASE.TENNIS + (isLive ? LIVE_BUMP : 0) + tieBreakStart(startMs);
}

export function f1PriorityScore(startMs) {
  return PRIORITY_BASE.F1 + tieBreakStart(startMs);
}

export function golfPriorityScore() {
  return PRIORITY_BASE.GOLF;
}

export function nflBoardPriorityScore() {
  return PRIORITY_BASE.NFL_MAJOR;
}
