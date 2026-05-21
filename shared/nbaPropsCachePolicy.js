export const NBA_PROPS_STALE_MS = 30 * 60 * 1000;
export const NBA_PROPS_NEAR_TIP_TTL_MS = 10 * 60 * 1000;
export const NBA_PROPS_NEAR_TIP_WINDOW_MS = 2 * 60 * 60 * 1000;

/**
 * @param {number} [nowMs]
 * @param {number | null | undefined} tipoffMs
 */
export function nbaPropsCacheTtlMs(nowMs = Date.now(), tipoffMs = null) {
  if (tipoffMs != null && Number.isFinite(tipoffMs)) {
    const delta = tipoffMs - nowMs;
    if (delta <= NBA_PROPS_NEAR_TIP_WINDOW_MS && delta >= -NBA_PROPS_NEAR_TIP_WINDOW_MS) {
      return NBA_PROPS_NEAR_TIP_TTL_MS;
    }
  }
  return NBA_PROPS_STALE_MS;
}

/**
 * @param {number} fetchedAtMs
 * @param {number} [nowMs]
 */
export function buildNbaPropsFreshness(fetchedAtMs, nowMs = Date.now()) {
  const ageMs = Math.max(0, nowMs - fetchedAtMs);
  const isStale = ageMs > 60 * 60 * 1000;
  return {
    fetchedAt: new Date(fetchedAtMs).toISOString(),
    ageMinutes: Math.round(ageMs / 60000),
    isStale,
    staleWarning: isStale
      ? "NBA prop lines are more than 1 hour old — do not cite specific American prices as current live lines; describe relative value in words or ask the user to confirm prices."
      : null,
  };
}

/**
 * @param {{ fetchedAtMs: number, tipoffMs?: number | null }} cached
 * @param {number} [nowMs]
 */
export function shouldRefreshNbaPropsCache(cached, nowMs = Date.now()) {
  if (!cached?.fetchedAtMs) return true;
  const age = nowMs - cached.fetchedAtMs;
  return age >= nbaPropsCacheTtlMs(nowMs, cached.tipoffMs ?? null);
}
