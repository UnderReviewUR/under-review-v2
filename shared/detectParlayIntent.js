/** True when the user is asking for a multi-leg or same-game parlay ticket. */
export function detectParlayIntent(question) {
  const q = String(question || "").toLowerCase();
  return (
    /\bparlays?\b/.test(q) ||
    /\bsgp\b/.test(q) ||
    /\bsame[- ]game\s+parlay\b/.test(q) ||
    /\b\d+\s*[-]?\s*leg\b/.test(q) ||
    /\b\d+\s*player\s*parlay\b/.test(q) ||
    /\bplayer\s*parlay\b/.test(q) ||
    (/\b(legs?|ticket)\b/.test(q) && /\b(parlay|sgp)s?\b/.test(q)) ||
    (/\b(parlay|sgp)s?\b/.test(q) && /\b(legs?|ticket)\b/.test(q))
  );
}

/**
 * Requested parlay leg count when the user names one (2–5); null when unspecified.
 * @param {string} question
 */
export function extractParlayLegCount(question) {
  const q = String(question || "").toLowerCase();
  const m =
    q.match(/\b(\d+)\s*(?:[- ]?leg(?:ged)?|player)\s*parlays?\b/) ||
    q.match(/\bparlay\s*(?:with|of)\s*(\d+)\s*(?:legs?|players?)\b/) ||
    q.match(/\brank(?:\s+the)?\s+best\s+(\d+)\s+player\s+parlays?\b/) ||
    q.match(/\btop\s+(\d+)\s+player\s+parlays?\b/) ||
    q.match(/\b(\d+)\s*[- ]?leg(?:ged)?\b/);
  if (!m) return null;
  const n = Number.parseInt(m[1], 10);
  if (!Number.isFinite(n)) return null;
  return Math.min(5, Math.max(2, n));
}
