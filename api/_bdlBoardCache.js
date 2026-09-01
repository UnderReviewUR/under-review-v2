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
  } catch {
    /* KV optional locally */
  }

  const payload = await fetchFresh();
  const entry = { fetchedAtMs: Date.now(), payload };
  boardMem.set(key, entry);
  try {
    await setDurableJson(key, entry, { ttlSeconds: Math.ceil(ttlMs / 1000) });
  } catch {
    /* KV optional locally */
  }
  return { ...payload, cache: "fresh" };
}
