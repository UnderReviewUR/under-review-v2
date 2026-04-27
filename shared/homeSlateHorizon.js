/**
 * Home + Live Snapshot time windows (single source of truth).
 * Home cards use a rolling 24h horizon from `now` by event start — not calendar "today".
 */

/** Include NBA/MLB on Home when tip/first pitch is within this window from now. */
export const HOME_SLATE_HORIZON_MS = 24 * 60 * 60 * 1000;

/**
 * Live Snapshot: when nothing is in progress, upcoming tiles use this pregame lookahead.
 * (Live/halftime games always qualify regardless of start time.)
 */
export const LIVE_SNAPSHOT_UPCOMING_WINDOW_MS = 12 * 60 * 60 * 1000;
