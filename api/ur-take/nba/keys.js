/** Minimal normalization for matching Odds API outcome names to roster/stats names. */
export function normalizeNbaMarketPlayerKey(name) {
  return String(name || "")
    .trim()
    .toLowerCase()
    .replace(/\./g, "")
    .replace(/\s+/g, " ");
}
