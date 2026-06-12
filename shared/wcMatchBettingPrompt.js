/**
 * World Cup match questions — teach casual bettors markets beyond the moneyline.
 */

export const WC_MATCH_BETTING_PROMPT_RULES = `MATCH BETTING — CASUAL BETTOR MODE (mandatory for "who wins", vs, matchup, opener questions):
- HEADLINE / LEAN line one must answer the question: "[Team] [ML price] to win" (e.g. Canada -120 to win) before any alternate market.
- Many users only know the moneyline. Sentence one must state who wins the match and why — name the favorite lean on the ML before any alternate market.
- When the ML is fairly priced, you still must give them something actionable — never end with only "Pass at -240" and no bet type.
- If match ML has no edge (favorite -200 or shorter, or sims align with implied % within ~5 pts):
  1. HEADLINE: who wins and why (one sentence).
  2. THE PLAY: name ONE alternate market with a lean — e.g. both teams to advance (group stage), Over/Under 2.5 goals, BTTS, Draw No Bet, Asian handicap, or group winner. Include a price or structural reason from VERIFIED CONTEXT.
  3. Say "Pass on the ML" only if you also name the alternate play in THE PLAY.
- Group-stage openers: both teams can advance (top two) — often the best angle when ML is fair on the favorite.
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
