/**
 * NFL team abbreviations — never reuse the NBA/Odds map that turns Saints NO → NOP (Pelicans).
 */

const NFL_ABBR_CANON = {
  NOP: "NO", // BDL / shared NBA map sometimes stamps Saints as Pelicans
  NOLA: "NO",
  NWE: "NE",
  JAC: "JAX",
  ARZ: "ARI",
  WSH: "WAS",
  LA: "LAR",
  STL: "LAR",
  SD: "LAC",
  OAK: "LV",
};

/**
 * @param {unknown} raw
 * @returns {string}
 */
export function canonicalizeNflTeamAbbr(raw) {
  const cleaned = String(raw || "")
    .trim()
    .replace(/\./g, "")
    .toUpperCase();
  if (!cleaned) return "";
  return NFL_ABBR_CANON[cleaned] || cleaned;
}
