import { getDurableJson, setDurableJson } from "./_durableStore.js";
import { nflPropsCacheKey } from "../shared/nflPropsConstants.js";
import {
  buildNflPropsFreshness,
  nflPropsCacheTtlMs,
  shouldRefreshNflPropsCache,
} from "../shared/nflPropsCachePolicy.js";
import {
  fetchActionNetworkNflScoreboard,
  fetchAndParseActionNetworkNflGameProps,
  nflEtDateYmd,
} from "./_nflPropsFetch.js";
import { normalizeNflScoreboardGame } from "./_nflBoardNormalize.js";

export { nflEtDateYmd };

const memCache = new Map();

/**
 * @param {number | string} gameId
 */
async function readCacheEntry(gameId) {
  const key = nflPropsCacheKey(gameId);
  const mem = memCache.get(key);
  if (mem) return mem;
  return getDurableJson(key);
}

/**
 * @param {number | string} gameId
 * @param {{ payload: Record<string, unknown>, fetchedAtMs: number, tipoffMs?: number | null, isLive?: boolean }} entry
 */
async function writeCacheEntry(gameId, entry) {
  const key = nflPropsCacheKey(gameId);
  memCache.set(key, entry);
  const ttlSeconds = Math.ceil(
    nflPropsCacheTtlMs(entry.fetchedAtMs, entry.tipoffMs ?? null, {
      isLive: Boolean(entry.isLive),
    }) / 1000,
  );
  try {
    await setDurableJson(key, entry, { ttlSeconds });
  } catch {
    /* KV optional locally */
  }
}

/**
 * @param {Record<string, unknown>} payload
 * @param {number} fetchedAtMs
 * @param {{ isLive?: boolean }} [opts]
 */
export function decorateNflPropsWithFreshness(payload, fetchedAtMs, opts = {}) {
  const freshness = buildNflPropsFreshness(fetchedAtMs, Date.now(), opts);
  return {
    ...payload,
    fetchedAtMs,
    fetchedAt: freshness.fetchedAt,
    freshness,
    isLive: Boolean(opts?.isLive),
  };
}

/**
 * Cron / manual refresh — REST only.
 * @param {number | string} gameId
 * @param {{ tipoffMs?: number | null, isLive?: boolean }} [opts]
 */
export async function scrapeAndCacheNflProps(gameId, opts = {}) {
  const gid = Number(gameId);
  if (!Number.isFinite(gid) || gid <= 0) {
    throw new Error("Invalid NFL props gameId");
  }

  const nowMs = Date.now();
  const payload = await fetchAndParseActionNetworkNflGameProps(gid);
  const isLive = Boolean(opts.isLive);
  const entry = {
    payload: { ...payload, scrapeMethod: payload.scrapeMethod || "rest" },
    fetchedAtMs: nowMs,
    tipoffMs: opts.tipoffMs ?? null,
    isLive,
  };

  await writeCacheEntry(gid, entry);

  console.log(
    JSON.stringify({
      event: "nfl_props_cached",
      gameId: gid,
      scrapeMethod: payload.scrapeMethod,
      playerCount: payload.playerCount,
      posted: payload.hasPostedLines,
      tipoffMs: opts.tipoffMs ?? null,
    }),
  );

  return decorateNflPropsWithFreshness(entry.payload, nowMs, { isLive });
}

/**
 * Self-healing read — KV/mem when fresh; otherwise scrape Action Network.
 * @param {number | string} gameId
 * @param {{ tipoffMs?: number | null, isLive?: boolean }} [opts]
 */
export async function getNflPropsForBoard(gameId, opts = {}) {
  const gid = Number(gameId);
  if (!Number.isFinite(gid) || gid <= 0) {
    throw new Error("Invalid NFL props gameId");
  }

  const cached = await readCacheEntry(gid);
  if (cached?.payload && !shouldRefreshNflPropsCache(cached)) {
    return decorateNflPropsWithFreshness(cached.payload, cached.fetchedAtMs, {
      isLive: Boolean(cached.isLive || opts.isLive),
    });
  }

  try {
    return await scrapeAndCacheNflProps(gid, {
      tipoffMs: opts.tipoffMs ?? cached?.tipoffMs ?? null,
      isLive: Boolean(opts.isLive),
    });
  } catch (err) {
    if (cached?.payload) {
      console.warn(
        JSON.stringify({
          event: "nfl_props_self_heal_failed",
          gameId: gid,
          error: err?.message || String(err),
        }),
      );
      return decorateNflPropsWithFreshness(cached.payload, cached.fetchedAtMs, {
        isLive: Boolean(cached.isLive),
      });
    }
    throw err;
  }
}

/**
 * Resolve upcoming AN game ids for scrape scheduler (today + tomorrow ET).
 * @param {number} [nowMs]
 */
export async function listUpcomingNflPropsScrapeGames(nowMs = Date.now()) {
  const today = nflEtDateYmd(nowMs);
  const tomorrow = nflEtDateYmd(nowMs + 24 * 3600_000);

  /** @type {Map<number, Record<string, unknown>>} */
  const byId = new Map();
  for (const dateYmd of [today, tomorrow]) {
    try {
      const raw = await fetchActionNetworkNflScoreboard({ dateYmd });
      for (const g of raw?.games || []) {
        const norm = normalizeNflScoreboardGame(g);
        if (!norm.providerGameId) continue;
        byId.set(Number(norm.providerGameId), norm);
      }
    } catch (err) {
      console.warn(
        JSON.stringify({
          event: "nfl_scrape_scoreboard_failed",
          dateYmd,
          error: err?.message || String(err),
        }),
      );
    }
  }

  const now = nowMs;
  return [...byId.values()].filter((g) => {
    if (g.tipoffMs == null) return true;
    return g.tipoffMs > now - 3 * 3600_000 && g.tipoffMs < now + 72 * 3600_000;
  });
}
