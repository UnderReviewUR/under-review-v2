/**
 * Hypothetical odds / line-movement asks — NOT "no line" passes.
 * e.g. "Will Germany -669 to advance shorten if scoreless at 5'?"
 */

import { extractFirstAmericanOddsToken, parseAmericanOddsValue } from "./formatOddsAmerican.js";
import { extractLatestUserTurnForRouting } from "./urTakeSportRouting.js";
import { extractMentionedWcTeams } from "./wcUrTakeKeywords.js";

function isColdPassLean(lean) {
  const s = String(lean || "").trim();
  return /^pass\s*[—-]\s*no actionable line yet/i.test(s);
}

function isLineMovementPassLean(lean) {
  const s = String(lean || "").trim();
  if (!s) return true;
  if (isColdPassLean(s)) return true;
  if (/^pass\b/i.test(s)) return true;
  return /no actionable line yet/i.test(s);
}

const LINE_MOVEMENT_CUE_RE =
  /\b(?:odds?|line|price|number)\b[\s\S]{0,40}\b(?:go\s+(?:up|down)|move|shift|drift|shorten|lengthen|steam|come\s+in|get\s+(?:better|worse))\b/i;

const LINE_MOVEMENT_CUE_REV_RE =
  /\b(?:go\s+(?:up|down)|move|shift|drift|shorten|lengthen|steam|come\s+in)\b[\s\S]{0,40}\b(?:odds?|line|price)\b/i;

const TARGET_PRICE_RE = /\bgo\s+to\s+(?:like\s+)?[+-]?\d{2,}\b/i;

const HYPOTHETICAL_STATE_RE =
  /\b(?:if|when)\b[\s\S]{0,56}\b(?:scoreless|0-0|0\s*-\s*0|nil|no goals?|still tied|level|dead heat)\b/i;

const EARLY_MINUTE_RE =
  /\b(?:\d+\s*mins?\s+in|first\s+\d+\s*mins?|opening\s+\d+|early\s+on|5\s*mins?\s+in)\b/i;

/**
 * @param {string} question
 */
export function isWcOddsLineMovementQuestion(question) {
  const q = extractLatestUserTurnForRouting(String(question || "").trim());
  if (!q) return false;
  if (/\b(how do|what is a|rules|extra time|penalty shootout)\b/i.test(q) && !/[+-]\d{2,}/.test(q)) {
    return false;
  }

  const citesOdds = /[+-]\d{2,}/.test(q);
  const movementCue =
    LINE_MOVEMENT_CUE_RE.test(q) ||
    LINE_MOVEMENT_CUE_REV_RE.test(q) ||
    TARGET_PRICE_RE.test(q) ||
    /\bdoes\s+that\s+go\s+to\b/i.test(q) ||
    /\bwill\s+.+\s+odds?\b/i.test(q);

  const hypoState = HYPOTHETICAL_STATE_RE.test(q) || (EARLY_MINUTE_RE.test(q) && /\bscoreless|0-0|odds?|line\b/i.test(q));

  return movementCue || (citesOdds && hypoState) || (hypoState && /\bodds?\b/i.test(q));
}

export const WC_ODDS_LINE_MOVEMENT_PROMPT = `ODDS LINE MOVEMENT / HYPOTHETICAL MATCH STATE (mandatory when user asks how a price moves):
- This is NOT a "no line" moment — explain directional drift using the price they cited (-669, -285, etc.) from the slip, thread, or FIXTURE MATCH ODDS.
- NEVER use "Pass — no actionable line yet" — the user is asking market mechanics (up/down, shorten/lengthen), not for you to pick a bet right now.
- Knockout to-advance favorite at -600+: scoreless early (0-0 at 5–15') usually SHORTENS the favorite (more negative, e.g. -669 toward -575) — underdog live equity ticks up but the favorite still owns the path pre-goal.
- Pre-kickoff ask about in-play drift: clarify they mean AFTER kickoff if the match is still upcoming on the slate; pregame posted lines do not move on a hypothetical 5' scoreless state.
- Give a directional answer with the cited number; say it's plausible not guaranteed; note it's too early to bet FOR the move at 5' unless they want live entry later.
- Separate markets: to-advance ≠ 90-min ML ≠ group advance — keep the market they named.`;

/**
 * Deterministic lean when the model cold-passes a line-movement ask.
 * @param {string} question
 */
export function synthesizeWcOddsLineMovementLean(question) {
  const q = extractLatestUserTurnForRouting(String(question || "").trim());
  if (!q) return "";

  const americanStr = extractFirstAmericanOddsToken(q);
  const american = americanStr ? parseAmericanOddsValue(americanStr) : null;
  const teams = extractMentionedWcTeams(q);
  const team = teams[0] || "The favorite";
  const toAdvance = /\badvance\b/i.test(q) || (american != null && american <= -400);
  const market = toAdvance ? "to advance" : "on the moneyline";
  const priceBit = americanStr ? ` at ${americanStr}` : "";

  if (/\bscoreless|0-0|0\s*-\s*0|nil|no goals?\b/i.test(q)) {
    if (american != null && american < 0) {
      const driftTarget =
        american <= -400
          ? `-${Math.max(100, Math.round(Math.abs(american) * 0.86))}`
          : null;
      const driftBit = driftTarget ? ` — plausible drift toward ${driftTarget}` : "";
      return `${team} ${market}${priceBit} likely shortens slightly if it's 0-0 early${driftBit}; underdog live equity ticks up but ${team} still owns the path pre-goal. Too early to lock at 5'.`;
    }
    return `0-0 early usually shortens the favorite ${market} price slightly — wait for first 15' and chance quality before betting the move.`;
  }

  if (TARGET_PRICE_RE.test(q) || /\bdoes\s+that\s+go\s+to\b/i.test(q)) {
    return `Yes — ${team} ${market}${priceBit} typically shortens on a scoreless start; the exact target depends on book and live flow. Directionally right, not a lock.`;
  }

  return `Track ${team} ${market}${priceBit} — early scoreless minutes favor a slight shorten on the favorite; goals against flip it fast.`;
}

/**
 * @param {Record<string, unknown> | null | undefined} structured
 * @param {string} question
 */
export function repairWcOddsLineMovementGenericPass(structured, question) {
  if (!structured || typeof structured !== "object") return structured;
  if (!isWcOddsLineMovementQuestion(question)) return structured;

  const lean = String(structured.lean || "").trim();
  if (lean && !isLineMovementPassLean(lean)) return structured;

  const rewritten = synthesizeWcOddsLineMovementLean(question);
  if (!rewritten) return structured;

  const call = String(structured.call || "").trim();
  return {
    ...structured,
    lean: rewritten,
    call: !call || isColdPassLean(call) ? rewritten.slice(0, 100) : call,
    whyNow:
      String(structured.whyNow || "").trim() ||
      "Early dead heat dampens underdog live equity without a goal — favorite to-advance prices usually drift shorter, not longer.",
    confidence: String(structured.confidence || "Medium"),
  };
}
