/**
 * Forgiving NFL Ask parse — typos, mashed words, messy “best props / best bets”.
 */

const SKIP_FUZZY = new Set([
  "about",
  "and",
  "are",
  "best",
  "bet",
  "bets",
  "for",
  "game",
  "give",
  "good",
  "line",
  "lines",
  "over",
  "play",
  "player",
  "plays",
  "prop",
  "props",
  "should",
  "the",
  "this",
  "tonight",
  "under",
  "what",
  "which",
  "with",
  "week",
]);

/** Nicknames only — long enough to fuzzy-match without eating “pats”. */
const NFL_FUZZY_NICKNAMES = [
  "seahawks",
  "patriots",
  "cowboys",
  "eagles",
  "chiefs",
  "steelers",
  "packers",
  "ravens",
  "bengals",
  "browns",
  "titans",
  "texans",
  "colts",
  "jaguars",
  "broncos",
  "chargers",
  "raiders",
  "commanders",
  "dolphins",
  "bills",
  "jets",
  "giants",
  "saints",
  "falcons",
  "panthers",
  "buccaneers",
  "vikings",
  "bears",
  "lions",
  "cardinals",
  "niners",
  "49ers",
];

/**
 * @param {string} a
 * @param {string} b
 */
export function nflAskLevenshtein(a, b) {
  const s = String(a || "");
  const t = String(b || "");
  if (s === t) return 0;
  const m = s.length;
  const n = t.length;
  if (!m) return n;
  if (!n) return m;
  /** @type {number[]} */
  let prev = Array.from({ length: n + 1 }, (_, i) => i);
  for (let i = 1; i <= m; i++) {
    /** @type {number[]} */
    const cur = [i];
    for (let j = 1; j <= n; j++) {
      const cost = s[i - 1] === t[j - 1] ? 0 : 1;
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + cost);
    }
    prev = cur;
  }
  return prev[n];
}

/**
 * @param {string} token
 */
function closestNflNickname(token) {
  const w = String(token || "").toLowerCase().replace(/[^a-z0-9]/g, "");
  if (w.length < 6 || SKIP_FUZZY.has(w)) return null;
  let best = null;
  let bestD = 99;
  for (const name of NFL_FUZZY_NICKNAMES) {
    if (w[0] !== name[0]) continue;
    const d = nflAskLevenshtein(w, name);
    const maxD = w.length >= 7 || name.length >= 7 ? 2 : 1;
    if (d > 0 && d <= maxD && d < bestD) {
      best = name;
      bestD = d;
    }
  }
  return best;
}

/**
 * @param {string} question
 */
export function normalizeNflAskQuestion(question) {
  let q = String(question || "")
    .replace(/[’']/g, "'")
    .replace(/\s+/g, " ")
    .trim();
  q = q
    .replace(/\bwhat\s+ar\s+e?the\b/gi, "what are the")
    .replace(/\bwhat\s+r\s+the\b/gi, "what are the")
    .replace(/\bwhat\s+arethe\b/gi, "what are the")
    .replace(/\bplayre\b/gi, "player")
    .replace(/\bplyer\b/gi, "player")
    .replace(/\bplayeer\b/gi, "player")
    .replace(/\bplaeyr\b/gi, "player")
    .replace(/\bpropes\b/gi, "props")
    .replace(/\bpropps\b/gi, "props")
    .replace(/\bporps\b/gi, "props")
    .replace(/\bplayerprops\b/gi, "player props")
    .replace(/\bbestbets\b/gi, "best bets")
    .replace(/\bvers(?:us|es)?\b/gi, "vs")
    .replace(/\bvrs\b/gi, "vs");

  q = q
    .split(/(\b)/)
    .map((part) => {
      if (!/^[A-Za-z]{6,}$/.test(part)) return part;
      const hit = closestNflNickname(part);
      return hit || part;
    })
    .join("");

  return q.replace(/\s+/g, " ").trim();
}

/**
 * Broad “show me tickets on this game” ask — not a single named market.
 * @param {string} question
 */
export function looksLikeNflPropsBoardAsk(question) {
  const q = normalizeNflAskQuestion(question).toLowerCase();
  if (/\bsgp\b|\bsame[-\s]?game\s+parlay\b/.test(q) && !/\bprops?\b/.test(q)) return false;
  if (
    /\bpass(?:ing)?\s+yards?\b/.test(q) ||
    /\brush(?:ing)?\s+yards?\b/.test(q) ||
    /\breceiv(?:ing|er)?\s+yards?\b/.test(q) ||
    /\bpass(?:ing)?\s+(?:tds?|touchdowns?)\b/.test(q)
  ) {
    return false;
  }
  return (
    /\b(?:best\s+)?player\s+props?\b/.test(q) ||
    /\bbest\s+props?\b/.test(q) ||
    /\bprop\s+bets?\b/.test(q) ||
    /\bprop\s+board\b/.test(q) ||
    /\bbest\s+bets?\b/.test(q) ||
    /\bbest\s+plays\b/.test(q) ||
    /\bany\s+good\s+(?:props?|bets?)\b/.test(q) ||
    /\bwhat\s+(?:should|to)\s+(?:i\s+)?bet\b/.test(q) ||
    (/\bprops?\b/.test(q) && /\b(?:game|matchup|vs\.?|versus)\b/.test(q))
  );
}
