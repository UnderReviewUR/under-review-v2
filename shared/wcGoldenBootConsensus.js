/**
 * Golden Boot consensus merge across ESPN + book scrapes (median implied probability).
 */

import { WC_2026_TEAMS } from "../src/data/wc2026Teams.js";
import { normalizeWcPlayerName } from "./wcPlayerRegistry.js";
import {
  hasValidWcGoldenBootNation,
  isCrossSportGolferName,
} from "./wcGoldenBootRowGuard.js";

/** @type {Set<string>} */
const TEAM_ABBRS = new Set(WC_2026_TEAMS.map((t) => String(t.abbreviation).toUpperCase()));

/** @type {Set<string>} */
const TEAM_NAMES = new Set(
  WC_2026_TEAMS.flatMap((t) => [
    String(t.name || "").toLowerCase(),
    String(t.shortName || "").toLowerCase(),
    String(t.abbreviation || "").toLowerCase(),
  ]).filter(Boolean),
);

const BOOK_PRIORITY = ["draftkings", "fanduel", "betmgm", "espn", "paddypower", "bet365", "williamhill", "oddschecker", "covers"];

/**
 * @param {string} raw
 */
export function parseAmericanOddsNumber(raw) {
  const s = String(raw || "").trim().replace(/,/g, "");
  const m = s.match(/^([+-]?)(\d+)/);
  if (!m) return null;
  const sign = m[1] === "-" ? -1 : 1;
  const n = Number(m[2]);
  if (!Number.isFinite(n) || n <= 0) return null;
  return sign * n;
}

/**
 * @param {number} american
 */
export function formatAmericanOdds(american) {
  const n = Number(american);
  if (!Number.isFinite(n)) return null;
  return n > 0 ? `+${Math.round(n)}` : String(Math.round(n));
}

/**
 * @param {number} american
 */
export function impliedProbFromAmerican(american) {
  const n = Number(american);
  if (!Number.isFinite(n) || n === 0) return null;
  if (n > 0) return 100 / (n + 100);
  return Math.abs(n) / (Math.abs(n) + 100);
}

/**
 * @param {number} prob
 */
export function americanFromImpliedProb(prob) {
  const p = Number(prob);
  if (!Number.isFinite(p) || p <= 0 || p >= 1) return null;
  if (p >= 0.5) return Math.round(-100 * (p / (1 - p)));
  return Math.round(100 * ((1 - p) / p));
}

/**
 * @param {string} name
 */
export function playerConsensusKey(name, nationAbbr) {
  const n = normalizeWcPlayerName(name).toLowerCase();
  const team = nationAbbr ? String(nationAbbr).toUpperCase() : "";
  return team ? `${team}|${n}` : n;
}

/**
 * @param {string} name
 */
export function isNationOnlyOutcome(name) {
  const normalized = normalizeWcPlayerName(name);
  const upper = normalized.toUpperCase();
  if (TEAM_ABBRS.has(upper)) return true;
  const lower = normalized.toLowerCase();
  if (TEAM_NAMES.has(lower)) return true;
  for (const nation of TEAM_NAMES) {
    if (nation.length >= 4 && (lower === nation || lower.startsWith(`${nation} `))) return true;
  }
  return false;
}

/**
 * @typedef {object} BookGoldenBootResult
 * @property {string} book
 * @property {boolean} ok
 * @property {Array<{ name: string, americanOdds: string, nationAbbr?: string }>} rows
 * @property {string} [error]
 */

/**
 * @param {Array<BookGoldenBootResult | { book: string, ok: boolean, rows?: Array<{ name: string, americanOdds: string, nationAbbr?: string }>, error?: string }>} bookResults
 * @param {Array<{ name: string, americanOdds: string, nationAbbr?: string, espnAthleteId?: string, impliedRank?: number }>} [espnRows]
 */
export function mergeGoldenBootConsensus(bookResults, espnRows = []) {
  /** @type {Map<string, { name: string, nationAbbr?: string, espnAthleteId?: string, bookOdds: Record<string, string>, probs: number[] }>} */
  const groups = new Map();

  const ingest = (book, rows) => {
    for (const row of rows || []) {
      const name = normalizeWcPlayerName(row.name);
      const odds = String(row.americanOdds || "").trim();
      if (!name || !odds || isNationOnlyOutcome(name)) continue;
      if (isCrossSportGolferName(name)) continue;
      if (!hasValidWcGoldenBootNation(row.nationAbbr)) continue;

      const american = parseAmericanOddsNumber(odds);
      const prob = american != null ? impliedProbFromAmerican(american) : null;
      if (prob == null) continue;

      const key = playerConsensusKey(name, row.nationAbbr);
      const existing = groups.get(key) || {
        name,
        nationAbbr: row.nationAbbr,
        espnAthleteId: row.espnAthleteId,
        bookOdds: {},
        probs: [],
      };
      existing.bookOdds[book] = odds;
      existing.probs.push(prob);
      if (row.nationAbbr && !existing.nationAbbr) existing.nationAbbr = row.nationAbbr;
      if (row.espnAthleteId && !existing.espnAthleteId) existing.espnAthleteId = row.espnAthleteId;
      groups.set(key, existing);
    }
  };

  if (espnRows.length) ingest("espn", espnRows);
  for (const res of bookResults || []) {
    if (!res?.ok || !res.rows?.length) continue;
    ingest(res.book, res.rows);
  }

  /** @type {Array<{ name: string, nationAbbr?: string, espnAthleteId?: string, americanOdds: string, bookOdds: Record<string, string>, impliedRank: number }>} */
  const merged = [];

  for (const g of groups.values()) {
    const sortedProbs = [...g.probs].sort((a, b) => a - b);
    const mid = sortedProbs[Math.floor(sortedProbs.length / 2)];
    let consensusAmerican = americanFromImpliedProb(mid);

    if (consensusAmerican == null) {
      for (const bk of BOOK_PRIORITY) {
        if (g.bookOdds[bk]) {
          consensusAmerican = parseAmericanOddsNumber(g.bookOdds[bk]);
          if (consensusAmerican != null) break;
        }
      }
    }

    const formatted = formatAmericanOdds(consensusAmerican);
    if (!formatted) continue;

    merged.push({
      name: g.name,
      nationAbbr: g.nationAbbr,
      espnAthleteId: g.espnAthleteId,
      americanOdds: formatted,
      bookOdds: g.bookOdds,
      impliedRank: 0,
    });
  }

  merged.sort((a, b) => {
    const pa = impliedProbFromAmerican(parseAmericanOddsNumber(a.americanOdds) || 0) || 0;
    const pb = impliedProbFromAmerican(parseAmericanOddsNumber(b.americanOdds) || 0) || 0;
    return pb - pa;
  });

  merged.forEach((r, i) => {
    r.impliedRank = i + 1;
  });

  const booksUsed = [
    ...new Set(
      (bookResults || [])
        .filter((r) => r.ok && r.rows?.length)
        .map((r) => r.book),
    ),
  ];
  if (espnRows.length) booksUsed.unshift("espn");

  return {
    rows: merged,
    booksUsed: [...new Set(booksUsed)],
    market: "golden_boot",
  };
}

/**
 * Apply seed rows when live merge is thin.
 * @param {Array<{ name: string, americanOdds: string, nationAbbr?: string, impliedRank?: number }>} rows
 * @param {Array<{ name: string, americanOdds: string, nationAbbr?: string, impliedRank?: number }>} seedRows
 */
export function mergeGoldenBootWithSeed(rows, seedRows) {
  const out = [...(rows || [])];
  const seen = new Set(out.map((r) => playerConsensusKey(r.name, r.nationAbbr)));

  for (const s of seedRows || []) {
    const key = playerConsensusKey(s.name, s.nationAbbr);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({
      name: s.name,
      americanOdds: s.americanOdds,
      nationAbbr: s.nationAbbr,
      bookOdds: { seed: s.americanOdds },
      impliedRank: s.impliedRank || out.length + 1,
    });
  }

  return out
    .sort((a, b) => (a.impliedRank || 999) - (b.impliedRank || 999))
    .map((r, i) => ({ ...r, impliedRank: i + 1 }));
}
