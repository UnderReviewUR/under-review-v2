/** FIFA World Cup 2026 — shared KV keys and tournament window (America/New_York). */

export const WC_GROUPS_KV_KEY = "wc2026_groups";
export const WC_MATCHES_KV_KEY = "wc2026_matches";
export const WC_OUTRIGHTS_KV_KEY = "wc2026_outrights";

/** Inclusive ET calendar bounds for cron + self-healing refresh. */
export const WC_TOURNAMENT_START_ET = "2026-06-10";
export const WC_TOURNAMENT_END_ET = "2026-07-20";

/** First/last scoreboard dates to fetch (YYYYMMDD, UTC calendar). */
export const WC_SCOREBOARD_START_YMD = "20260611";
export const WC_SCOREBOARD_END_YMD = "20260719";

export const WC_GROUPS_TTL_SECONDS = 900; // 15 min KV TTL
export const WC_MATCHES_TTL_SECONDS = 3600; // 1 h KV TTL
export const WC_OUTRIGHTS_TTL_SECONDS = 6 * 3600; // 6 h KV TTL

/** Cron fixed intervals (standings vs futures). */
export const WC_STANDINGS_SCRAPE_INTERVAL_MS = 12 * 60 * 1000;
export const WC_OUTRIGHTS_SCRAPE_INTERVAL_MS = 3 * 60 * 60 * 1000;

/**
 * @param {number} [nowMs]
 * @returns {string} YYYY-MM-DD in America/New_York
 */
export function getEtYmdAt(nowMs = Date.now()) {
  return new Date(nowMs).toLocaleDateString("en-CA", { timeZone: "America/New_York" });
}

/**
 * @param {number} [nowMs]
 */
export function isWcTournamentWindow(nowMs = Date.now()) {
  const ymd = getEtYmdAt(nowMs);
  return ymd >= WC_TOURNAMENT_START_ET && ymd <= WC_TOURNAMENT_END_ET;
}
