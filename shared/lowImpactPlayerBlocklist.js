/**
 * Central blocklist — low-impact names excluded from structural vacancy narratives (all sports).
 * Add names here once; ingestion + QA + preview filters import this list.
 */
export const LOW_IMPACT_PLAYER_BLOCKLIST = [
  "Bismack Biyombo",
  "Biyombo",
  "David Jones",
];

let _blocklistRe = null;

function blocklistPattern() {
  if (!_blocklistRe) {
    _blocklistRe = new RegExp(
      LOW_IMPACT_PLAYER_BLOCKLIST.map((n) =>
        String(n)
          .trim()
          .replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
      ).join("|"),
      "i",
    );
  }
  return _blocklistRe;
}

/**
 * @param {string} name
 */
export function isLowImpactBlocklisted(name) {
  const n = String(name || "").trim();
  if (!n) return false;
  return blocklistPattern().test(n);
}
