/**
 * Classify ESPN NFL injury shortComment → preseason/game participation.
 * Status is often "Active" even when the note says they will not play.
 */

/**
 * @param {string} comment
 * @returns {'play'|'sit'|'limited'|'unknown'}
 */
export function classifyNflParticipationComment(comment) {
  const c = String(comment || "").toLowerCase();
  if (!c.trim()) return "unknown";
  if (
    /\bnot expected to play\b|\bwon'?t play\b|\bwill not play\b|\bdoesn'?t expect\b.{0,40}\bto play\b|\bheld out\b|\bwill sit\b|\brest(?:ing|ed)\b/.test(
      c,
    )
  ) {
    return "sit";
  }
  if (/\bone or two drives\b|\bone series\b|\ba series or two\b|\blimited snaps\b/.test(c)) {
    return "limited";
  }
  if (
    /\bscheduled to play\b|\bwill play\b|\bwill start\b|\bslated to (?:suit up|play|start)\b|\bfirst-team offense will play\b/.test(
      c,
    )
  ) {
    return "play";
  }
  return "unknown";
}

/**
 * @param {string} name
 * @param {string} hay
 */
export function nflAvailabilityNameMatch(name, hay) {
  const n = String(name || "").trim().toLowerCase();
  const h = String(hay || "").trim().toLowerCase();
  if (!n || !h) return false;
  if (h.includes(n)) return true;
  const last = n.split(/\s+/).pop();
  return last && last.length >= 4 && new RegExp(`\\b${last}\\b`, "i").test(h);
}
