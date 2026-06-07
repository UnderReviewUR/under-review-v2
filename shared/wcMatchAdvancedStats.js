/**
 * World Cup post-match advanced stats KV — chance quality overlay (Phase 2).
 */

import {
  WC_MATCH_ADVANCED_STATS_MAX_AGE_MS,
} from "./wc2026PlayerConstants.js";
import { calculateOddsFreshness } from "./wcOddsFreshness.js";

export { WC_MATCH_ADVANCED_STATS_MAX_AGE_MS };

/**
 * @param {Record<string, unknown> | null | undefined} kvRoot
 * @param {string} eventId
 */
export function matchAdvancedStatsForEvent(kvRoot, eventId) {
  const id = String(eventId || "").trim();
  if (!id || !kvRoot) return null;
  const by = kvRoot.byEventId;
  if (!by || typeof by !== "object") return null;
  return /** @type {Record<string, unknown>} */ (by)[id] || null;
}

/**
 * @param {Record<string, unknown> | null | undefined} eventPayload
 * @param {number} [nowMs]
 */
export function attachMatchAdvancedStatsFreshness(eventPayload, nowMs = Date.now()) {
  if (!eventPayload) return null;
  const freshness = calculateOddsFreshness(
    eventPayload.lastUpdated,
    WC_MATCH_ADVANCED_STATS_MAX_AGE_MS,
    nowMs,
  );
  return {
    ...eventPayload,
    stale: freshness.isStale,
    freshness,
  };
}

/**
 * @param {Record<string, unknown> | null | undefined} kvRoot
 * @param {string} eventId
 * @param {number} [nowMs]
 */
export function readFreshMatchAdvancedStatsForEvent(kvRoot, eventId, nowMs = Date.now()) {
  const raw = matchAdvancedStatsForEvent(kvRoot, String(eventId));
  return attachMatchAdvancedStatsFreshness(raw, nowMs);
}
