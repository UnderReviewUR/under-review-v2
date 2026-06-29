/**
 * World Cup UR Take — script + price product DNA (WC-only).
 * Translate odds into scoreboard scripts; say when the script and price disagree.
 */

import { detectParlayIntent } from "./detectParlayIntent.js";
import { extractLatestUserTurnForRouting } from "./urTakeSportRouting.js";
import { isWcHomePromoWindow } from "./wc2026Constants.js";
import { extractMentionedWcTeams, questionMentionsWorldCup } from "./wcUrTakeKeywords.js";
import { WC_INTENT } from "./wcUrTakeIntent.js";
import { isKnockoutPhase } from "./wcPhaseUtils.js";

/** Core DNA — injected into WC system prompt (all betting turns). */
export const WC_SCRIPT_PRICE_CORE_PROMPT = `WC SCRIPT + PRICE PHILOSOPHY (mandatory for betting takes — not rules-only turns)
- Translate the posted line into a scoreboard script: what game state does this price assume?
- Name what the market implies (rough implied % or "priced as favorite/near-coin") vs your read when VERIFIED CONTEXT has numbers.
- Every take must include a scoreboard hinge in plain English: "This wins if…" / "This dies if…" — not just "lean over."
- Pass is a valid output: "Pass at +X — fair favorite" and "Cleaner leg: ML / team O1.5" beat fake confidence.
- When legs share one game script (SGP, ML + team total, scorer + first goal), call correlation out loud — do not price legs as independent.
- Group opener / host / path context matters: same team plays different in Game 1 vs must-win — use tournament phase from VERIFIED CONTEXT.
- Cite only prices and stats from VERIFIED CONTEXT; when thin, say what is missing — never invent book lines or Opta settlement rules.
- PLAYER PROPS: frame every named player as their NATIONAL TEAM at World Cup 2026 — never cite club teams, domestic leagues (Premier League, La Liga, etc.), or club form from memory. Use tournament/fixture stats from VERIFIED CONTEXT only.`;

/** Tier 2.5 appendix for WC player/match prop card face (maps to existing fields). */
export const WC_SCRIPT_PRICE_PLAYER_TIER25_APPENDIX = `SCRIPT + PRICE (player / match prop — maps to card fields):
- LINE sentence: market price vs your read (American odds + rough implied % when listed in context).
- deep WHY: the script the price assumes (pace, lead, rotation, set-piece volume).
- WATCH FOR: scoreboard trigger that breaks the edge — must differ from WHY.
- THE PLAY: Lean, Pass at [odds], or Cleaner leg: [alternate market] — all valid; never force a pick when price matches script.`;

const WC_PROP_LEG_SIGNAL_RES = [
  /\d+\+\s*shots?(?:\s+on\s+target|\s*on\s*goal)?/i,
  /\d+\.5\s*shots?(?:\s+on\s+target|\s*on\s*goal)?/i,
  /\bscore\s+or\s+assist\b/i,
  /\bfirst\s+goal\b/i,
  /\bteam\s+to\s+score\b/i,
  /\banytime\s+(?:goal\s*)?scorer\b/i,
  /\bshots?\s+on\s+target\b/i,
  /\bsot\b/i,
  /\bmost\s+corners?\b/i,
  /\b(btts|both teams to score)\b/i,
  /\b(moneyline|draw no bet|\bdnb\b)\b/i,
  /\b(over|under)\s*\d/i,
  /\b[-+]\d+\.5\b/,
];

/**
 * Sportsbook screenshot / market-menu analyze — not an SGP combo ask.
 * @param {string} question
 */
export function isWcBettingScreenshotAnalyzeQuestion(question) {
  const q = extractLatestUserTurnForRouting(String(question || "")).trim();
  if (!q) return false;
  return (
    /\b(screenshot|see attached|attached|paste[sd]?)\b/i.test(q) ||
    /\banalyze\b[\s\S]{0,48}\b(options|lines|markets|screenshot|odds|this)\b/i.test(q) ||
    /\bwhat'?s best to (play|bet)\b/i.test(q) ||
    /\bbest (?:thing|market|line|bet) to play\b/i.test(q) ||
    /\bwhich (?:line|market|play) (?:is best|to take|should i)\b/i.test(q)
  );
}

/**
 * Multi-leg WC ticket without requiring the word "parlay" / "sgp".
 * @param {string} question
 */
export function detectWcSgpComboIntent(question) {
  if (isWcBettingScreenshotAnalyzeQuestion(question)) return false;
  const q = extractLatestUserTurnForRouting(String(question || "").trim());
  if (!q) return false;

  if (detectParlayIntent(q)) return true;

  if (
    /\bboth\b/i.test(q) &&
    /\b(players?\s+to\s+score|to\s+score|scorer)\b/i.test(q) &&
    (/\b(and|&)\b/i.test(q) || extractMentionedWcTeams(q).length >= 1)
  ) {
    return true;
  }

  const playerLegCount = (q.match(/\bto\s+(score|assist)\b/gi) || []).length;
  if (playerLegCount >= 2 && /\b(and|\+|both)\b/i.test(q)) return true;

  if (
    /\b(vs\.?|versus)\b/i.test(q) &&
    /\b(and|\+|both)\b/i.test(q) &&
    /\b(score|assist|scorer|goal)\b/i.test(q) &&
    !/\b(who wins|moneyline|\bml\b|under|over)\b/i.test(q)
  ) {
    if (/\b[A-Za-zÀ-ÿ][\wÀ-ÿ'-]{2,}\s+to\s+(score|assist)\b/i.test(q)) return true;
    if (/\bboth\b.*\b(score|scorer|goal)\b/i.test(q)) return true;
    if (/\b(goal|scorer)\b.*\b(and|\+)\b.*\b(goal|scorer)\b/i.test(q)) return true;
  }

  // Single player O/U phrasing ("Son over 2.5 shots") hits multiple patterns — not an SGP.
  const singlePlayerPropOu =
    (/\b(score|goal)\s+or\s+assist\b/i.test(q) ||
      /\b(shots?|sot|assist|scorer|goal)\b/i.test(q)) &&
    !/\b(and|with|\+|plus)\b/i.test(q) &&
    !/\b(team to score|moneyline|\bml\b|btts|both teams to score|total goals)\b/i.test(q);
  if (singlePlayerPropOu) return false;

  const legHits = WC_PROP_LEG_SIGNAL_RES.filter((re) => re.test(q)).length;
  if (legHits >= 2) return true;

  const hasConnector = /\b(and|with|\+|plus)\b/i.test(q);
  if (!hasConnector || legHits < 1) return false;

  const hasTeamMarket =
    /\b(team to score|moneyline|\bml\b|over|under|btts|both teams to score|total goals)\b/i.test(q);
  const hasPlayerMarket =
    /\b(shots?|scorer|assist|sot|card|jimenez|mbappe|player)\b/i.test(q);
  return hasTeamMarket && hasPlayerMarket;
}

/**
 * Gate NBA first-session slate guarantee during World Cup home promo window.
 * @param {{
 *   firstSessionNoHistory: boolean,
 *   hasImage: boolean,
 *   sportHint: string,
 *   uiSportHint?: string | null,
 *   question: string,
 *   wcEventId?: string | null,
 *   nowMs?: number,
 * }} opts
 */
export function shouldRunNbaFirstSessionGuarantee(opts) {
  const {
    firstSessionNoHistory,
    hasImage,
    sportHint,
    uiSportHint,
    question,
    wcEventId,
    nowMs = Date.now(),
  } = opts;

  if (!firstSessionNoHistory || hasImage) return false;
  const hint = String(sportHint || "").toLowerCase();
  if (hint !== "generic" && hint !== "image_review") return false;
  if (String(uiSportHint || "").trim().toLowerCase() === "worldcup") return false;
  if (questionMentionsWorldCup(question)) return false;
  if (wcEventId) return false;
  if (isWcHomePromoWindow(nowMs)) return false;
  return true;
}

/**
 * @param {string} [wcIntent]
 */
function wcIntentAcceptsScriptPrice(wcIntent) {
  const i = String(wcIntent || "");
  if (!i || i === WC_INTENT.RULES) return false;
  return true;
}

/**
 * @param {{ question?: string, wcIntent?: string, phase?: string, isParlay?: boolean, hasMatchPlayerProps?: boolean }} opts
 */
/**
 * @param {string} question
 * @param {string} [wcIntent]
 */
export function isWcTeamMarketOpenerQuestion(question, wcIntent) {
  const intent = String(wcIntent || "");
  if (intent === WC_INTENT.MATCHUP) return true;
  const q = String(question || "").toLowerCase();
  return (
    /\b(vs\.?|versus|who wins|moneyline|\bml\b|spread|over|under|total|btts|draw)\b/i.test(
      q,
    ) && /\b(opener|game 1|first game|group stage|host)\b/i.test(q)
  );
}

/** Team-market script + price framing for group openers (ML vs spread vs total). */
export const WC_TEAM_MARKET_OPENER_APPENDIX = `TEAM MARKET OPENER — SCRIPT + PRICE (binding for matchup / opener asks):
- Translate each posted price into a scoreboard script before picking a side.
- Favorite -1.5 / spread: needs a multi-goal win script — not the same as ML or team total.
- ML -200 vs Under 2.5: ML prices "win"; Under prices "tight 1-0 / 2-0" — call the tension out loud.
- Group Game 1 / host opener: default cautious script (rotation, crowd nerves) — Pass on forced alt lines when fair.
- THE PLAY must name a market: Pass on ML at [odds] + lean Under/BTTS/DNB/both advance — never Pass-only.
- Wins-if / dies-if: one line each tied to the actual line you cite from FIXTURE MATCH ODDS.`;

/**
 * @param {{ question?: string, wcIntent?: string, phase?: string, isParlay?: boolean, hasMatchPlayerProps?: boolean }} opts
 */
export function buildWcScriptPriceUserAppendix(opts = {}) {
  const { question = "", wcIntent, phase, isParlay, hasMatchPlayerProps } = opts;
  if (!wcIntentAcceptsScriptPrice(wcIntent)) return "";

  const parlay = Boolean(isParlay) || detectWcSgpComboIntent(question);
  const knockout = isKnockoutPhase(phase || "GROUP_STAGE");
  const openerNote = knockout
    ? "Knockout: one-and-done script — ET/pens live if level after 90."
    : phase === "PRE_GROUP" || String(phase || "").includes("GROUP")
      ? "Group stage: opener vs must-win framing — hosts and Game 1 openers skew cautious; elimination math tightens scripts later."
      : "";

  const lines = [
    "SCRIPT + PRICE TURN RULES (binding — World Cup betting take):",
    "- Sentence 1 (HEADLINE): argue where the market script is wrong OR why Pass/fair is right.",
    '- Sentence 2 (LINE): "Market [odds] · implies ~[X]% · UR read ~[Y]%." Use only numbers from VERIFIED CONTEXT.',
    "- deep: WHY = evidence; then SCOREBOARD SCRIPT = one line each for wins-if and dies-if.",
    "- WATCH FOR: live trigger (score, red card, sub, path) — not a repeat of WHY.",
    '- THE PLAY: Lean, "Pass at [odds]", or "Cleaner leg: [market]" when a correlated leg is sharper.',
  ];

  if (openerNote) lines.push(`- Path context: ${openerNote}`);
  if (parlay) {
    lines.push(
      "- SGP / multi-leg: open with CORRELATION — which legs share one scoreboard; flag same-stat fragility.",
      "- Recommend a cleaner 2-leg build when a 4-leg ticket stacks one script hinge.",
      "- Missing leg prices: still lead with shared script / correlation in HEADLINE — then Pass until verified lines post.",
    );
  }
  if (hasMatchPlayerProps) {
    lines.push(
      "- MATCH PLAYER PROPS in VERIFIED CONTEXT are authoritative for player legs — cite listed American prices only.",
      "- Milestone ladders (over 1 / over 2 / over 3): WHY = one line per posted leg with worth-it verdict; THE PLAY answers the user's line in plain English.",
    );
  }
  if (
    wcIntent === WC_INTENT.MATCHUP ||
    isWcTeamMarketOpenerQuestion(question, wcIntent)
  ) {
    lines.push(
      "- TEAM MARKET: compare ML vs spread vs total scripts — name cleaner leg when ML is fair.",
      "- Opener: modal script is cautious 1-0 / 2-0 — do not price a blowout without evidence.",
    );
  }

  return lines.join("\n");
}

/**
 * @param {{ question?: string, wcIntent?: string }} [opts]
 */
export function buildWcTeamMarketOpenerPromptBlock(opts = {}) {
  const { question = "", wcIntent } = opts;
  if (!wcIntentAcceptsScriptPrice(wcIntent)) return "";
  if (wcIntent !== WC_INTENT.MATCHUP && !isWcTeamMarketOpenerQuestion(question, wcIntent)) {
    return "";
  }
  return WC_TEAM_MARKET_OPENER_APPENDIX;
}

/**
 * WC parlay / SGP shape — mirrors MLB parlay rule; soccer legs from context only.
 */
/**
 * @param {string} question
 */
export function buildWcSgpComboPassHeadline(question) {
  const q = String(question || "").trim();
  const player = q.match(/^([A-Za-zÀ-ÿ][\wÀ-ÿ' -]*)/i)?.[1]?.trim();
  if (player && /\band\b/i.test(q)) {
    return `${player} legs share one script — Pass until lines post.`;
  }
  return "Same-script legs — Pass until verified lines post.";
}

export function buildWcParlayResponseRule() {
  return `WC PARLAY / SGP RESPONSE RULE (mandatory — overrides generic parlay leg formatting this turn)

OPENING:
- Lead with the scoreboard script all legs share — or why legs are poorly correlated.
- Never open with "thin data" or "wait for lines" when FIXTURE MATCH ODDS or MATCH PLAYER PROPS exist in VERIFIED CONTEXT.

LEG DISCIPLINE:
- Name each leg with market + listed American price from VERIFIED CONTEXT (ML, team total, BTTS, scorer, shots/SOT, first goal).
- One sentence per leg: what scoreboard state each leg needs.
- Call out correlation explicitly: "These legs win together if Mexico leads early" or "Same-stat fragility — both need Jimenez volume."

CLOSE:
- THE PLAY: Keep / Trim / Rebuild the ticket OR "Cleaner leg: [single market]" / Pass on the forced alt line.
- When ML and a team total/prop share one script, say to size down or drop the redundant leg.

PRICING:
- Never invent odds; if a leg has no verified line, say Pass on that leg and name the cleaner alternative.`;
}
