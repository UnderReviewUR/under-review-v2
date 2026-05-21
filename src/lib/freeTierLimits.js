/**
 * Free-tier question allowance for the client (`App.jsx` `canAsk`, localStorage `ur_free_used`).
 * Must stay in sync with `FREE_QUERIES_LIFETIME` in `api/gate.js`.
 *
 * Conversion note: lifetime cap of 2 is aggressive — users may hit the wall before they
 * feel THE PLAY + session memory. Consider A/B: weekly reset (e.g. 2/week) or 3/day vs lifetime.
 */
export const FREE_QUESTION_LIMIT = 2;

/**
 * True when ≥80% of the free allowance is used but at least one question remains
 * (warn before the user hits the hard cap). Integer-safe for small limits (e.g. 2 → warn after 1 used).
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
