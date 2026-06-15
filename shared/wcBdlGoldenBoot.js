/**
 * BallDontLie GOAT — player futures rows that map to Golden Boot / top scorer markets.
 * BDL may expose these under varying market_type strings; team outright futures are excluded.
 */

import { parseAmericanOddsValue } from "./formatOddsAmerican.js";

const GOLDEN_BOOT_MARKET_RE =
  /golden.?boot|top.?scorer|top.?goal|goalscorer|most.?goal|player.*goal/i;

/**
 * @param {string} marketType
 */
export function isBdlGoldenBootMarketType(marketType) {
  const mt = String(marketType || "").trim();
  if (!mt) return false;
  return GOLDEN_BOOT_MARKET_RE.test(mt);
}

/**
 * @param {Record<string, unknown>} subject
 */
function playerNameFromBdlSubject(subject) {
  if (!subject || typeof subject !== "object") return null;
  const first = String(subject.first_name || subject.firstName || "").trim();
  const last = String(subject.last_name || subject.lastName || "").trim();
  const full = [first, last].filter(Boolean).join(" ").trim();
  if (full) return full;
  const name = String(subject.name || subject.display_name || subject.full_name || "").trim();
  return name || null;
}

/**
 * @param {Record<string, unknown>} subject
 */
function nationFromBdlSubject(subject) {
  if (!subject || typeof subject !== "object") return null;
  const team = subject.team && typeof subject.team === "object" ? subject.team : subject;
  const abbr = String(
    team.abbreviation || team.abbr || team.country_code || team.code || "",
  )
    .trim()
    .toUpperCase();
  return abbr || null;
}

/**
 * @param {Array<Record<string, unknown>>} rawRows
 * @param {Record<string, string>} [playerNationByName] — lowercased name → nation abbr
 */
export function extractBdlGoldenBootRowsFromFutures(rawRows, playerNationByName = {}) {
  /** @type {Map<string, { name: string, americanOdds: string, nationAbbr?: string, vendor: string, bookOdds: Record<string, string> }>} */
  const byPlayer = new Map();

  for (const row of rawRows || []) {
    if (!row || typeof row !== "object") continue;
    const marketType = String(row.market_type || "").trim();
    if (!isBdlGoldenBootMarketType(marketType)) continue;

    const subject = row.subject && typeof row.subject === "object" ? row.subject : {};
    const name = playerNameFromBdlSubject(subject);
    if (!name) continue;

    const american = parseAmericanOddsValue(row.american_odds ?? row.americanOdds);
    if (american == null) continue;

    const vendor = String(row.vendor || "balldontlie").trim().toLowerCase();
    const americanDisplay = american > 0 ? `+${american}` : String(american);
    const key = name.toLowerCase();
    const nationAbbr =
      nationFromBdlSubject(subject) || playerNationByName[key] || undefined;

    const existing = byPlayer.get(key);
    if (!existing) {
      byPlayer.set(key, {
        name,
        americanOdds: americanDisplay,
        nationAbbr,
        vendor,
        bookOdds: { [vendor]: americanDisplay },
      });
      continue;
    }
    existing.bookOdds[vendor] = americanDisplay;
    if (vendor === "draftkings" || (vendor === "fanduel" && !existing.bookOdds.draftkings)) {
      existing.americanOdds = americanDisplay;
      existing.vendor = vendor;
    }
    if (!existing.nationAbbr && nationAbbr) existing.nationAbbr = nationAbbr;
  }

  return [...byPlayer.values()].sort((a, b) => {
    const pa = parseAmericanOddsValue(a.americanOdds) ?? 99999;
    const pb = parseAmericanOddsValue(b.americanOdds) ?? 99999;
    return pa - pb;
  });
}
