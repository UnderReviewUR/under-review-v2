/**
 * Free-tier question allowance for the client (`App.jsx` `canAsk`, localStorage daily keys).
 * Resets at midnight in the user's local timezone.
 * Server email gate: `FREE_QUERIES_PER_DAY` in `api/gate.js` (UTC calendar day).
 */

export const FREE_QUESTION_LIMIT = 3;

const FREE_USED_KEY_PREFIX = "ur_free_used_";

/**
 * @param {Date} [date]
 * @returns {string} YYYY-MM-DD in local timezone
 */
export function getLocalDateKey(date = new Date()) {
  const d = date instanceof Date ? date : new Date(date);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/**
 * @param {Date} [date]
 * @returns {string}
 */
export function getFreeUsedStorageKey(date = new Date()) {
  return `${FREE_USED_KEY_PREFIX}${getLocalDateKey(date)}`;
}

/**
 * @returns {number}
 */
export function readFreeTierUsedToday() {
  try {
    if (typeof localStorage === "undefined") return 0;
    const raw = localStorage.getItem(getFreeUsedStorageKey());
    const n = parseInt(String(raw ?? "0"), 10);
    return Number.isFinite(n) && n > 0 ? n : 0;
  } catch {
    return 0;
  }
}

/**
 * @returns {number}
 */
export function incrementFreeTierUsedToday() {
  const used = readFreeTierUsedToday();
  const next = used + 1;
  try {
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(getFreeUsedStorageKey(), String(next));
    }
  } catch {
    /* ignore */
  }
  return next;
}

/**
 * @param {number} [used]
 * @param {number} [limit]
 * @returns {boolean}
 */
export function isFreeTierQuotaAvailable(
  used = readFreeTierUsedToday(),
  limit = FREE_QUESTION_LIMIT,
) {
  const lim = Math.max(0, Number(limit) || 0);
  const u = Math.min(Math.max(0, Number(used) || 0), lim);
  return u < lim;
}

/**
 * True when ≥80% of the free allowance is used but at least one question remains today.
 */
export function freeTierApproachingLimit(used, limit) {
  const lim = Math.max(0, Number(limit) || 0);
  if (lim <= 0) return false;
  const u = Math.min(Math.max(0, Number(used) || 0), lim);
  const remaining = lim - u;
  if (remaining <= 0) return false;
  const maxRemainingInWarnBand = Math.ceil(lim * 0.2);
  return remaining <= maxRemainingInWarnBand;
}
