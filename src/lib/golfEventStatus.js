import { classifyGolfEvent, EVENT_VALIDITY } from "../../shared/eventValidity.js";
import {
  GOLF_CARD_UPCOMING_WINDOW_MS,
  golfEventStartMs,
  isGolfBoardFinished,
  pickGolfUpcomingFromBoard,
  resolveGolfPrimaryEvent,
} from "../../shared/golfHomeEventSelection.js";

export { golfEventStartMs, parseGolfDisplayDateStartMs } from "../../shared/golfHomeEventSelection.js";

function pickGolfUpcomingEvent(golfData, nowMs) {
  return pickGolfUpcomingFromBoard(golfData, nowMs, GOLF_CARD_UPCOMING_WINDOW_MS);
}

/** Finished only when no upcoming tournament can replace a stale currentEvent. */
export function isGolfEventFinished(golfData) {
  return isGolfBoardFinished(golfData);
}

/**
 * Home-surface golf validity classification.
 * - upcoming: valid event before start
 * - active: valid in-window event currently in progress
 * - invalid: stale/finished/missing identity
 */
export function getGolfHomeValidity(golfData, nowMs = Date.now()) {
  const primary = resolveGolfPrimaryEvent(golfData, nowMs);
  const validity = classifyGolfEvent(primary, nowMs);
  const upcomingEvent = pickGolfUpcomingEvent(golfData, nowMs);
  const lbSource = golfData?.currentEvent || primary;
  const hasLeaderboard = Array.isArray(lbSource?.leaderboard) && lbSource.leaderboard.length > 0;
  const isActive = validity === EVENT_VALIDITY.ACTIVE;
  const isUpcoming = !isActive && Boolean(upcomingEvent);
  return {
    state: isActive ? EVENT_VALIDITY.ACTIVE : isUpcoming ? EVENT_VALIDITY.UPCOMING : validity,
    valid: isActive || isUpcoming,
    isUpcoming,
    isActive,
    hasLeaderboard,
    upcomingEvent,
  };
}
