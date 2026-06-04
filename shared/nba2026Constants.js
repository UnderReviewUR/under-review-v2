/** NBA Finals 2026 — outrights KV + scrape cadence. */

export const NBA_FINALS_SERIES_KV_KEY = "nba_2026_finals_series";
export const NBA_FINALS_MVP_KV_KEY = "nba_2026_finals_mvp";

/** 6h KV TTL (matches WC outrights). */
export const NBA_OUTRIGHTS_TTL_SECONDS = 6 * 3600;

/** 4h scrape interval (between 3–6h target). */
export const NBA_OUTRIGHTS_SCRAPE_INTERVAL_MS = 4 * 60 * 60 * 1000;

/** UR Take + API freshness gate. */
export const NBA_OUTRIGHTS_MAX_AGE_MS = 6 * 60 * 60 * 1000;

export const ESPN_NBA_FUTURES_URL =
  "https://sports.core.api.espn.com/v2/sports/basketball/leagues/nba/seasons/2026/futures";
