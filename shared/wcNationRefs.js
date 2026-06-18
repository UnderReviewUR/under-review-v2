/**
 * Nation reference extraction from user text (demonyms + FIFA abbrs).
 */

import { WC_NATION_DEMONYMS } from "./wcNationDemonyms.js";
import { logWcPropsRoute } from "./wcPropsRouteLog.js";

/** Bare country names — require co-signal or vs. */
export const WC_NATION_COLLISION_TOKENS = new Set([
  "panama",
  "jordan",
  "mexico",
  "georgia",
]);

/** Geography / non-match context — suppress nation hits. */
export const WC_NATION_GEO_EXCLUSION_RE =
  /\b(canal|city|province|region|strait|gulf|border|embassy|airport|treaty|invasion|economy|oil|trade)\b/i;

/** Soccer-context co-signal for bare collision names. */
export const WC_NATION_COSIGNAL_RE =
  /\b(props?|parlays?|sgp|scorer|goalscorer|shots?|assists?|match|game|fixture|matchup|vs\.?|versus|national\s+team|team\b|lineups?|odds|bet|lean|over|under|total|totals)\b/i;

export const WC_THE_NATION_MATCH_RE =
  /\bthe\s+[a-z\u00C0-\u024F' -]{2,32}\s+(match|game|fixture|matchup)\b/i;

/**
 * @param {string} text
 * @returns {string[]}
 */
export function extractWcNationRefs(text) {
  const q = String(text || "").trim();
  if (!q) return [];

  const hasCoSignal =
    WC_NATION_COSIGNAL_RE.test(q) || WC_THE_NATION_MATCH_RE.test(q);
  const hasGeoExclusion = WC_NATION_GEO_EXCLUSION_RE.test(q);
  const hasVs = /\bvs\.?\b|\bversus\b/i.test(q);

  /** @type {Set<string>} */
  const hits = new Set();

  for (const [abbr, tokens] of Object.entries(WC_NATION_DEMONYMS)) {
    for (const tok of tokens) {
      const re = new RegExp(`\\b${tok.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i");
      if (!re.test(q)) continue;

      const isCollision = WC_NATION_COLLISION_TOKENS.has(tok.toLowerCase());
      if (isCollision) {
        if (hasGeoExclusion && !hasVs) {
          logWcPropsRoute("nation_ref_geo_excluded", { text: q, token: tok, abbr });
          continue;
        }
        if (!hasCoSignal && !hasVs) {
          logWcPropsRoute("nation_ref_no_cosignal", { text: q, token: tok, abbr });
          continue;
        }
      } else if (hasGeoExclusion && !hasCoSignal && !hasVs) {
        logWcPropsRoute("nation_ref_geo_excluded", { text: q, token: tok, abbr });
        continue;
      }
      hits.add(abbr);
    }
  }

  for (const m of q.matchAll(/\b([A-Z]{3})\b/g)) {
    const abbr = String(m[1] || "").toUpperCase();
    if (WC_NATION_DEMONYMS[abbr]) hits.add(abbr);
  }
  if (/\bUS\b/.test(q) && (hasCoSignal || hasVs)) hits.add("USA");

  return [...hits];
}
