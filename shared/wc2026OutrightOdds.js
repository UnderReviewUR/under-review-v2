/**
 * World Cup outright odds display + merge (KV live → static cold-start → em dash).
 */

import { formatOddsAmerican } from "./formatOddsAmerican.js";

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
  if (live != null && String(live).trim()) return String(live).trim();

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
    const live = key ? kvOutrights?.[key] : null;
    const hasLive = live != null && String(live).trim();
    const hasStatic = t.outrightOdds != null && String(t.outrightOdds).trim();

    return {
      ...t,
      outrightOdds: resolveWcOutrightOdds(t.abbreviation, kvOutrights, t.outrightOdds),
      outrightOddsSource: hasLive ? "kv" : hasStatic ? "static" : "none",
    };
  });
}
