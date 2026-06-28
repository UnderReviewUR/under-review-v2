/**
 * World Cup 2026 — aggregated injuries board KV (BDL GOAT + ESPN match summaries).
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
import { buildInjuriesBoardFromBdlRows } from "../shared/wcBdlInjuries.js";
import { isKvFresh } from "../shared/selfHealingKv.js";
import { loadAllWcMatchDetailsFromKv } from "./_wcPlayersData.js";
import {
  applyInjuriesManualPatches,
  readWcPlayerMarketsOverrideKv,
} from "./_wcPlayerMarketsOverride.js";
import { buildWcInjuriesSeedBoard } from "../src/data/wc2026InjuriesSeed.js";
import { bdlFifaFetchPaginated } from "./_wcBdlFifa.js";
import { hasWcBdlApiKey, isWcGoatPrimaryEnabled } from "../shared/wcBdlPolicy.js";

/**
 * Incremental merge after match bundle (ESPN path only — BDL uses tournament board).
 * @param {Record<string, unknown> | null | undefined} matchDetail
 */
export async function upsertWcInjuriesFromMatchDetail(matchDetail) {
  if (!matchDetail || typeof matchDetail !== "object") return { ok: false, error: "no_detail" };
  if (isWcGoatPrimaryEnabled() && hasWcBdlApiKey()) {
    return { ok: true, skipped: true, reason: "bdl_primary" };
  }

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
 * Fetch all tournament injuries from BDL FIFA GOAT.
 * @param {number} [nowMs]
 */
export async function scrapeAndCacheWcBdlInjuries(nowMs = Date.now()) {
  if (!hasWcBdlApiKey()) {
    return { ok: false, error: "no_bdl_key", source: "balldontlie" };
  }

  const fetched = await bdlFifaFetchPaginated(
    "/player_injuries",
    { "seasons[]": 2026 },
    { maxPages: 20, perPage: 100 },
  );

  if (!fetched.ok || !fetched.rows?.length) {
    return {
      ok: false,
      error: fetched.error || "no_rows",
      source: "balldontlie",
      rowCount: 0,
    };
  }

  let board = buildInjuriesBoardFromBdlRows(fetched.rows, nowMs);
  const override = await readWcPlayerMarketsOverrideKv();
  if (override?.injuryPatches?.length) {
    board = applyInjuriesManualPatches(board, override);
  }

  await setDurableJson(WC_INJURIES_KV_KEY, board, { ttlSeconds: WC_INJURIES_TTL_SECONDS });

  console.log(
    JSON.stringify({
      event: "wc_bdl_injuries_cached",
      rowCount: board.rows.length,
      starsOut: board.starsOut?.length ?? 0,
      pages: fetched.pages,
    }),
  );

  return {
    ok: true,
    board,
    rowCount: board.rows.length,
    starsOut: board.starsOut,
    source: "balldontlie",
  };
}

/**
 * Full scan cron — prefer BDL when GOAT primary, else ESPN match details.
 */
export async function scrapeAndCacheWcInjuries() {
  const nowMs = Date.now();

  if (isWcGoatPrimaryEnabled() && hasWcBdlApiKey()) {
    const bdl = await scrapeAndCacheWcBdlInjuries(nowMs);
    if (bdl?.ok && bdl.rowCount > 0) {
      return bdl;
    }
  }

  const { details } = await loadAllWcMatchDetailsFromKv();
  const board = buildInjuriesBoardFromMatchDetails(details, nowMs);

  await setDurableJson(WC_INJURIES_KV_KEY, board, { ttlSeconds: WC_INJURIES_TTL_SECONDS });

  console.log(
    JSON.stringify({
      event: "wc_injuries_cached",
      rowCount: board.rows.length,
      starsOut: board.starsOut?.length ?? 0,
      detailCount: details.length,
      source: board.source,
    }),
  );

  return {
    ok: true,
    board,
    rowCount: board.rows.length,
    starsOut: board.starsOut,
    source: board.source,
  };
}

/**
 * @param {number} [maxAgeMs]
 */
export async function readWcInjuriesFromKv(maxAgeMs = WC_INJURIES_TTL_SECONDS * 1000) {
  const cached = await getDurableJson(WC_INJURIES_KV_KEY);
  const override = await readWcPlayerMarketsOverrideKv();
  let base = cached;
  if (!base?.rows?.length) {
    base = buildWcInjuriesSeedBoard();
  }
  if (!base) return null;
  const merged = override?.injuryPatches?.length
    ? applyInjuriesManualPatches(base, override)
    : base;
  return {
    ...merged,
    stale: cached ? !isKvFresh(merged.lastUpdated, maxAgeMs) : true,
    seeded: Boolean(merged.seeded || !cached?.rows?.length),
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
