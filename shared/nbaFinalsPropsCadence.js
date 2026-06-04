/**
 * NBA Finals — in-game prop scrape cadence (tip through first half).
 */

import { msUntilGameStart } from "./scrapeCadencePolicy.js";
import { nbaGameIsLiveOrHalftimeForRefresh } from "./nbaLiveBoardRefresh.js";
import { isNba2026FinalsMatchupGame, isNbaFinalsGame } from "./nbaFinalsUtils.js";

export { isNba2026FinalsMatchupGame, isNbaFinalsGame };

const MS_MIN = 60 * 1000;
const MS_HOUR = 60 * MS_MIN;

/** Scheduler interval for live Finals prop scrapes. */
export const NBA_FINALS_LIVE_PROPS_INTERVAL_MS = 10 * MS_MIN;

/** Keep refreshing props from tip through ~first half (wall-clock buffer). */
export const NBA_FINALS_FIRST_HALF_WINDOW_MS = 2.5 * MS_HOUR;

/**
 * Pregame ramp for Finals — does not stop at T < 5m; continues every 10m through first half after tip.
 * @param {number} gameStartMs
 * @param {number} [nowMs]
 * @returns {number | null}
 */
export function getNbaFinalsPregamePropsScrapeDelayMs(gameStartMs, nowMs = Date.now()) {
  const T = msUntilGameStart(gameStartMs, nowMs);
  if (!Number.isFinite(T)) return null;

  if (T < 0 && T > -NBA_FINALS_FIRST_HALF_WINDOW_MS) {
    return NBA_FINALS_LIVE_PROPS_INTERVAL_MS;
  }

  if (T >= 0 && T < 5 * MS_MIN) {
    return 5 * MS_MIN;
  }

  if (T < 0) return null;

  if (T < 30 * MS_MIN) return 10 * MS_MIN;
  if (T < 60 * MS_MIN) return 15 * MS_MIN;
  if (T < 2 * MS_HOUR) return 30 * MS_MIN;
  if (T < 6 * MS_HOUR) return 60 * MS_MIN;
  return 3 * MS_HOUR;
}

/**
 * @param {Record<string, unknown> | null | undefined} game
 * @param {number} gameStartMs
 * @param {number} [nowMs]
 */
export function shouldScrapeNbaFinalsLiveProps(game, gameStartMs, nowMs = Date.now()) {
  if (!nbaGameIsLiveOrHalftimeForRefresh(game)) return false;
  const period = Number(game?.period);
  if (Number.isFinite(period) && period > 2) return false;

  const T = msUntilGameStart(gameStartMs, nowMs);
  if (!Number.isFinite(T)) return true;
  if (T < 0 && T > -NBA_FINALS_FIRST_HALF_WINDOW_MS) return true;
  return false;
}
