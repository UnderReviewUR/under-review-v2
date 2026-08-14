/**
 * When to skip live board hydrate on NFL Ask (latency).
 * Draft / futures / predictor questions do not need props scrapes.
 */

/**
 * @param {string} question
 */
export function shouldSkipNflLiveBoardForAsk(question) {
  const q = String(question || "").toLowerCase();
  if (!q.trim()) return false;

  if (
    /\b(mock\s+draft|draft\s+board|on the clock|draft capital|comp pick|war room|combine|prospect)\b/.test(
      q,
    ) ||
    (/\bdraft\b/.test(q) &&
      !/\b(prop|spread|total|over|under|yards|touchdown|td|sacks?|tackles?)\b/.test(q))
  ) {
    return true;
  }

  if (
    /\b(super\s*bowl|conference championship|afc championship|nfc championship)\b/.test(q) &&
    /\b(winner|outright|futures?|odds to win)\b/.test(q)
  ) {
    return true;
  }

  if (
    /\b(season\s+win\s+totals?|win\s+totals?|wins?\s+o\/?u|over\/under\s+wins?)\b/.test(q) ||
    /\b(mvp|opoy|dpoy|oroy|droy|come?back\s+player)\b/.test(q) ||
    /\b(predictor|playoff\s+bracket|seed(ing)?\b.*playoff|projected\s+wins)\b/.test(q)
  ) {
    return true;
  }

  return false;
}
