/**
 * Shared helpers for self-healing KV read paths (cache miss/stale → live fetch → write → return).
 */

/**
 * @param {number | null | undefined} refreshedAtMs
 * @param {number} maxAgeMs
 * @param {number} [nowMs]
 */
export function isKvFresh(refreshedAtMs, maxAgeMs, nowMs = Date.now()) {
  const at = Number(refreshedAtMs);
  if (!Number.isFinite(at) || at <= 0) return false;
  return nowMs - at < maxAgeMs;
}
