/**
 * Resolve FIFA nation for scraped Golden Boot rows missing nationAbbr.
 */

import { buildWcFullSquadBioIndex } from "./wcPlayerBio.js";
import { normalizeWcPlayerName, playerRegistryKey } from "./wcPlayerRegistry.js";
import { hasValidWcGoldenBootNation } from "./wcGoldenBootRowGuard.js";

/**
 * @param {string} name
 * @param {Map<string, { nationAbbr: string }>} [byKey]
 */
export function resolveWcPlayerNationAbbr(name, byKey) {
  const index = byKey || buildWcFullSquadBioIndex().byKey;
  const normalized = normalizeWcPlayerName(name).toLowerCase();

  for (const [key, bio] of index) {
    const nameKey = key.split("|")[1] || "";
    if (nameKey === normalized) return bio.nationAbbr;
    if (nameKey.endsWith(` ${normalized.split(" ").pop()}`)) return bio.nationAbbr;
  }

  const last = normalized.split(" ").pop() || "";
  if (last.length < 4) return null;

  /** @type {Map<string, number>} */
  const counts = new Map();
  for (const [key, bio] of index) {
    const nameKey = key.split("|")[1] || "";
    if (!nameKey.includes(last)) continue;
    counts.set(bio.nationAbbr, (counts.get(bio.nationAbbr) || 0) + 1);
  }
  const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1]);
  return sorted.length === 1 ? sorted[0][0] : null;
}

/**
 * @param {Array<{ name: string, americanOdds: string, nationAbbr?: string }>} rows
 */
export function enrichGoldenBootRowsWithNation(rows) {
  const index = buildWcFullSquadBioIndex().byKey;
  return (rows || []).map((row) => {
    const name = normalizeWcPlayerName(row.name);
    if (!name) return row;
    let nationAbbr = row.nationAbbr ? String(row.nationAbbr).toUpperCase() : null;
    if (!hasValidWcGoldenBootNation(nationAbbr)) {
      for (const abbr of ["ESP", "FRA", "ENG", "BRA", "ARG", "GER", "POR", "NED", "NOR"]) {
        const key = playerRegistryKey(name, abbr);
        if (index.has(key)) {
          nationAbbr = abbr;
          break;
        }
      }
    }
    if (!hasValidWcGoldenBootNation(nationAbbr)) {
      nationAbbr = resolveWcPlayerNationAbbr(name, index);
    }
    return nationAbbr ? { ...row, nationAbbr } : row;
  });
}
