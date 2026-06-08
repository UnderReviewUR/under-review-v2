/**
 * ESPN event id → per-book sportsbook event id (for per-fixture prop URLs).
 */

import { getDurableJson, setDurableJson } from "../api/_durableStore.js";

export const WC_BOOK_EVENT_MAP_KV_KEY = "wc2026_book_event_map";
export const WC_BOOK_EVENT_MAP_TTL_SECONDS = 14 * 24 * 3600;

/** @type {Record<string, Record<string, string>>} */
const BOOK_URL_PATTERNS = {
  draftkings: /sportsbook\.draftkings\.com\/event\/(\d+)/gi,
  fanduel: /sportsbook\.fanduel\.com\/[^"'\s]*\/(\d{5,})/gi,
  betmgm: /sports\.betmgm\.com\/[^"'\s]*\/events\/(\d+)/gi,
};

/**
 * @param {string} html
 * @param {string} bookKey
 */
export function extractBookEventIdsFromHtml(html, bookKey) {
  const re = BOOK_URL_PATTERNS[String(bookKey || "").toLowerCase()];
  if (!re || !html) return [];
  const ids = new Set();
  let m;
  while ((m = re.exec(html))) {
    const id = String(m[1] || "").trim();
    if (id) ids.add(id);
  }
  return [...ids];
}

/**
 * @param {Record<string, unknown> | null | undefined} root
 */
export function readWcBookEventMap(root) {
  const map = root?.byEspnEventId;
  return map && typeof map === "object" ? /** @type {Record<string, Record<string, string>>} */ (map) : {};
}

/**
 * @param {string} espnEventId
 * @param {string} bookKey
 * @param {Record<string, unknown> | null | undefined} [cachedRoot]
 */
export function resolveWcBookEventId(espnEventId, bookKey, cachedRoot = null) {
  const espn = String(espnEventId || "").trim();
  const book = String(bookKey || "").toLowerCase();
  if (!espn || !book) return null;
  const map = readWcBookEventMap(cachedRoot);
  return map[espn]?.[book] || null;
}

/**
 * @param {string} espnEventId
 * @param {string} bookKey
 * @param {string} bookEventId
 */
export async function upsertWcBookEventId(espnEventId, bookKey, bookEventId) {
  const espn = String(espnEventId || "").trim();
  const book = String(bookKey || "").toLowerCase();
  const bid = String(bookEventId || "").trim();
  if (!espn || !book || !bid) return { ok: false };

  const cached = (await getDurableJson(WC_BOOK_EVENT_MAP_KV_KEY)) || {
    lastUpdated: Date.now(),
    byEspnEventId: {},
  };
  const byEspn = readWcBookEventMap(cached);
  const row = { ...(byEspn[espn] || {}) };
  if (row[book] === bid) return { ok: true, unchanged: true };

  row[book] = bid;
  byEspn[espn] = row;
  await setDurableJson(
    WC_BOOK_EVENT_MAP_KV_KEY,
    { lastUpdated: Date.now(), byEspnEventId: byEspn },
    { ttlSeconds: WC_BOOK_EVENT_MAP_TTL_SECONDS },
  );
  return { ok: true, unchanged: false };
}

/**
 * Learn book ids from fetched HTML when ESPN id is known.
 * @param {string} espnEventId
 * @param {string} bookKey
 * @param {string} html
 */
export async function learnWcBookEventIdsFromHtml(espnEventId, bookKey, html) {
  const ids = extractBookEventIdsFromHtml(html, bookKey);
  if (!ids.length) return { ok: false, learned: null };
  const learned = ids[0];
  await upsertWcBookEventId(espnEventId, bookKey, learned);
  return { ok: true, learned };
}
