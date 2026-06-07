/**
 * Extract per-book h2h lines from Odds API events (TNNS-style market comparison).
 */

import {
  americanFromImpliedProb,
  formatAmericanOdds,
  impliedProbFromAmerican,
  parseAmericanOddsNumber,
} from "./wcGoldenBootConsensus.js";

export const PREFERRED_ODDS_API_BOOKS = ["draftkings", "fanduel", "betmgm", "caesars"];

/** @type {Record<string, string>} */
export const ODDS_API_BOOK_LABELS = {
  draftkings: "DraftKings",
  fanduel: "FanDuel",
  betmgm: "BetMGM",
  caesars: "Caesars",
  williamhill_us: "Caesars",
  pointsbetus: "PointsBet",
  espnbet: "ESPN BET",
  espn: "ESPN",
};

/**
 * @param {string | null | undefined} key
 */
export function oddsApiBookLabel(key) {
  const k = String(key || "").trim().toLowerCase();
  if (!k) return "Book";
  return ODDS_API_BOOK_LABELS[k] || k.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function normalizeTeamName(s) {
  return String(s || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, " ");
}

/**
 * @param {string} a
 * @param {string} b
 */
export function teamNamesMatch(a, b) {
  const na = normalizeTeamName(a);
  const nb = normalizeTeamName(b);
  if (!na || !nb) return false;
  if (na === nb) return true;
  if (na.includes(nb) || nb.includes(na)) return true;
  const lastA = na.split(" ").pop() || "";
  const lastB = nb.split(" ").pop() || "";
  return lastA.length >= 4 && lastA === lastB;
}

/**
 * @param {unknown} book
 * @param {string} homeName
 * @param {string} awayName
 */
export function extractH2hFromBook(book, homeName, awayName) {
  const market = (book?.markets || []).find((m) => m?.key === "h2h");
  if (!market?.outcomes?.length) return null;

  /** @type {Record<string, number | null>} */
  const byName = {};
  for (const outcome of market.outcomes) {
    const name = String(outcome?.name || "").trim();
    const price = Number(outcome?.price);
    if (!name || !Number.isFinite(price) || price === 0) continue;
    byName[name] = price;
  }

  let home = null;
  let away = null;
  let draw = null;

  for (const [name, price] of Object.entries(byName)) {
    if (/^draw$/i.test(name)) {
      draw = price;
      continue;
    }
    if (teamNamesMatch(name, homeName)) home = price;
    else if (teamNamesMatch(name, awayName)) away = price;
  }

  if (home == null && away == null) return null;

  return {
    home: home != null ? formatAmericanOdds(home) : null,
    away: away != null ? formatAmericanOdds(away) : null,
    draw: draw != null ? formatAmericanOdds(draw) : null,
  };
}

/**
 * Median implied probability → consensus American.
 * @param {(number | null | undefined)[]} americans
 */
export function medianAmericanFromBooks(americans) {
  const probs = americans
    .map((a) => {
      const n = typeof a === "number" ? a : parseAmericanOddsNumber(a);
      return n != null ? impliedProbFromAmerican(n) : null;
    })
    .filter((p) => p != null);

  if (!probs.length) return null;
  const sorted = [...probs].sort((a, b) => a - b);
  const mid = sorted[Math.floor(sorted.length / 2)];
  return formatAmericanOdds(americanFromImpliedProb(mid));
}

/**
 * @param {Record<string, unknown>} event
 * @param {{ maxBooks?: number }} [opts]
 */
export function extractMultiBookOddsFromEvent(event, opts = {}) {
  const homeName = String(event?.home_team || "").trim();
  const awayName = String(event?.away_team || "").trim();
  if (!homeName || !awayName) return null;

  const maxBooks = opts.maxBooks ?? PREFERRED_ODDS_API_BOOKS.length;
  /** @type {Array<{ key: string, label: string, home: string | null, away: string | null, draw: string | null }>} */
  const books = [];

  const bookmakers = Array.isArray(event?.bookmakers) ? event.bookmakers : [];
  for (const pref of PREFERRED_ODDS_API_BOOKS) {
    if (books.length >= maxBooks) break;
    const book = bookmakers.find((b) => b?.key === pref);
    if (!book) continue;
    const lines = extractH2hFromBook(book, homeName, awayName);
    if (!lines || (!lines.home && !lines.away)) continue;
    books.push({
      key: pref,
      label: oddsApiBookLabel(pref),
      home: lines.home,
      away: lines.away,
      draw: lines.draw,
    });
  }

  if (!books.length) return null;

  const hasDraw = books.some((b) => b.draw);
  const marketAverage = {
    home: medianAmericanFromBooks(books.map((b) => b.home)),
    away: medianAmericanFromBooks(books.map((b) => b.away)),
    draw: hasDraw ? medianAmericanFromBooks(books.map((b) => b.draw)) : null,
  };

  return {
    eventId: event?.id || null,
    homeName,
    awayName,
    books,
    marketAverage,
    hasDraw,
  };
}

/**
 * @param {Array<Record<string, unknown>>} events
 * @param {string} homeName
 * @param {string} awayName
 */
export function findOddsApiEventByTeams(events, homeName, awayName) {
  if (!Array.isArray(events) || !homeName || !awayName) return null;
  for (const ev of events) {
    const h = String(ev?.home_team || "").trim();
    const a = String(ev?.away_team || "").trim();
    if (
      (teamNamesMatch(h, homeName) && teamNamesMatch(a, awayName)) ||
      (teamNamesMatch(h, awayName) && teamNamesMatch(a, homeName))
    ) {
      return ev;
    }
  }
  return null;
}
