/**
 * Session health for scoped NFL / La Liga reliability — suppress paywall when the product misfires.
 */

export const UR_PAYWALL_SUPPRESSED_SESSION_KEY = "ur_paywall_suppressed";

/**
 * @param {string} sport
 * @param {Record<string, unknown> | null | undefined} ctx
 */
export function extractBoardCountsFromSportContext(sport, ctx) {
  if (!ctx || typeof ctx !== "object") {
    return { matchCount: 0, propLineCount: 0 };
  }
  const s = String(sport || "").toLowerCase();
  if (s === "nfl") {
    return {
      matchCount: Array.isArray(ctx.games) ? ctx.games.length : 0,
      propLineCount: Array.isArray(ctx.propLines) ? ctx.propLines.length : 0,
    };
  }
  if (s === "laliga") {
    return {
      matchCount: Array.isArray(ctx.matches) ? ctx.matches.length : 0,
      propLineCount: Array.isArray(ctx.propLines) ? ctx.propLines.length : 0,
    };
  }
  return { matchCount: 0, propLineCount: 0 };
}

/**
 * @param {{
 *   sport?: string,
 *   matchCount?: number,
 *   propLineCount?: number,
 *   boardLoading?: boolean,
 *   feedDegraded?: boolean,
 * }} input
 */
export function deriveScopedBoardHealth(input = {}) {
  const sport = String(input.sport || "").toLowerCase();
  const scoped = sport === "nfl" || sport === "laliga";
  if (!scoped) {
    return { scoped: false, healthy: true, reason: null };
  }
  if (input.boardLoading) {
    return { scoped: true, healthy: null, reason: "loading" };
  }
  const matchCount = Number(input.matchCount) || 0;
  const propLineCount = Number(input.propLineCount) || 0;
  if (input.feedDegraded) {
    return {
      scoped: true,
      healthy: false,
      reason: "feed_degraded",
      matchCount,
      propLineCount,
    };
  }
  if (matchCount <= 0 || propLineCount <= 0) {
    return {
      scoped: true,
      healthy: false,
      reason: matchCount <= 0 ? "empty_matches" : "empty_prop_lines",
      matchCount,
      propLineCount,
    };
  }
  return { scoped: true, healthy: true, reason: null, matchCount, propLineCount };
}

/**
 * @param {Array<{ role?: string, loading?: boolean, urTakeFailSoft?: unknown, fallback?: boolean }>} msgs
 */
export function deriveAskSessionHealthFromMsgs(msgs) {
  if (!Array.isArray(msgs) || !msgs.length) {
    return { unhealthy: false, reason: null };
  }
  const bad = msgs.some(
    (m) =>
      m &&
      m.role === "ai" &&
      !m.loading &&
      (m.urTakeFailSoft != null || m.fallback === true),
  );
  return bad ? { unhealthy: true, reason: "fail_soft_or_fallback" } : { unhealthy: false, reason: null };
}

/**
 * @param {{
 *   paywallSuppressedSession?: boolean,
 *   boardHealth?: ReturnType<typeof deriveScopedBoardHealth>,
 *   askHealth?: ReturnType<typeof deriveAskSessionHealthFromMsgs>,
 * }} input
 */
export function shouldSuppressPaywallPush(input = {}) {
  if (input.paywallSuppressedSession) return true;
  if (input.askHealth?.unhealthy) return true;
  if (input.boardHealth?.scoped && input.boardHealth.healthy === false) return true;
  return false;
}

export function readPaywallSuppressedSession() {
  if (typeof sessionStorage === "undefined") return false;
  try {
    return sessionStorage.getItem(UR_PAYWALL_SUPPRESSED_SESSION_KEY) === "1";
  } catch {
    return false;
  }
}

export function markPaywallSuppressedSession() {
  if (typeof sessionStorage === "undefined") return;
  try {
    sessionStorage.setItem(UR_PAYWALL_SUPPRESSED_SESSION_KEY, "1");
  } catch {
    /* ignore */
  }
}
