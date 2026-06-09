/**
 * World Cup outright odds display + merge (KV live → static cold-start → em dash).
 */

import { formatOddsAmerican, parseAmericanOddsValue } from "./formatOddsAmerican.js";

/** Tournament winner market — always positive American (group-winner ML often negative). */
export function isPlausibleWcTournamentWinnerOdds(odds) {
  const n = parseAmericanOddsValue(odds);
  return n != null && n >= 100;
}

/**
 * Drop group-winner / match ML lines that leaked into outrights KV.
 * @param {Record<string, string> | null | undefined} map
 */
export function sanitizeWcTournamentWinnerOutrights(map) {
  /** @type {Record<string, string>} */
  const out = {};
  for (const [abbr, odds] of Object.entries(map || {})) {
    const team = String(abbr || "").trim().toUpperCase();
    const line = String(odds || "").trim();
    if (team && line && isPlausibleWcTournamentWinnerOdds(line)) {
      out[team] = line;
    }
  }
  return out;
}

/**
 * @param {string | null | undefined} value
 * @returns {string}
 */
export function formatWcOutrightOdds(value) {
  return formatOddsAmerican(value);
}

/**
 * @param {string} abbr
 * @param {Record<string, string> | null | undefined} kvOutrights
 * @param {string | null | undefined} staticOutright
 * @returns {string | null}
 */
export function resolveWcOutrightOdds(abbr, kvOutrights, staticOutright) {
  const key = String(abbr || "")
    .trim()
    .toUpperCase();
  if (!key) return null;

  const live = kvOutrights?.[key];
  if (live != null && String(live).trim() && isPlausibleWcTournamentWinnerOdds(live)) {
    return String(live).trim();
  }

  if (staticOutright != null && String(staticOutright).trim()) {
    return String(staticOutright).trim();
  }

  return null;
}

/**
 * @param {Array<{ abbreviation?: string, outrightOdds?: string | null }>} teams
 * @param {Record<string, string> | null | undefined} kvOutrights
 */
export function mergeWcTeamsWithOutrights(teams, kvOutrights) {
  return (teams || []).map((t) => {
    const key = String(t.abbreviation || "")
      .trim()
      .toUpperCase();
    const liveRaw = key ? kvOutrights?.[key] : null;
    const live =
      liveRaw != null && String(liveRaw).trim() && isPlausibleWcTournamentWinnerOdds(liveRaw)
        ? String(liveRaw).trim()
        : null;
    const hasLive = Boolean(live);
    const hasStatic = t.outrightOdds != null && String(t.outrightOdds).trim();

    return {
      ...t,
      outrightOdds: resolveWcOutrightOdds(t.abbreviation, kvOutrights, t.outrightOdds),
      outrightOddsSource: hasLive ? "kv" : hasStatic ? "static" : "none",
    };
  });
}
