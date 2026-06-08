/**
 * Map scraped team labels → WC 2026 abbreviations.
 */

import { WC_2026_TEAMS } from "../src/data/wc2026Teams.js";

/** @type {Record<string, string>} */
const EXTRA_ALIASES = {
  usa: "USA",
  us: "USA",
  "united states": "USA",
  turkey: "TUR",
  turkiye: "TUR",
  "dr congo": "COD",
  "congo dr": "COD",
  "democratic republic of congo": "COD",
  "ivory coast": "CIV",
  "cote divoire": "CIV",
  "bosnia herzegovina": "BIH",
  "czech republic": "CZE",
  "korea republic": "KOR",
  "south korea": "KOR",
  "saudi arabia": "KSA",
  "cape verde": "CPV",
  "new zealand": "NZL",
  "south africa": "RSA",
};

/**
 * @param {string} s
 */
export function normalizeWcTeamName(s) {
  return String(s || "")
    .toLowerCase()
    .trim()
    .replace(/&amp;/g, "and")
    .replace(/&#039;/g, "'")
    .replace(/[^a-z0-9\s']/g, "")
    .replace(/\s+/g, " ");
}

/** @type {Map<string, string>} */
const NAME_TO_ABBR = new Map(
  WC_2026_TEAMS.flatMap((t) => {
    const abbr = String(t.abbreviation).toUpperCase();
    return [
      [normalizeWcTeamName(t.name), abbr],
      [normalizeWcTeamName(t.shortName), abbr],
    ];
  }),
);

for (const [alias, abbr] of Object.entries(EXTRA_ALIASES)) {
  NAME_TO_ABBR.set(alias, abbr);
}

/**
 * @param {string} name
 */
export function abbrForWcTeamName(name) {
  const key = normalizeWcTeamName(name);
  if (!key) return null;
  if (NAME_TO_ABBR.has(key)) return NAME_TO_ABBR.get(key);
  for (const [n, abbr] of NAME_TO_ABBR) {
    if (key.includes(n) || n.includes(key)) return abbr;
  }
  return null;
}
