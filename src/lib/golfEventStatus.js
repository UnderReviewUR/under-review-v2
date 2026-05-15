import {
  classifyGolfEvent,
  EVENT_VALIDITY,
} from "../../shared/eventValidity.js";

const GOLF_UPCOMING_WINDOW_MS = 72 * 60 * 60 * 1000;

function parseMs(value) {
  if (Number.isFinite(value)) return Number(value);
  const ms = Date.parse(String(value || ""));
  return Number.isNaN(ms) ? NaN : ms;
}

function isWithinUpcomingWindow(event, nowMs) {
  const startMs = parseMs(event?.startDate || event?.date || event?.displayDate);
  if (!Number.isFinite(startMs)) return false;
  const delta = startMs - nowMs;
  return delta >= 0 && delta <= GOLF_UPCOMING_WINDOW_MS;
}

function pickGolfUpcomingEvent(golfData, nowMs) {
  const candidates = [golfData?.tournament, golfData?.currentEvent]
    .filter(Boolean)
    .filter((e) => classifyGolfEvent(e, nowMs) === EVENT_VALIDITY.UPCOMING)
    .filter((e) => isWithinUpcomingWindow(e, nowMs));
  if (!candidates.length) return null;
  return candidates.sort((a, b) => parseMs(a?.startDate) - parseMs(b?.startDate))[0];
}

/** Align with api/_golfProviders merge + ESPN `state` (e.g. post = complete). */
export function isGolfEventFinished(golfData) {
  const validity = classifyGolfEvent(golfData?.currentEvent || golfData?.tournament || null);
  return validity === EVENT_VALIDITY.FINISHED;
}

/**
 * Home-surface golf validity classification.
 * - upcoming: valid event before start
 * - active: valid in-window event currently in progress
 * - invalid: stale/finished/missing identity
 */
export function getGolfHomeValidity(golfData, nowMs = Date.now()) {
  const primary = golfData?.currentEvent || golfData?.tournament || null;
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
