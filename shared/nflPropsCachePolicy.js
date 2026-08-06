export const NFL_PROPS_STALE_MS = 30 * 60 * 1000;
export const NFL_PROPS_NEAR_TIP_TTL_MS = 10 * 60 * 1000;
export const NFL_PROPS_NEAR_TIP_WINDOW_MS = 2 * 60 * 60 * 1000;
export const NFL_PROPS_LIVE_TTL_MS = 8 * 60 * 1000;
export const NFL_PROPS_LIVE_STALE_MS = 25 * 60 * 1000;
export const NFL_BOARD_TTL_MS = 5 * 60 * 1000;

/**
 * @param {number} [nowMs]
 * @param {number | null | undefined} tipoffMs
 * @param {{ isLive?: boolean }} [opts]
 */
export function nflPropsCacheTtlMs(nowMs = Date.now(), tipoffMs = null, opts = {}) {
  if (opts?.isLive) return NFL_PROPS_LIVE_TTL_MS;
  if (tipoffMs != null && Number.isFinite(tipoffMs)) {
    const delta = tipoffMs - nowMs;
    if (delta <= NFL_PROPS_NEAR_TIP_WINDOW_MS && delta >= -NFL_PROPS_NEAR_TIP_WINDOW_MS) {
      return NFL_PROPS_NEAR_TIP_TTL_MS;
    }
  }
  return NFL_PROPS_STALE_MS;
}

/**
 * @param {number} fetchedAtMs
 * @param {number} [nowMs]
 * @param {{ isLive?: boolean }} [opts]
 */
export function buildNflPropsFreshness(fetchedAtMs, nowMs = Date.now(), opts = {}) {
  const ageMs = Math.max(0, nowMs - fetchedAtMs);
  const staleMs = opts?.isLive ? NFL_PROPS_LIVE_STALE_MS : 60 * 60 * 1000;
  const isStale = ageMs > staleMs;
  const maxAgeMinutes = Math.round(staleMs / 60000);
  return {
    fetchedAt: new Date(fetchedAtMs).toISOString(),
    ageMinutes: Math.round(ageMs / 60000),
    isStale,
    maxAgeMinutes,
    staleWarning: isStale
      ? opts?.isLive
        ? `NFL prop lines are more than ${maxAgeMinutes} minutes old (live game) — do not cite specific American prices as current live lines.`
        : "NFL prop lines are more than 1 hour old — do not cite specific American prices as current live lines."
      : null,
  };
}

/**
 * @param {{ fetchedAtMs: number, tipoffMs?: number | null, isLive?: boolean }} cached
 * @param {number} [nowMs]
 */
export function shouldRefreshNflPropsCache(cached, nowMs = Date.now()) {
  if (!cached?.fetchedAtMs) return true;
  const age = nowMs - cached.fetchedAtMs;
  return age >= nflPropsCacheTtlMs(nowMs, cached.tipoffMs ?? null, {
    isLive: Boolean(cached?.isLive),
  });
}
