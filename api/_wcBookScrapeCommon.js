/**
 * Shared book page fetch + Golden Boot row extraction from HTML/JSON blobs.
 */

import {
  WC_BOOK_SCRAPE_TIMEOUT_MS,
  WC_BOOK_USER_AGENT,
} from "../shared/wcBookScrapePolicy.js";
import { normalizeWcPlayerName } from "../shared/wcPlayerRegistry.js";
import { isNationOnlyOutcome, parseAmericanOddsNumber, formatAmericanOdds } from "../shared/wcGoldenBootConsensus.js";

const GOLDEN_BOOT_LABEL =
  /\b(golden boot|top goal\s*scorer|top goalscorer|world cup top scorer|most goals|leading goalscorer)\b/i;

/**
 * @param {unknown} value
 */
export function formatAmericanOddsFromRaw(value) {
  if (value == null) return null;
  if (typeof value === "string" && /^[+-]?\d/.test(value.trim())) {
    const n = parseAmericanOddsNumber(value);
    return n != null ? formatAmericanOdds(n) : null;
  }
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  return formatAmericanOdds(n);
}

/**
 * @param {string} html
 */
export function extractEmbeddedJsonBlobs(html) {
  /** @type {unknown[]} */
  const blobs = [];

  const nextMatch = html.match(/<script[^>]*id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/i);
  if (nextMatch?.[1]) {
    try {
      blobs.push(JSON.parse(nextMatch[1]));
    } catch {
      /* ignore */
    }
  }

  const ldMatches = html.matchAll(
    /<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi,
  );
  for (const m of ldMatches) {
    try {
      blobs.push(JSON.parse(m[1]));
    } catch {
      /* ignore */
    }
  }

  return blobs;
}

/**
 * @param {unknown} node
 * @param {number} depth
 */
function collectCandidateArrays(node, depth = 0) {
  if (depth > 10 || node == null) return [];
  /** @type {unknown[][]} */
  const arrays = [];

  if (Array.isArray(node)) {
    if (node.length >= 3 && node.length <= 80) arrays.push(node);
    for (const item of node) arrays.push(...collectCandidateArrays(item, depth + 1));
    return arrays;
  }

  if (typeof node === "object") {
    for (const v of Object.values(node)) {
      arrays.push(...collectCandidateArrays(v, depth + 1));
    }
  }
  return arrays;
}

/**
 * @param {Record<string, unknown>} obj
 */
function labelFromObject(obj) {
  return [
    obj.marketName,
    obj.name,
    obj.displayName,
    obj.title,
    obj.marketType,
    obj.type,
    obj.description,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

/**
 * @param {unknown} entry
 */
function rowFromGenericEntry(entry) {
  if (!entry || typeof entry !== "object") return null;
  const e = /** @type {Record<string, unknown>} */ (entry);

  const name = normalizeWcPlayerName(
    e.participantName ||
      e.selectionName ||
      e.label ||
      e.displayName ||
      e.name ||
      e.athleteName ||
      (typeof e.athlete === "object" && e.athlete
        ? e.athlete.displayName || e.athlete.fullName
        : ""),
  );

  const odds = formatAmericanOddsFromRaw(
    e.americanOdds ??
      e.oddsAmerican ??
      e.price ??
      e.odds ??
      (typeof e.odds === "object" && e.odds ? e.odds.american : null),
  );

  const nationAbbr =
    e.teamAbbr ||
    e.team ||
    (typeof e.team === "object" && e.team ? e.team.abbreviation : null);

  if (!name || !odds || isNationOnlyOutcome(name)) return null;
  return {
    name,
    americanOdds: odds,
    nationAbbr: nationAbbr ? String(nationAbbr).toUpperCase().slice(0, 3) : undefined,
  };
}

/**
 * @param {unknown} json
 */
export function parseGoldenBootRowsFromJson(json) {
  /** @type {Array<{ name: string, americanOdds: string, nationAbbr?: string }>} */
  const rows = [];
  const seen = new Set();

  const tryPush = (row) => {
    if (!row) return;
    const key = `${row.name}|${row.americanOdds}`;
    if (seen.has(key)) return;
    seen.add(key);
    rows.push(row);
  };

  if (typeof json === "object" && json && !Array.isArray(json)) {
    const label = labelFromObject(/** @type {Record<string, unknown>} */ (json));
    if (GOLDEN_BOOT_LABEL.test(label)) {
      const entries =
        /** @type {Record<string, unknown>} */ (json).entries ||
        /** @type {Record<string, unknown>} */ (json).participants ||
        /** @type {Record<string, unknown>} */ (json).selections ||
        /** @type {Record<string, unknown>} */ (json).outcomes;
      if (Array.isArray(entries)) {
        for (const ent of entries) tryPush(rowFromGenericEntry(ent));
      }
    }
  }

  const arrays = collectCandidateArrays(json);
  for (const arr of arrays) {
    let marketish = 0;
    for (const item of arr) {
      if (item && typeof item === "object" && rowFromGenericEntry(item)) marketish += 1;
    }
    if (marketish < 3) continue;

    for (const item of arr) {
      tryPush(rowFromGenericEntry(item));
    }
  }

  return rows.slice(0, 40);
}

/**
 * @param {string} html
 */
export function parseGoldenBootRowsFromHtml(html) {
  const fromJson = extractEmbeddedJsonBlobs(html).flatMap((b) => parseGoldenBootRowsFromJson(b));
  if (fromJson.length >= 5) return fromJson;

  /** @type {Array<{ name: string, americanOdds: string }>} */
  const regexRows = [];
  const re =
    /([A-ZÀ-ÖØ-Þ][a-zà-öø-ÿ]+(?:['\s.-][A-ZÀ-ÖØ-Þ]?[a-zà-öø-ÿ]+)+)\s{0,24}(\+\d{3,5}|\-\d{2,4})/g;
  let m;
  while ((m = re.exec(html)) && regexRows.length < 30) {
    const name = normalizeWcPlayerName(m[1]);
    const odds = formatAmericanOddsFromRaw(m[2]);
    if (!name || !odds || isNationOnlyOutcome(name)) continue;
    regexRows.push({ name, americanOdds: odds });
  }

  return regexRows.length ? regexRows : fromJson;
}

/**
 * @param {string} url
 */
export async function fetchBookPageHtml(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), WC_BOOK_SCRAPE_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      cache: "no-store",
      signal: controller.signal,
      headers: {
        "User-Agent": WC_BOOK_USER_AGENT,
        Accept: "text/html,application/json",
      },
    });
    clearTimeout(timer);
    if (!res.ok) {
      return { ok: false, html: "", status: res.status, error: `http_${res.status}` };
    }
    const html = await res.text();
    return { ok: true, html, status: res.status, error: null };
  } catch (err) {
    clearTimeout(timer);
    return { ok: false, html: "", status: 0, error: err?.message || "fetch_failed" };
  }
}
