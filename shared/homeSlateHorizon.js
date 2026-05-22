/**
 * Home + Live Snapshot time windows (single source of truth).
 * Home NBA/MLB upcoming games use a rolling 48h lookahead (ET-oriented slate),
 * not tonight-only / end-of-calendar-day.
 */

/** Rolling pregame window for Home NBA/MLB classification. */
export const HOME_SLATE_HORIZON_MS = 48 * 60 * 60 * 1000;

/**
 * @param {number} [_nowMs]
 * @returns {number}
 */
export function getHomeSlateHorizonMs(_nowMs = Date.now()) {
  return HOME_SLATE_HORIZON_MS;
}

/**
 * Live Snapshot: when nothing is in progress, upcoming tiles use this pregame lookahead.
 * (Live/halftime games always qualify regardless of start time.)
 */
export const LIVE_SNAPSHOT_UPCOMING_WINDOW_MS = 12 * 60 * 60 * 1000;
