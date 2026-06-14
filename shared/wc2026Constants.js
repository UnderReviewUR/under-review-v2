/** FIFA World Cup 2026 — shared KV keys and tournament window (America/New_York). */

export const WC_GROUPS_KV_KEY = "wc2026_groups";
export const WC_MATCHES_KV_KEY = "wc2026_matches";
export const WC_OUTRIGHTS_KV_KEY = "wc2026_outrights";

/** BallDontLie GOAT trial seed — futures + optional matches/players (persists post-trial). */
export const WC_BDL_GOAT_SEED_KV_KEY = "wc2026_bdl_goat_seed";

/** 120d — seed outlives 48h GOAT trial; refresh manually if trial extended. */
export const WC_BDL_GOAT_SEED_TTL_SECONDS = 120 * 24 * 3600;

export const WC_MATCH_DETAIL_KV_PREFIX = "wc_match_detail:";
export const WC_MATCH_DETAIL_PRE_TTL_SECONDS = 900;
export const WC_MATCH_DETAIL_LIVE_TTL_SECONDS = 300;
export const WC_MATCH_DETAIL_FT_TTL_SECONDS = 30 * 24 * 3600;
export const WC_MATCH_DETAIL_LIVE_INTERVAL_MS = 90 * 1000;

/** Pre-kickoff: poll all ramp targets within this window of commenceTs. */
export const WC_RAMP_HORIZON_MS = 24 * 60 * 60 * 1000;

/** T-90 → kickoff: ramp poll interval (see getWcRampScrapeDelayMs). */
export const WC_RAMP_TIGHT_INTERVAL_MS = 5 * 60 * 1000;

/** Inclusive ET calendar bounds for cron + self-healing refresh. */
export const WC_TOURNAMENT_START_ET = "2026-06-10";
export const WC_TOURNAMENT_END_ET = "2026-07-20";

/** First kickoff calendar day (ET) — used for home/slate promo lead-in. */
export const WC_KICKOFF_ET = "2026-06-11";

/** Show WC on home + slate from this ET date through tournament end (10 days pre-kickoff). */
export const WC_HOME_PROMO_START_ET = "2026-06-01";

/** First/last scoreboard dates to fetch (YYYYMMDD, UTC calendar). */
export const WC_SCOREBOARD_START_YMD = "20260611";
export const WC_SCOREBOARD_END_YMD = "20260719";

export const WC_GROUPS_TTL_SECONDS = 900; // 15 min KV TTL
export const WC_MATCHES_TTL_SECONDS = 3600; // 1 h KV TTL
/** Min gap between ESPN scoreboard polls while any match is live (user GET + cron). */
export const WC_LIVE_SCORE_CHECK_INTERVAL_MS = 25 * 1000;
export const WC_OUTRIGHTS_TTL_SECONDS = 6 * 3600; // 6 h KV TTL

/** Cron fixed intervals (standings vs futures). */
export const WC_STANDINGS_SCRAPE_INTERVAL_MS = 12 * 60 * 1000;
export const WC_OUTRIGHTS_SCRAPE_INTERVAL_MS = 3 * 60 * 60 * 1000;

/** Monte Carlo tournament sim KV (win % / advance %). */
export const WC_TOURNAMENT_SIM_KV_KEY = "wc2026_tournament_sim";

/** 4h cron + freshness gate for cached sim results. */
export const WC_TOURNAMENT_SIM_SCRAPE_INTERVAL_MS = 4 * 60 * 60 * 1000;

export const WC_TOURNAMENT_SIM_TTL_SECONDS = 4 * 60 * 60;

/**
 * @param {string | number} eventId
 */
export function wcMatchDetailKvKey(eventId) {
  return `${WC_MATCH_DETAIL_KV_PREFIX}${String(eventId)}`;
}

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

/**
 * Home slate + START HERE promo: in-tournament cron window or within 10 days of kickoff through Jul 19.
 * @param {number} [nowMs]
 */
export function isWcHomePromoWindow(nowMs = Date.now()) {
  const ymd = getEtYmdAt(nowMs);
  if (ymd < WC_HOME_PROMO_START_ET || ymd > WC_TOURNAMENT_END_ET) return false;
  return isWcTournamentWindow(nowMs) || ymd < WC_KICKOFF_ET;
}

/** Jun 11–Jul 19 ET — Today's Slate must include a World Cup row when board data exists. */
export const WC_SLATE_FEATURING_END_ET = "2026-07-19";

/**
 * @param {number} [nowMs]
 */
export function isWcSlateFeaturingWindow(nowMs = Date.now()) {
  const ymd = getEtYmdAt(nowMs);
  return ymd >= WC_KICKOFF_ET && ymd <= WC_SLATE_FEATURING_END_ET;
}

