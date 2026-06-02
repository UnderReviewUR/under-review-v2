/**
 * Pre-game scrape ramp: interval until next poll based on time until start (T).
 * Returns null when scraping should stop (game live or imminently starting).
 */

const MS_MIN = 60 * 1000;
const MS_HOUR = 60 * MS_MIN;

/** @typedef {"nba_props"|"nba_spreads"|"golf_odds"|"mlb_props"|"tennis_odds"|"f1_odds"|"nfl_props"|"wc_data"|"wc_match_odds"|"wc_match_detail"|"wc_outrights"} ScrapeKind */

/**
 * Milliseconds until gameStartMs from now. Positive = not yet started.
 * @param {number} gameStartMs
 * @param {number} [nowMs]
 */
export function msUntilGameStart(gameStartMs, nowMs = Date.now()) {
  if (!Number.isFinite(gameStartMs)) return NaN;
  return gameStartMs - nowMs;
}

/**
 * Polling interval for the next scrape attempt, or null to stop.
 * T > 6h → 3h; 2–6h → 60m; 1–2h → 30m; 30–60m → 15m; 5–30m → 10m; T < 5m → stop; T < 0 → stop.
 * @param {number} gameStartMs
 * @param {number} [nowMs]
 * @returns {number | null}
 */
export function getNextScrapeDelayMs(gameStartMs, nowMs = Date.now()) {
  const T = msUntilGameStart(gameStartMs, nowMs);
  if (!Number.isFinite(T)) return null;
  if (T < 0) return null;
  if (T < 5 * MS_MIN) return null;

  if (T < 30 * MS_MIN) return 10 * MS_MIN;
  if (T < 60 * MS_MIN) return 15 * MS_MIN;
  if (T < 2 * MS_HOUR) return 30 * MS_MIN;
  if (T < 6 * MS_HOUR) return 60 * MS_MIN;
  return 3 * MS_HOUR;
}

/**
 * @param {number} gameStartMs
 * @param {number | null | undefined} lastRunMs
 * @param {number} [nowMs]
 */
export function shouldRunScrapeForGame(gameStartMs, lastRunMs, nowMs = Date.now()) {
  const intervalMs = getNextScrapeDelayMs(gameStartMs, nowMs);
  if (intervalMs == null) return false;
  if (!Number.isFinite(lastRunMs) || lastRunMs <= 0) return true;
  return nowMs - lastRunMs >= intervalMs;
}

/**
 * @param {string} sport
 * @param {string} gameId
 */
export function buildScrapeLastRunKvKey(sport, gameId) {
  const sk = String(sport || "unknown")
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, "_");
  const gid = String(gameId || "")
    .replace(/[^A-Za-z0-9@ _-]+/g, "")
    .trim()
    .replace(/\s+/g, "_")
    .slice(0, 120);
  return `scrape_last_run_${sk}_${gid}`;
}

/**
 * UTC ms for a local America/New_York wall time on a calendar day.
 * @param {string} etYmd YYYY-MM-DD
 * @param {number} [hour24]
 * @param {number} [minute]
 */
export function etLocalTimeToUtcMs(etYmd, hour24 = 8, minute = 0) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(etYmd || "").trim());
  if (!m) return NaN;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const da = Number(m[3]);
  let guess = Date.UTC(y, mo - 1, da, 17, 0, 0);

  for (let i = 0; i < 64; i++) {
    const d = new Date(guess);
    const etDate = d.toLocaleDateString("en-CA", { timeZone: "America/New_York" });
    const etHour = parseInt(
      d.toLocaleString("en-US", {
        timeZone: "America/New_York",
        hour: "numeric",
        hour12: false,
      }),
      10,
    );
    const etMin = parseInt(
      d.toLocaleString("en-US", { timeZone: "America/New_York", minute: "numeric" }),
      10,
    );
    if (etDate === etYmd && etHour === hour24 && etMin === minute) return guess;
    const deltaMin = (hour24 - etHour) * 60 + (minute - etMin);
    guess += deltaMin * 60 * 1000;
  }
  return NaN;
}

/** PGA round T=0 — default 8:00 ET per product spec. */
export const GOLF_ROUND_START_HOUR_ET = 8;

/**
 * @param {string} etYmd
 * @param {number} [hourEt]
 */
export function getGolfRoundStartMsEt(etYmd, hourEt = GOLF_ROUND_START_HOUR_ET) {
  return etLocalTimeToUtcMs(etYmd, hourEt, 0);
}
