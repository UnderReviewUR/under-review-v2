/**
 * Match-level multi-book h2h from The Odds API — quota + cache policy.
 * WC cards use ESPN only; tennis detail may call Odds API behind KV cache.
 */

import { getEnv } from "../api/_env.js";

export const MATCH_BOOK_ODDS_KV_PREFIX = "match_book_odds";

/** Shared sport list cache (one credit per refresh with regions=us). */
export const MATCH_BOOK_ODDS_LIST_TTL_SECONDS = 20 * 60;

/** Per-event odds cache. */
export const MATCH_BOOK_ODDS_EVENT_TTL_SECONDS = 20 * 60;

/** Do not call upstream when monthly pool is nearly exhausted. */
export const MATCH_BOOK_ODDS_MIN_REMAINING_CREDITS = 15;

/** Single region — halves cost vs us,us2 (markets × regions). */
export const MATCH_BOOK_ODDS_REGIONS = "us";

export const MATCH_BOOK_ODDS_MARKETS = "h2h";

/**
 * @returns {boolean}
 */
export function isMatchBookOddsEnabled() {
  const flag = getEnv("MATCH_BOOK_ODDS", { treatEmptyAsMissing: false });
  if (flag === "0" || /^false$/i.test(String(flag || ""))) return false;
  if (flag === "1" || /^true$/i.test(String(flag || ""))) return true;
  return Boolean(getEnv("ODDS_API_KEY"));
}

/**
 * @param {string} sportKey
 */
export function matchBookOddsListCacheKey(sportKey) {
  return `${MATCH_BOOK_ODDS_KV_PREFIX}:list:${String(sportKey || "").trim()}`;
}

/**
 * @param {string} sportKey
 * @param {string} eventId
 */
export function matchBookOddsEventCacheKey(sportKey, eventId) {
  return `${MATCH_BOOK_ODDS_KV_PREFIX}:event:${String(sportKey || "").trim()}:${String(eventId || "").trim()}`;
}

/**
 * @param {number | null | undefined} remaining
 */
export function matchBookOddsHasQuota(remaining) {
  if (remaining == null || remaining === "") return true;
  const n = Number(remaining);
  if (!Number.isFinite(n)) return true;
  return n >= MATCH_BOOK_ODDS_MIN_REMAINING_CREDITS;
}
