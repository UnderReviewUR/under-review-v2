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

const MATCH_ANYTIME_SCORER_LABEL =
  /\b(anytime goal\s*scorer|anytime scorer|to score at any time|player to score(?! the most)|goalscorer market)\b/i;

const MATCH_FIRST_SCORER_LABEL =
  /\b(first goal\s*scorer|first goalscorer|to score first|1st goal\s*scorer)\b/i;

const MATCH_LAST_SCORER_LABEL =
  /\b(last goal\s*scorer|last goalscorer|to score last)\b/i;

/**
 * @param {string} raw
 */
export function americanFromFractional(raw) {
  const s = String(raw || "").trim();
  const m = s.match(/^(\d+)\s*\/\s*(\d+)$/);
  if (!m) return null;
  const num = Number(m[1]);
  const den = Number(m[2]);
  if (!Number.isFinite(num) || !Number.isFinite(den) || den <= 0) return null;
  const decimal = 1 + num / den;
  if (decimal >= 2) return formatAmericanOdds(Math.round((decimal - 1) * 100));
  return formatAmericanOdds(Math.round(-100 / (decimal - 1)));
}

/**
 * @param {unknown} value
 */
export function formatAmericanOddsFromRaw(value) {
  if (value == null) return null;
  const str = String(value).trim();
  if (/^\d+\s*\/\s*\d+$/.test(str)) {
    return americanFromFractional(str);
  }
  if (/^[+-]?\d/.test(str)) {
    const n = parseAmericanOddsNumber(str);
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
      e.fractionalOdds ??
      e.fractional ??
      e.priceFractional ??
      e.price ??
      e.odds ??
      (typeof e.odds === "object" && e.odds
        ? e.odds.american || e.odds.fractional
        : null),
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
 * UK / aggregator HTML — name + fractional or American odds pairs.
 * @param {string} html
 */
export function parseUkAggregatorGoldenBootRowsFromHtml(html) {
  /** @type {Array<{ name: string, americanOdds: string, nationAbbr?: string }>} */
  const rows = [];
  const seen = new Set();

  const fracRe =
    /([A-ZÀ-ÖØ-Þ][a-zà-öø-ÿ]+(?:['\s.-][A-ZÀ-ÖØ-Þ]?[a-zà-öø-ÿ]+)+)\s{0,20}(\d+\s*\/\s*\d+)/g;
  let m;
  while ((m = fracRe.exec(html)) && rows.length < 40) {
    const name = normalizeWcPlayerName(m[1]);
    const odds = americanFromFractional(m[2]);
    if (!name || !odds || isNationOnlyOutcome(name)) continue;
    const key = `${name}|${odds}`;
    if (seen.has(key)) continue;
    seen.add(key);
    rows.push({ name, americanOdds: odds });
  }

  if (rows.length >= 5) return rows;
  return parseGoldenBootRowsFromHtml(html);
}

/**
 * OddsChecker-style comparison rows embedded in page JSON/HTML.
 * @param {string} html
 */
export function parseOddsCheckerGoldenBootRowsFromHtml(html) {
  const fromJson = extractEmbeddedJsonBlobs(html).flatMap((b) => parseGoldenBootRowsFromJson(b));
  if (fromJson.length >= 5) return fromJson;

  const rows = [];
  const seen = new Set();
  const re =
    /([A-ZÀ-ÖØ-Þ][a-zà-öø-ÿ]+(?:['\s.-][A-ZÀ-ÖØ-Þ]?[a-zà-öø-ÿ]+)+)[^+\d]{0,40}(\+\d{3,5}|\-\d{2,4}|\d+\s*\/\s*\d+)/g;
  let m;
  while ((m = re.exec(html)) && rows.length < 40) {
    const name = normalizeWcPlayerName(m[1]);
    const odds = formatAmericanOddsFromRaw(m[2]);
    if (!name || !odds || isNationOnlyOutcome(name)) continue;
    const key = `${name}|${odds}`;
    if (seen.has(key)) continue;
    seen.add(key);
    rows.push({ name, americanOdds: odds });
  }

  return rows.length ? rows : fromJson;
}

/**
 * Book-specific Golden Boot parse entry (US generic + UK fractional + aggregator tables).
 * @param {string} html
 * @param {string} bookKey
 */
export function parseGoldenBootRowsForBook(html, bookKey) {
  const key = String(bookKey || "").toLowerCase();
  if (key === "oddschecker" || key === "covers") {
    return parseOddsCheckerGoldenBootRowsFromHtml(html);
  }
  if (key === "paddypower" || key === "bet365" || key === "williamhill") {
    return parseUkAggregatorGoldenBootRowsFromHtml(html);
  }
  let rows = parseGoldenBootRowsFromHtml(html);
  if (rows.length < 5 && html.trim().startsWith("{")) {
    try {
      rows = parseGoldenBootRowsFromJson(JSON.parse(html));
    } catch {
      /* ignore */
    }
  }
  return rows;
}

/**
 * @param {Record<string, unknown>} obj
 * @returns {"anytime_scorer" | "first_goalscorer" | "last_goalscorer" | null}
 */
function matchPropMarketFromLabel(obj) {
  const label = labelFromObject(obj);
  if (MATCH_FIRST_SCORER_LABEL.test(label)) return "first_goalscorer";
  if (MATCH_LAST_SCORER_LABEL.test(label)) return "last_goalscorer";
  if (MATCH_ANYTIME_SCORER_LABEL.test(label)) return "anytime_scorer";
  return null;
}

/**
 * @param {unknown} json
 * @param {{ homeTeam?: string, awayTeam?: string }} [filter]
 */
export function parseMatchPlayerPropRowsFromJson(json, filter = {}) {
  /** @type {Record<string, Array<{ name: string, americanOdds: string, nationAbbr?: string, market: string }>>} */
  const byMarket = {
    anytime_scorer: [],
    first_goalscorer: [],
    last_goalscorer: [],
  };
  const seen = new Set();

  const tryPush = (row, market) => {
    if (!row || !market) return;
    const key = `${market}|${row.name}|${row.americanOdds}`;
    if (seen.has(key)) return;
    seen.add(key);
    byMarket[market].push({ ...row, market });
  };

  const walkMarketNode = (node) => {
    if (!node || typeof node !== "object") return;
    const obj = /** @type {Record<string, unknown>} */ (node);
    const market = matchPropMarketFromLabel(obj);
    if (!market) return;

    const entries =
      obj.entries || obj.participants || obj.selections || obj.outcomes || obj.runners;
    if (!Array.isArray(entries)) return;

    for (const ent of entries) {
      const row = rowFromGenericEntry(ent);
      if (row) tryPush(row, market);
    }
  };

  if (typeof json === "object" && json) {
    walkMarketNode(json);
  }

  const arrays = collectCandidateArrays(json);
  for (const arr of arrays) {
    let marketish = 0;
    for (const item of arr) {
      if (item && typeof item === "object" && rowFromGenericEntry(item)) marketish += 1;
    }
    if (marketish < 3) continue;
    for (const item of arr) {
      const row = rowFromGenericEntry(item);
      if (!row) continue;
      const parentMarket = matchPropMarketFromLabel(
        typeof item === "object" && item ? /** @type {Record<string, unknown>} */ (item) : {},
      );
      tryPush(row, parentMarket || "anytime_scorer");
    }
  }

  for (const key of Object.keys(byMarket)) {
    byMarket[key] = filterMatchPropRowsForTeams(byMarket[key], filter).slice(0, 40);
  }

  return byMarket;
}

/**
 * @param {Array<{ name: string, americanOdds: string, nationAbbr?: string }>} rows
 * @param {{ homeTeam?: string, awayTeam?: string }} filter
 */
function filterMatchPropRowsForTeams(rows, filter) {
  const home = String(filter.homeTeam || "").toUpperCase().slice(0, 3);
  const away = String(filter.awayTeam || "").toUpperCase().slice(0, 3);
  if (!home && !away) return rows;
  const filtered = rows.filter((r) => {
    const abbr = String(r.nationAbbr || "").toUpperCase().slice(0, 3);
    return !abbr || abbr === home || abbr === away;
  });
  return filtered.length >= 3 ? filtered : rows;
}

/**
 * @param {string} html
 * @param {{ homeTeam?: string, awayTeam?: string }} [filter]
 */
export function parseMatchPlayerPropRowsFromHtml(html, filter = {}) {
  const fromJson = extractEmbeddedJsonBlobs(html).map((b) =>
    parseMatchPlayerPropRowsFromJson(b, filter),
  );

  /** @type {Record<string, Array<{ name: string, americanOdds: string, nationAbbr?: string, market: string }>>} */
  const merged = {
    anytime_scorer: [],
    first_goalscorer: [],
    last_goalscorer: [],
  };

  for (const block of fromJson) {
    for (const key of Object.keys(merged)) {
      merged[key].push(...(block[key] || []));
    }
  }

  const totalAnytime = merged.anytime_scorer.length;
  if (totalAnytime < 3) {
    const re =
      /([A-ZÀ-ÖØ-Þ][a-zà-öø-ÿ]+(?:['\s.-][A-ZÀ-ÖØ-Þ]?[a-zà-öø-ÿ]+)+)\s{0,24}(\+\d{3,5}|\-\d{2,4})/g;
    let m;
    while ((m = re.exec(html)) && merged.anytime_scorer.length < 30) {
      const name = normalizeWcPlayerName(m[1]);
      const odds = formatAmericanOddsFromRaw(m[2]);
      if (!name || !odds || isNationOnlyOutcome(name)) continue;
      merged.anytime_scorer.push({ name, americanOdds: odds, market: "anytime_scorer" });
    }
  }

  for (const key of Object.keys(merged)) {
    const seen = new Set();
    merged[key] = merged[key]
      .filter((r) => {
        const k = `${r.name}|${r.americanOdds}`;
        if (seen.has(k)) return false;
        seen.add(k);
        return true;
      })
      .slice(0, 40);
    merged[key] = filterMatchPropRowsForTeams(merged[key], filter);
  }

  return merged;
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
