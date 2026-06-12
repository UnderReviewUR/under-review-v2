/**
 * Cached set of WC match event IDs already finalized in KV detail blobs.
 * Avoids N detail GETs every scrape-scheduler tick as FT matches accumulate.
 */

import { getDurableJson, setDurableJson } from "./_durableStore.js";
import { isWcMatchFtStatus } from "../shared/wcMatchDetailTargets.js";

export const WC_FINALIZED_MATCH_IDS_KV_KEY = "wc_match_finalized_event_ids";
const TTL_SECONDS = 30 * 24 * 60 * 60;

/**
 * @param {string | number} eventId
 */
export async function markWcMatchFinalizedInCache(eventId) {
  const id = String(eventId || "").trim();
  if (!id) return;

  const row = (await getDurableJson(WC_FINALIZED_MATCH_IDS_KV_KEY)) || { ids: [] };
  const ids = new Set(
    Array.isArray(row.ids) ? row.ids.map((x) => String(x)).filter(Boolean) : [],
  );
  if (ids.has(id)) return;

  ids.add(id);
  await setDurableJson(
    WC_FINALIZED_MATCH_IDS_KV_KEY,
    { ids: [...ids], updatedAt: Date.now() },
    { ttlSeconds: TTL_SECONDS },
  );
}

/**
 * @param {Array<Record<string, unknown>>} matches
 * @param {(eventId: string | number) => Promise<{ finalized?: boolean } | null>} readDetail
 */
export async function loadFinalizedWcMatchDetailIds(matches, readDetail) {
  const ft = (matches || []).filter((m) => isWcMatchFtStatus(m?.status));
  if (!ft.length) return new Set();

  const cached = await getDurableJson(WC_FINALIZED_MATCH_IDS_KV_KEY);
  const known = new Set(
    Array.isArray(cached?.ids) ? cached.ids.map((x) => String(x)).filter(Boolean) : [],
  );

  /** @type {Set<string>} */
  const finalized = new Set();
  /** @type {Array<Record<string, unknown>>} */
  const toCheck = [];

  for (const m of ft) {
    const id = String(m?.id || "").trim();
    if (!id) continue;
    if (known.has(id)) {
      finalized.add(id);
    } else {
      toCheck.push(m);
    }
  }

  if (!toCheck.length) return finalized;

  let dirty = false;
  await Promise.all(
    toCheck.map(async (m) => {
      const id = String(m.id);
      const row = await readDetail(m.id);
      if (row?.finalized) {
        finalized.add(id);
        if (!known.has(id)) {
          known.add(id);
          dirty = true;
        }
      }
    }),
  );

  if (dirty) {
    await setDurableJson(
      WC_FINALIZED_MATCH_IDS_KV_KEY,
      { ids: [...known], updatedAt: Date.now() },
      { ttlSeconds: TTL_SECONDS },
    );
  }

  return finalized;
}
