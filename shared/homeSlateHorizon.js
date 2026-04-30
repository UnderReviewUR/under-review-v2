/**
 * Home + Live Snapshot time windows (single source of truth).
 * Home NBA/MLB slate uses milliseconds until end of current ET calendar day
 * (America/New_York), not a rolling 24h window — see getHomeSlateHorizonMs.
 */

/**
 * Milliseconds from now until the first instant of the next calendar day in
 * America/New_York, with a minimum of 1 hour so classification near midnight ET
 * does not drop games tipping very soon.
 * @param {number} [nowMs]
 * @returns {number}
 */
export function getHomeSlateHorizonMs(nowMs = Date.now()) {
  const tz = "America/New_York";
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  function etDayKey(ms) {
    const parts = fmt.formatToParts(new Date(ms));
    const y = parts.find((p) => p.type === "year")?.value;
    const m = parts.find((p) => p.type === "month")?.value;
    const d = parts.find((p) => p.type === "day")?.value;
    return `${y}-${m}-${d}`;
  }

  const todayKey = etDayKey(nowMs);
  let hi = nowMs + 25 * 60 * 60 * 1000;
  while (etDayKey(hi) === todayKey && hi < nowMs + 96 * 60 * 60 * 1000) {
    hi += 60 * 60 * 1000;
  }

  let left = nowMs;
  let right = hi;
  while (left < right) {
    const mid = Math.floor((left + right) / 2);
    if (etDayKey(mid) === todayKey) left = mid + 1;
    else right = mid;
  }

  const rawHorizon = left - nowMs;
  return Math.max(rawHorizon, 60 * 60 * 1000);
}

/**
 * Live Snapshot: when nothing is in progress, upcoming tiles use this pregame lookahead.
 * (Live/halftime games always qualify regardless of start time.)
 */
export const LIVE_SNAPSHOT_UPCOMING_WINDOW_MS = 12 * 60 * 60 * 1000;
