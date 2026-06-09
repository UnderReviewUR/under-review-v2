/** True when the user is asking for a specific player prop line (not series/futures). */
export function detectNbaPlayerPropIntent(question) {
  const q = String(question || "").toLowerCase().trim();
  if (!q) return false;

  if (
    /\b(over|under|o\/u)\s+\d+(\.\d+)?\s*(points?|pts|rebounds?|rebs?|assists?|asts?|threes?|3s|blocks?|steals?)\b/.test(
      q,
    )
  ) {
    return true;
  }
  if (
    /\b\d+(\.\d+)?\s*(points?|pts|rebounds?|rebs?|assists?|asts?)\s+(over|under)\b/.test(q)
  ) {
    return true;
  }
  if (/\b(player\s+)?prop\b/.test(q) && /\b(over|under|o\/u)\b/.test(q)) {
    return true;
  }
  if (
    /\b(over|under)\s+\d+(\.\d+)?\b/.test(q) &&
    /\b(rebounds?|points?|assists?|pts|rebs?|asts?)\b/.test(q)
  ) {
    return true;
  }
  return false;
}
