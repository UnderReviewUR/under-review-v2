import {
  classifyGolfEvent,
  EVENT_VALIDITY,
  isDisplayableValidity,
} from "../../shared/eventValidity.js";

/** Align with api/_golfProviders merge + ESPN `state` (e.g. post = complete). */
export function isGolfEventFinished(golfData) {
  const validity = classifyGolfEvent(golfData?.currentEvent || null);
  return validity === EVENT_VALIDITY.FINISHED;
}

/**
 * Home-surface golf validity classification.
 * - upcoming: valid event before start
 * - active: valid in-window event currently in progress
 * - invalid: stale/finished/missing identity
 */
export function getGolfHomeValidity(golfData, nowMs = Date.now()) {
  const event = golfData?.currentEvent || null;
  const validity = classifyGolfEvent(event, nowMs);
  const hasLeaderboard = Array.isArray(event?.leaderboard) && event.leaderboard.length > 0;
  return {
    state: validity,
    valid: isDisplayableValidity(validity),
    isUpcoming: validity === EVENT_VALIDITY.UPCOMING,
    isActive: validity === EVENT_VALIDITY.ACTIVE,
    hasLeaderboard,
  };
}
