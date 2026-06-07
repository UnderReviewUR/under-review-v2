/**
 * World Cup post-match advanced stats — ESPN chance quality → KV (Phase 2).
 */

import { getDurableJson, setDurableJson } from "./_durableStore.js";
import {
  WC_MATCH_ADVANCED_STATS_KV_KEY,
  WC_MATCH_ADVANCED_STATS_TTL_SECONDS,
} from "../shared/wc2026PlayerConstants.js";
import { buildMatchChanceQualityFromDetail } from "../shared/wcMatchChanceQuality.js";
import {
  attachMatchAdvancedStatsFreshness,
  readFreshMatchAdvancedStatsForEvent,
} from "../shared/wcMatchAdvancedStats.js";

/**
 * @param {Record<string, unknown>} detail — normalized ESPN match detail
 */
export async function cacheWcMatchAdvancedStatsFromDetail(detail) {
  const eventId = String(detail?.eventId || "").trim();
  if (!eventId) return { ok: false, error: "missing_event_id" };

  const chanceQuality = buildMatchChanceQualityFromDetail(detail);
  if (!chanceQuality) {
    return { ok: false, eventId, error: "not_ft_or_no_stats" };
  }

  const nowMs = Date.now();
  const cached = (await getDurableJson(WC_MATCH_ADVANCED_STATS_KV_KEY)) || {};
  const byEventId =
    cached.byEventId && typeof cached.byEventId === "object" ? { ...cached.byEventId } : {};

  byEventId[eventId] = {
    ...chanceQuality,
    lastUpdated: nowMs,
    status: "FT",
  };

  await setDurableJson(
    WC_MATCH_ADVANCED_STATS_KV_KEY,
    { lastUpdated: nowMs, byEventId },
    { ttlSeconds: WC_MATCH_ADVANCED_STATS_TTL_SECONDS },
  );

  console.log(
    JSON.stringify({
      event: "wc_match_advanced_stats_cached",
      eventId,
      source: chanceQuality.source,
      homeIndex: chanceQuality.team?.home?.chanceIndex ?? null,
      awayIndex: chanceQuality.team?.away?.chanceIndex ?? null,
      playerRows: (chanceQuality.players || []).length,
    }),
  );

  return { ok: true, eventId, payload: byEventId[eventId] };
}

/**
 * @param {string} eventId
 * @param {number} [nowMs]
 */
export async function readWcMatchAdvancedStatsForEvent(eventId, nowMs = Date.now()) {
  const kv = await getDurableJson(WC_MATCH_ADVANCED_STATS_KV_KEY);
  return readFreshMatchAdvancedStatsForEvent(kv, String(eventId), nowMs);
}

/**
 * @param {Record<string, unknown> | null | undefined} payload
 * @param {number} [nowMs]
 */
export function attachAdvancedStatsToMatchDetail(detail, payload, nowMs = Date.now()) {
  if (!detail || !payload) return detail;
  const attached = attachMatchAdvancedStatsFreshness(payload, nowMs);
  return { ...detail, advancedStats: attached };
}
