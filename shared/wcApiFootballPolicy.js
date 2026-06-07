/**
 * API-Football (API-Sports) free-tier policy for WC 2026 backup stats.
 */

import { getEnv } from "../api/_env.js";

export const WC_API_FOOTBALL_BASE_URL = "https://v3.football.api-sports.io";

/** FIFA World Cup league id on API-Football. */
export const WC_API_FOOTBALL_LEAGUE_ID = 1;

/** Tournament season slug (2026 host cycle). */
export const WC_API_FOOTBALL_SEASON = 2026;

/** Free plan daily cap (documented). */
export const WC_API_FOOTBALL_DAILY_LIMIT = 100;

/** Keep headroom for unexpected retries / map refresh. */
export const WC_API_FOOTBALL_DAILY_RESERVE = 25;

export const WC_API_FOOTBALL_LEADERS_INTERVAL_MS = 6 * 60 * 60 * 1000;

export const WC_API_FOOTBALL_FIXTURE_MAP_INTERVAL_MS = 24 * 60 * 60 * 1000;

export const WC_API_FOOTBALL_LIVE_STATS_INTERVAL_MS = 30 * 60 * 1000;

export const WC_API_FOOTBALL_SCRAPE_INTERVAL_MS = 30 * 60 * 1000;

/** Max live fixture player pulls per cron tick. */
export const WC_API_FOOTBALL_MAX_LIVE_FIXTURE_CALLS_PER_TICK = 4;

/**
 * @returns {string | undefined}
 */
export function getWcApiFootballKey() {
  return (
    getEnv("API_FOOTBALL_KEY", { treatEmptyAsMissing: false }) ||
    getEnv("API_SPORTS_KEY", { treatEmptyAsMissing: false })
  );
}

/**
 * @returns {boolean}
 */
export function isWcApiFootballEnabled() {
  const key = getWcApiFootballKey();
  if (!key || !String(key).trim()) return false;
  const flag = getEnv("WC_API_FOOTBALL", { treatEmptyAsMissing: false });
  if (flag === undefined) return true;
  const v = String(flag).trim().toLowerCase();
  return v === "1" || v === "true" || v === "yes";
}

/**
 * @param {number} usedToday
 */
export function wcApiFootballBudgetRemaining(usedToday) {
  const used = Number(usedToday) || 0;
  return Math.max(0, WC_API_FOOTBALL_DAILY_LIMIT - WC_API_FOOTBALL_DAILY_RESERVE - used);
}
