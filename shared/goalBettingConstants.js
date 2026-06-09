/** Goal.com US betting editorial — KV keys and scrape cadence. */

export const WC_GOAL_EDITORIAL_KV_KEY = "wc_goal_editorial";
export const NBA_GOAL_EDITORIAL_KV_KEY = "nba_goal_editorial";

/** 12h KV TTL — editorial consensus, not live book feed. */
export const GOAL_EDITORIAL_TTL_SECONDS = 12 * 3600;

/** Scrape twice daily during WC / Finals windows. */
export const GOAL_EDITORIAL_SCRAPE_INTERVAL_MS = 12 * 60 * 60 * 1000;

export const GOAL_EDITORIAL_MAX_AGE_MS = 24 * 60 * 60 * 1000;

export const GOAL_EDITORIAL_GOVERNANCE =
  "GOAL.COM EDITORIAL CONSENSUS (not a live book feed — corroboration and narrative only). " +
  "Do not claim mispriced from Goal alone; prefer BDL FUTURES / CURRENT OUTRIGHT ODDS / ESPN for binding prices.";
