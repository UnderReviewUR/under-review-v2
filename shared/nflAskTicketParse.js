/**
 * Parse stated NFL ticket legs without importing trim/hygiene (avoids cycles).
 */

const TEAM_WIN_RE =
  /\b([a-z][a-z .']{2,18}?)\s+(?:to\s+)?win\b|\b([a-z]{2,3})\s+(?:ml|moneyline)\b/gi;
const OU_RE = /\b([a-z][a-z0-9.'\s-]{1,28}?)\s+(over|under)\s+(\d+(?:\.\d+)?)\b/gi;

/**
 * @param {string} question
 */
export function parseNflStatedTicketLegs(question) {
  const q = String(question || "");
  /** @type {Array<Record<string, unknown>>} */
  const legs = [];
  const seen = new Set();

  const winRe = new RegExp(TEAM_WIN_RE.source, "gi");
  let m;
  while ((m = winRe.exec(q))) {
    const raw = String(m[1] || m[2] || "").trim();
    if (!raw || /^(to|the|a)$/i.test(raw)) continue;
    const key = `win:${raw.toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    legs.push({ kind: "win", raw, side: "ML" });
  }

  const ouRe = new RegExp(OU_RE.source, "gi");
  while ((m = ouRe.exec(q))) {
    const raw = String(m[1] || "").replace(/^(and|,)\s+/i, "").trim();
    const side = String(m[2] || "").toLowerCase() === "over" ? "Over" : "Under";
    const line = Number(m[3]);
    if (!raw || !Number.isFinite(line)) continue;
    if (/^(and|the|a|an|i)$/i.test(raw)) continue;
    const key = `ou:${raw.toLowerCase()}:${side}:${line}`;
    if (seen.has(key)) continue;
    seen.add(key);
    legs.push({ kind: "ou", raw, side, line });
  }

  return legs;
}

/**
 * @param {string} question
 */
export function isNflTicketReviewAsk(question) {
  const q = String(question || "").toLowerCase();
  const legs = parseNflStatedTicketLegs(q);
  if (legs.length < 2) return false;
  if (/\b(i\s+bet|i\s+took|i\s+have|i've\s+got|my\s+(?:bet|ticket|parlay|slip)|thoughts)\b/.test(q)) {
    return true;
  }
  return legs.filter((l) => l.kind === "ou").length >= 2;
}
