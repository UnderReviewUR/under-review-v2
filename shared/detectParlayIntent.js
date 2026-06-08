/** True when the user is asking for a multi-leg or same-game parlay ticket. */
export function detectParlayIntent(question) {
  const q = String(question || "").toLowerCase();
  return (
    /\bparlay\b/.test(q) ||
    /\bsgp\b/.test(q) ||
    /\bsame[- ]game\s+parlay\b/.test(q) ||
    /\b\d+\s*[-]?\s*leg\b/.test(q) ||
    (/\b(legs?|ticket)\b/.test(q) && /\b(parlay|sgp)\b/.test(q)) ||
    (/\b(parlay|sgp)\b/.test(q) && /\b(legs?|ticket)\b/.test(q))
  );
}
