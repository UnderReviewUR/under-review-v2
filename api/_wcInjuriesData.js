/**
 * World Cup 2026 — aggregated injuries board KV (ESPN match summaries).
 */

import { getDurableJson, setDurableJson } from "./_durableStore.js";
import {
  WC_INJURIES_KV_KEY,
  WC_INJURIES_TTL_SECONDS,
} from "../shared/wc2026PlayerConstants.js";
import {
  buildInjuriesBoardFromMatchDetails,
  createEmptyInjuriesBoard,
  mergeInjuriesFromMatchDetail,
} from "../shared/wcInjuriesBoard.js";
import { isKvFresh } from "../shared/selfHealingKv.js";
import { loadAllWcMatchDetailsFromKv } from "./_wcPlayersData.js";

/**
 * Incremental merge after match bundle.
 * @param {Record<string, unknown> | null | undefined} matchDetail
 */
export async function upsertWcInjuriesFromMatchDetail(matchDetail) {
  if (!matchDetail || typeof matchDetail !== "object") return { ok: false, error: "no_detail" };

  const nowMs = Date.now();
  const cached = (await getDurableJson(WC_INJURIES_KV_KEY)) || createEmptyInjuriesBoard(nowMs);
  mergeInjuriesFromMatchDetail(cached, matchDetail);
  cached.lastUpdated = nowMs;
  cached.source = "espn_match_details";

  await setDurableJson(WC_INJURIES_KV_KEY, cached, { ttlSeconds: WC_INJURIES_TTL_SECONDS });

  return {
    ok: true,
    rowCount: Array.isArray(cached.rows) ? cached.rows.length : 0,
    starsOut: cached.starsOut || [],
  };
}

/**
 * Full scan cron.
 */
export async function scrapeAndCacheWcInjuries() {
  const nowMs = Date.now();
  const { details } = await loadAllWcMatchDetailsFromKv();
  const board = buildInjuriesBoardFromMatchDetails(details, nowMs);

  await setDurableJson(WC_INJURIES_KV_KEY, board, { ttlSeconds: WC_INJURIES_TTL_SECONDS });

  console.log(
    JSON.stringify({
      event: "wc_injuries_cached",
      rowCount: board.rows.length,
      starsOut: board.starsOut?.length ?? 0,
      detailCount: details.length,
    }),
  );

  return {
    ok: true,
    board,
    rowCount: board.rows.length,
    starsOut: board.starsOut,
  };
}

/**
 * @param {number} [maxAgeMs]
 */
export async function readWcInjuriesFromKv(maxAgeMs = WC_INJURIES_TTL_SECONDS * 1000) {
  const cached = await getDurableJson(WC_INJURIES_KV_KEY);
  if (!cached) return null;
  return {
    ...cached,
    stale: !isKvFresh(cached.lastUpdated, maxAgeMs),
  };
}

export async function getWcInjuriesPayload() {
  const kv = await readWcInjuriesFromKv();
  return {
    ok: Boolean(kv?.rows?.length),
    injuries: kv,
    rowCount: Array.isArray(kv?.rows) ? kv.rows.length : 0,
    starsOut: kv?.starsOut || [],
    stale: Boolean(kv?.stale),
    lastUpdated: kv?.lastUpdated ?? null,
  };
}
