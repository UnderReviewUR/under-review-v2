/**
 * World Cup match questions — teach casual bettors markets beyond the moneyline.
 */

import { isWcMatchTotalsQuestion } from "./wcUrTakeIntent.js";

/** Player-prop O/U with a stat line — not match goals. */
function isWcPlayerPropStatOuAsk(question) {
  const q = String(question || "");
  return (
    /\b(?:shots?|sot|assists?|cards?|tackles?|saves?)\b/i.test(q) &&
    /\b(?:over|under)\s+\d+(?:\.\d+)?/i.test(q)
  );
}

/**
 * Match-goals over/under nuance without a totals line number ("tempted to go over…").
 * @param {string} question
 */
export function isWcVagueMatchGoalsOverUnderAsk(question) {
  const q = String(question || "").trim();
  if (!q || isWcPlayerPropStatOuAsk(q)) return false;
  if (
    /\b(?:over|under)\s+\d+(?:\.\d+)?\s+(?:shots?|assists?|sot|cards?|tackles?|saves?)\b/i.test(q)
  ) {
    return false;
  }
  const hasOuCue =
    /\bgo\s+(?:over|under)\b/i.test(q) ||
    (/\b(?:over|under)\b/i.test(q) &&
      /\b(?:tempted|leaning|thinking|consider(?:ing)?|flip|instead)\b/i.test(q));
  if (!hasOuCue) return false;
  if (
    /\b(?:tempted|leaning|thinking|consider(?:ing)?|flip|instead|multiple|goals?|scoring|score\s+multiple|high\s+scoring|low\s+scoring|pressured\s+to\s+respond)\b/i.test(
      q,
    )
  ) {
    return true;
  }
  return /\bgo\s+(?:over|under)\b/i.test(q) && !/\b(?:shots?|assists?|sot|cards?|tackles?|saves?)\b/i.test(q);
}

export const WC_MATCH_BETTING_PROMPT_RULES = `MATCH BETTING — CASUAL BETTOR MODE (mandatory for "who wins", vs, matchup, opener questions):
- HEADLINE / LEAN line one must answer the question: "[Team] [ML price] to win" (e.g. Canada -120 to win) before any alternate market.
- Many users only know the moneyline. Sentence one must state who wins the match and why — name the favorite lean on the ML before any alternate market.
- When the ML is fairly priced, you still must give them something actionable — never end with only "Pass at -240" and no bet type.
- If match ML has no edge (favorite -200 or shorter, or sims align with implied % within ~5 pts):
  1. HEADLINE: who wins and why (one sentence).
  2. THE PLAY: name ONE alternate market with a lean — e.g. both teams to advance (group stage), Over/Under 2.5 goals, BTTS, Draw No Bet, Asian handicap, or group winner. Include a price or structural reason from VERIFIED CONTEXT.
  3. Say "Pass on the ML" only if you also name the alternate play in THE PLAY.
- Group-stage openers: both teams can advance (top two) — often the best angle when ML is fair on the favorite.
- When the fixture does NOT include the group Favorite (Elo tier), "both teams to advance" is a structural bet that requires that Favorite to miss — say so explicitly (e.g. USA vs PAR needs Türkiye out of the top two).
- BAD THE PLAY: "Pass at -240 — this is a fair line, not a mispricing." (no market named)
- GOOD THE PLAY: "Pass on MEX -240 — lean Both Teams to Advance in Group A (Mexico and South Africa both qualify in sims)." OR "Lean Under 2.5 — South Africa sits back; Mexico controls but may not blow them out."
- Only pure Pass (no alternate) when lineups are unconfirmed AND no team-level market has support in VERIFIED CONTEXT — then say what to wait for.
- Never label the shorter ML favorite as a "Longshot" when both sides are plus money (e.g. USA +110 vs PAR +285 — USA is the favorite, Paraguay is the underdog).`;

/** QA regen hint when matchup take is pass-only on the moneyline. */
export const WC_MATCH_PASS_ONLY_QA_SUFFIX =
  "MATCH BETTING: User asked a matchup question. Do not end with Pass-only on the moneyline. Name an alternate market (both teams advance, O/U, BTTS, DNB, group winner) in THE PLAY with reasoning from VERIFIED CONTEXT.";

/** QA regen hint when matchup card face never states a match winner with ML. */
export const WC_MATCH_MISSING_WINNER_QA_SUFFIX = `MATCH BETTING WINNER LINE (mandatory — prior answer hid the moneyline winner):
- User asked who wins a match. Sentence one / CALL must be "[Team] [ML price] to win" (e.g. United States +110 to win) using FIXTURE MATCH ODDS from VERIFIED CONTEXT.
- Do NOT use "advancement paths" as the headline for a who-wins question when ML odds are available.
- THE PLAY holds the alternate market only (both teams advance, O/U, BTTS) — never replace the winner line.
- Label the book favorite correctly: +110 vs +285 means the +110 side is the ML favorite, not the longshot.`;

export { detectWcMatchupMissingWinnerLine } from "./wcMatchupWinnerLine.js";
import { extractWcMatchupPlayHeadline } from "./wcMatchupWinnerLine.js";

/** QA regen when user asked for a non-ML market but the card repeated the moneyline headline. */
export const WC_MATCH_ALT_FOLLOWUP_QA_SUFFIX = `MATCH ALT FOLLOW-UP (mandatory — user asked besides the moneyline):
- Do NOT repeat "[Team] [ML] to win" as the headline or CALL — they already got the ML.
- HEADLINE / CALL must name the alternate market only: Under/Over 2.5 goals, both teams to advance, BTTS, etc.
- Put the ML winner line in breakdown / alt only — never as sentence one again.`;

export function isWcMatchupOtherSideFollowUp(question) {
  const q = String(question || "").trim();
  if (!q) return false;
  return (
    /\bwhat'?s?\s+the\s+other\s+side\b/i.test(q) ||
    /\b(?:give me|show me)\s+the\s+other\s+side\b/i.test(q) ||
    /\bother\s+side\s+of\s+(?:this|that|the\s+(?:lean|play|total|line))\b/i.test(q)
  );
}

/**
 * User wants reasoning on a totals lean already given — not a new market pick.
 * @param {string} question
 */
export function isWcTotalsExplainFollowUp(question) {
  const q = String(question || "").trim();
  if (!q) return false;
  if (!/\b(?:under|over)\s+\d+\.?\d*/i.test(q)) return false;
  return (
    /\b(?:why|how come|explain|what makes you|help me understand|reason for|break down|walk me through)\b/i.test(
      q,
    ) ||
    /^(?:why|explain)\b/i.test(q)
  );
}

/**
 * Totals thread follow-ups that challenge the prior lean — hold Over/Under, explain nuance.
 * Excludes explicit pivot asks ("other side", "over or under goals?").
 * @param {string} question
 */
export function isWcTotalsHoldPriorLeanFollowUp(question) {
  const q = String(question || "").trim();
  if (!q) return false;
  if (isWcMatchupOtherSideFollowUp(q)) return false;
  if (/\bover or under goals\b/i.test(q)) return false;
  if (isWcTotalsExplainFollowUp(q)) return true;
  if (/\bflip(?:s|ped)?\s+(?:this\s+)?to\s+(?:under|over)\b/i.test(q)) return true;
  if (
    /\b(?:does|would|could|should|can|did)\b/i.test(q) &&
    /\b(?:flip|switch|change|turn)\b/i.test(q) &&
    /\b(?:under|over)\b/i.test(q)
  ) {
    return true;
  }
  if (/\b(?:sitting deep|low block|park(?:ing)? the bus|defensive).*\b(?:under|over)\b/i.test(q)) {
    return true;
  }
  if (
    /\b(?:under|over)\s+\d+\.?\d*/i.test(q) &&
    /\b(?:sitting deep|low block|park the bus|defensive|flip)\b/i.test(q)
  ) {
    return true;
  }
  if (isWcVagueMatchGoalsOverUnderAsk(q)) return true;
  return false;
}

/**
 * @param {string} question
 */
export function isWcMatchupAltMarketFollowUp(question) {
  const q = String(question || "").trim();
  if (!q) return false;
  if (isWcTotalsExplainFollowUp(q)) return true;
  if (isWcMatchupOtherSideFollowUp(q)) return true;
  if (
    /\bbest bet\b[^.]{0,48}\bbesides\b[^.]{0,48}(?:the\s+)?(?:moneyline|ml)\b/i.test(q) ||
    /\bbesides\s+(?:the\s+)?(?:moneyline|ml)\b/i.test(q) ||
    /\bother\s+(?:than|side\s+(?:of|from))\s+(?:the\s+)?(?:moneyline|ml)\b/i.test(q)
  ) {
    return true;
  }
  if (/\bboth teams to advance\b/i.test(q)) return true;
  if (/\bover or under goals\b/i.test(q)) return true;
  if (/\bflip this to (?:under|over)\b/i.test(q)) return true;
  if (/\b(?:sitting deep|low block|park the bus|defensive).*\b(?:under|over)\b/i.test(q)) return true;
  if (isWcMatchTotalsQuestion(q)) return true;
  if (/\b(?:over|under)\s+\d+\.?\d*(?:\s*goals?)?\??\s*$/i.test(q)) return true;
  return false;
}

/**
 * @param {string} question
 * @param {object | null | undefined} structured
 */
export function detectWcMatchupAltFollowUpMlHeadline(question, structured) {
  if (!isWcMatchupAltMarketFollowUp(question)) return false;
  if (!structured || typeof structured !== "object") return false;
  const call = String(structured.call || "").trim();
  if (/\bto win\b/i.test(call)) return true;
  const lean = String(structured.lean || "").trim();
  if (/\bto win\b/i.test(lean) && !extractWcMatchupPlayHeadline(lean)) return true;
  return false;
}

const ALT_MARKET_RE =
  /\b(advance|to advance|both teams|btts|both teams to score|over\s+\d|under\s+\d|total goals|draw no bet|asian handicap|handicap|double chance|group winner|clean sheet|team total)\b/i;

const PASS_ONLY_ML_RE =
  /^pass\b[^.!?]{0,120}(?:fair|no edge|no mispric|correctly priced|not a mispric)/i;

/**
 * @param {string} question
 * @param {object | null | undefined} structured
 * @param {string | null | undefined} [wcIntent]
 */
export function detectWcMatchupPassOnlyWithoutAlternate(question, structured, wcIntent) {
  const intent = String(wcIntent || "").toUpperCase();
  const q = String(question || "").trim();
  const isMatchup =
    intent === "MATCHUP" ||
    /\b(vs\.?|versus)\b/i.test(q) ||
    /^who wins\b/i.test(q);
  if (!isMatchup || !structured || typeof structured !== "object") return false;

  const parts = [
    structured.lean,
    structured.call,
    structured.whyNow,
    structured.edge,
  ]
    .filter(Boolean)
    .map(String)
    .join(" ");
  const play = String(structured.lean || structured.call || "").trim();
  if (!/^pass\b/i.test(play) && !PASS_ONLY_ML_RE.test(play)) return false;
  if (ALT_MARKET_RE.test(parts)) return false;
  return true;
}
