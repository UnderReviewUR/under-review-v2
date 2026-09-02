/**
 * Short TTL cache for BDL GOAT live boards — trial keys are 5 req/min.
 */
import { getDurableJson, setDurableJson } from "./_durableStore.js";
import { getBdlBoardCacheTtlMs } from "../shared/bdlGoatTrialPolicy.js";

/** @type {Map<string, { fetchedAtMs: number, payload: Record<string, unknown> }>} */
const boardMem = new Map();

/**
 * @param {string} key
 * @param {() => Promise<Record<string, unknown>>} fetchFresh
 */
export async function getBdlBoardCached(key, fetchFresh) {
  const ttlMs = getBdlBoardCacheTtlMs();
  const memHit = boardMem.get(key);
  if (memHit && Date.now() - memHit.fetchedAtMs < ttlMs) {
    return { ...memHit.payload, cache: "memory" };
  }

  /** @type {Record<string, unknown>|null} */
  let stalePayload = null;
  try {
    const kvHit = await getDurableJson(key);
    if (
      kvHit &&
      typeof kvHit === "object" &&
      kvHit.fetchedAtMs &&
      kvHit.payload &&
      Date.now() - Number(kvHit.fetchedAtMs) < ttlMs
    ) {
      boardMem.set(key, { fetchedAtMs: Number(kvHit.fetchedAtMs), payload: kvHit.payload });
      return { ...kvHit.payload, cache: "kv" };
    }
    if (kvHit?.payload && Array.isArray(kvHit.payload.matches) && kvHit.payload.matches.length > 0) {
      stalePayload = kvHit.payload;
    }
  } catch {
    /* KV optional locally */
  }

  if (memHit?.payload && Array.isArray(memHit.payload.matches) && memHit.payload.matches.length > 0) {
    stalePayload = memHit.payload;
  }

  const payload = await fetchFresh();
  const hasMatches = Array.isArray(payload?.matches) && payload.matches.length > 0;
  if (!hasMatches && stalePayload) {
    return {
      ...stalePayload,
      cache: "stale_fallback",
      asOf: payload?.asOf || stalePayload.asOf,
      error: payload?.error || stalePayload.error || "rate_limited_or_empty_refresh",
    };
  }

  if (hasMatches || payload?.ok !== false) {
    const entry = { fetchedAtMs: Date.now(), payload };
    boardMem.set(key, entry);
    try {
      await setDurableJson(key, entry, { ttlSeconds: Math.ceil(ttlMs / 1000) });
    } catch {
      /* KV optional locally */
    }
  }
  return { ...payload, cache: "fresh" };
}
