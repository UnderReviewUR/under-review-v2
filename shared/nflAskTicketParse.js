/**
 * Parse stated NFL ticket legs without importing trim/hygiene (avoids cycles).
 */

const TEAM_WIN_RE =
  /\b([a-z][a-z .']{2,18}?)\s+(?:to\s+)?win\b|\b([a-z]{2,3})\s+(?:ml|moneyline)\b/gi;
const OU_RE = /\b([a-z][a-z0-9.'\s-]{1,28}?)\s+(over|under)\s+(\d+(?:\.\d+)?)\b/gi;

// Legs joined by "and" instead of commas capture the whole clause, so
// "seahawks win and darnold under 249.5" yields the name "seahawks win and
// darnold". Keep only the trailing clause and drop the slip's framing words.
const LEG_CLAUSE_SPLIT_RE =
  /\b(?:and|with|plus|also|then|wins?|ml|moneyline|bets?|took|take|have|had|got|likes?|liked|played|thoughts|parlay|ticket|slip)\b/i;
const LEG_HEAD_NOISE_RE = /^(?:i|my|the|a|an|for|on|of|to|at|in|is|it|game|tonights?|tonight)\b\s*/i;

/**
 * @param {unknown} raw
 */
function cleanLegName(raw) {
  let s = String(raw || "")
    .replace(/[^a-z0-9.'\s-]/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
  const parts = s.split(LEG_CLAUSE_SPLIT_RE);
  s = String(parts[parts.length - 1] || "").trim();
  let prev = "";
  while (s && s !== prev) {
    prev = s;
    s = s.replace(LEG_HEAD_NOISE_RE, "").trim();
  }
  return s.split(" ").filter(Boolean).slice(-3).join(" ");
}

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
    const raw = cleanLegName(m[1] || m[2]);
    if (!raw || /^(to|the|a)$/i.test(raw)) continue;
    const key = `win:${raw.toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    legs.push({ kind: "win", raw, side: "ML" });
  }

  const ouRe = new RegExp(OU_RE.source, "gi");
  while ((m = ouRe.exec(q))) {
    const raw = cleanLegName(m[1]);
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
