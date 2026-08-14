/**
 * Live-mode is board/in-game cues, not the word "live" in a pregame sentence.
 */

import { classifyNflGamePhase } from "./nflGameState.js";

const LIVE_PHRASES = Object.freeze([
  "left in",
  "minutes left",
  "seconds left",
  "time left",
  "right now",
  "just happened",
  "this quarter",
  "this inning",
  "this half",
  "this set",
  "bottom of",
  "top of",
  "end of",
  "1st half",
  "2nd half",
  "overtime",
  "on pace",
]);

/** Clock / in-progress cues — not betting-market wording like "first half total". */
const NFL_STRONG_LIVE_PHRASES = Object.freeze([
  "left in",
  "minutes left",
  "seconds left",
  "time left",
  "just happened",
  "this inning",
  "this set",
  "bottom of",
  "top of",
  "overtime",
]);

const LIVE_TOKENS = Object.freeze(["q1", "q2", "q3", "q4"]);

function normalizeAsk(question) {
  return String(question || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * "don't talk like this is live" / "if it's still pregame" is not a live ask.
 * @param {string} q normalized
 */
export function isNegatedLiveWording(q) {
  const s = String(q || "");
  if (
    /\b(?:do not|don t|dont|not|never)\b(?:\s+\w+){0,10}\s+live\b/.test(s)
  ) {
    return true;
  }
  if (/\blive\b(?:\s+\w+){0,10}\s+(?:if it s still pregame|still pregame|if still pregame)\b/.test(s)) {
    return true;
  }
  return false;
}

/**
 * True in-game / live-board cues — not the bare word "live".
 * Used for NBA/generic. NFL Ask follows the board via resolveNflAskLiveSignals.
 * @param {string} question
 */
export function hasNflBoardLiveCue(question) {
  const q = normalizeAsk(question);
  if (!q) return false;
  if (LIVE_PHRASES.some((kw) => q.includes(kw))) return true;
  if (LIVE_TOKENS.some((tok) => new RegExp(`\\b${tok}\\b`).test(q))) return true;
  if (/\b(?:currently|halftime)\b/.test(q)) return true;
  return false;
}

/**
 * Strong in-game clock cues only. "This half" / "right now" / "first half" do not count.
 * @param {string} question
 */
export function hasNflStrongLiveCue(question) {
  const q = normalizeAsk(question);
  if (!q) return false;
  if (NFL_STRONG_LIVE_PHRASES.some((kw) => q.includes(kw))) return true;
  if (LIVE_TOKENS.some((tok) => new RegExp(`\\b${tok}\\b`).test(q))) return true;
  if (/\bhalftime\b/.test(q)) return true;
  return false;
}

/**
 * NFL live-mode follows GAME STATE on the board, not "this half" / "right now".
 * @param {{
 *   question?: string,
 *   hasImage?: boolean,
 *   games?: Array<Record<string, unknown>>,
 *   nowMs?: number,
 * }} [opts]
 */
export function resolveNflAskLiveSignals(opts = {}) {
  const question = String(opts.question || "");
  const keyword = detectLiveGameSignals(question, Boolean(opts.hasImage));
  const games = Array.isArray(opts.games) ? opts.games : [];
  const nowMs = opts.nowMs ?? Date.now();
  const isBoardLive = games.some((g) => classifyNflGamePhase(g, nowMs) === "live");
  const boardKnown = games.length > 0;
  const isEffectivelyLive = boardKnown ? isBoardLive : hasNflStrongLiveCue(question);
  return {
    ...keyword,
    isBoardLive,
    isEffectivelyLive,
  };
}

/**
 * @param {string} question
 * @param {boolean} [hasImage]
 * @returns {{ isLive: boolean, hasImage: boolean, hasLiveKeyword: boolean }}
 */
export function detectLiveGameSignals(question, hasImage = false) {
  const q = normalizeAsk(question);
  const negatedLive = isNegatedLiveWording(q);
  const wordLive = /\blive\b/.test(q) && !negatedLive;
  const otherCue = hasNflBoardLiveCue(q);
  const hasLiveKeyword = wordLive || otherCue;
  return {
    isLive: Boolean(hasImage) || hasLiveKeyword,
    hasImage: Boolean(hasImage),
    hasLiveKeyword,
  };
}
