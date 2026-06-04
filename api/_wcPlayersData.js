/**
 * World Cup 2026 — tournament player registry KV (ESPN match details + seed).
 */

import { getDurableJson, setDurableJson } from "./_durableStore.js";
import { readWcMatchDetailFromKv, readWcMatchesFromKv } from "./_wcData.js";
import {
  WC_PLAYERS_KV_KEY,
  WC_PLAYERS_TTL_SECONDS,
} from "../shared/wc2026PlayerConstants.js";
import {
  countRegistryPlayers,
  createEmptyPlayerRegistry,
  seedRegistryFromStaticList,
  upsertRegistryFromMatchDetail,
} from "../shared/wcPlayerRegistry.js";
import { buildRegistryFromMatchDetails } from "../shared/wcPlayerStatsRollup.js";
import { isKvFresh } from "../shared/selfHealingKv.js";

export const WC_PLAYER_DETAIL_READ_CONCURRENCY = 12;

/**
 * Load all cached match detail rows for fixtures in wc2026_matches.
 * @param {number} [concurrency]
 */
export async function loadAllWcMatchDetailsFromKv(concurrency = WC_PLAYER_DETAIL_READ_CONCURRENCY) {
  const kv = await readWcMatchesFromKv(Number.MAX_SAFE_INTEGER);
  const matches = Array.isArray(kv?.matches) ? kv.matches : [];
  /** @type {Array<Record<string, unknown>>} */
  const details = [];

  for (let i = 0; i < matches.length; i += concurrency) {
    const chunk = matches.slice(i, i + concurrency);
    const batch = await Promise.all(
      chunk.map(async (m) => {
        const id = m?.id != null ? String(m.id) : "";
        if (!id) return null;
        return readWcMatchDetailFromKv(id);
      }),
    );
    for (const row of batch) {
      if (row && typeof row === "object") details.push(row);
    }
  }

  return { matches, details };
}

/**
 * Incremental upsert after a single match bundle scrape.
 * @param {Record<string, unknown> | null | undefined} matchDetail
 */
export async function upsertWcPlayersFromMatchDetail(matchDetail) {
  if (!matchDetail || typeof matchDetail !== "object") return { ok: false, error: "no_detail" };

  const nowMs = Date.now();
  const cached = (await getDurableJson(WC_PLAYERS_KV_KEY)) || createEmptyPlayerRegistry(nowMs);
  if (!cached.teams || !Object.keys(cached.teams).length) {
    seedRegistryFromStaticList(cached);
  }

  upsertRegistryFromMatchDetail(cached, matchDetail);
  cached.lastUpdated = nowMs;
  cached.source = "espn_match_details+seed";

  await setDurableJson(WC_PLAYERS_KV_KEY, cached, { ttlSeconds: WC_PLAYERS_TTL_SECONDS });

  const counts = countRegistryPlayers(cached);
  return { ok: true, ...counts };
}

/**
 * Full rollup cron — all match details + seed.
 */
export async function scrapeAndCacheWcPlayers() {
  const nowMs = Date.now();
  const { details } = await loadAllWcMatchDetailsFromKv();
  const registry = buildRegistryFromMatchDetails(details, nowMs);

  await setDurableJson(WC_PLAYERS_KV_KEY, registry, { ttlSeconds: WC_PLAYERS_TTL_SECONDS });

  const counts = countRegistryPlayers(registry);
  console.log(
    JSON.stringify({
      event: "wc_players_cached",
      ...counts,
      detailCount: details.length,
      source: registry.source,
    }),
  );

  return { ok: true, registry, ...counts };
}

/**
 * @param {number} [maxAgeMs]
 */
export async function readWcPlayersFromKv(maxAgeMs = WC_PLAYERS_TTL_SECONDS * 1000) {
  let cached = await getDurableJson(WC_PLAYERS_KV_KEY);
  if (!cached?.teams || !Object.keys(cached.teams).length) {
    const seeded = createEmptyPlayerRegistry();
    seedRegistryFromStaticList(seeded);
    cached = seeded;
  }
  return {
    ...cached,
    stale: !isKvFresh(cached.lastUpdated, maxAgeMs),
  };
}

/**
 * @param {number} [nowMs]
 */
export async function getWcPlayersPayload(nowMs = Date.now()) {
  const kv = await readWcPlayersFromKv();
  const counts = countRegistryPlayers(kv);
  return {
    ok: counts.playerCount > 0,
    players: kv,
    ...counts,
    stale: Boolean(kv?.stale),
    lastUpdated: kv?.lastUpdated ?? null,
    source: kv?.source ?? null,
  };
}
