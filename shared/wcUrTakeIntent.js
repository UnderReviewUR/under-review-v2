/**
 * World Cup UR Take — question intent classification + static rules corpus.
 */

import { extractMentionedWcTeams } from "./wcUrTakeKeywords.js";
import { isKnockoutAdvancementQuestion } from "./wcPhaseUtils.js";
import { isWcAdvancementMarketQuestion } from "./wcAdvancementMarket.js";
import { extractLatestUserTurnForRouting } from "./urTakeSportRouting.js";
import { isWcPredictionsRoundupQuestion } from "./wcPredictionsRoundup.js";

/** @typedef {"RULES"|"ENTITY_PRICING"|"MATCHUP"|"STRUCTURAL"|"GENERAL"|"CONTINUATION"|"PLAYER_PROP"|"GOLDEN_BOOT"|"TOP_SCORER"|"TOP_GOALSCORERS_LIST"|"SCORE_PREDICTION"|"PREDICTIONS_ROUNDUP"|"UNCLASSIFIED"} WcUrTakeIntent */

export const WC_INTENT = {
  RULES: "RULES",
  ENTITY_PRICING: "ENTITY_PRICING",
  MATCHUP: "MATCHUP",
  STRUCTURAL: "STRUCTURAL",
  /** Open-ended WC questions — default when no specialized pattern matches. */
  GENERAL: "GENERAL",
  CONTINUATION: "CONTINUATION",
  PLAYER_PROP: "PLAYER_PROP",
  GOLDEN_BOOT: "GOLDEN_BOOT",
  TOP_SCORER: "TOP_SCORER",
  TOP_GOALSCORERS_LIST: "TOP_GOALSCORERS_LIST",
  SCORE_PREDICTION: "SCORE_PREDICTION",
  PREDICTIONS_ROUNDUP: "PREDICTIONS_ROUNDUP",
  UNCLASSIFIED: "UNCLASSIFIED",
};

/**
 * Authoritative WC intent catalog — specialized intents are routing hints, not an allowlist.
 * Anything that does not match a specialized pattern falls through to GENERAL.
 * @type {{ id: WcUrTakeIntent, label: string, description: string }[]}
 */
export const WC_INTENT_CATALOG = [
  {
    id: WC_INTENT.GENERAL,
    label: "General",
    description:
      "Default catch-all for any World Cup question (tournament outlook, narratives, hypotheticals, trivia-adjacent betting angles). Answer literally — do not force a group-stage pick template.",
  },
  {
    id: WC_INTENT.PREDICTIONS_ROUNDUP,
    label: "Predictions roundup",
    description:
      "Multi-slot prediction prompts (Winners, Dark horse, Breakout player, Top goalscorer) — answer every labeled slot.",
  },
  {
    id: WC_INTENT.RULES,
    label: "Rules",
    description: "Tournament format, tiebreakers, extra time, penalties, advancement settlement.",
  },
  {
    id: WC_INTENT.ENTITY_PRICING,
    label: "Entity pricing",
    description: "A named team/nation priced on an outright or advancement market — mispriced/fair/value reads.",
  },
  {
    id: WC_INTENT.MATCHUP,
    label: "Matchup",
    description: "Head-to-head or advancement between specific teams (vs, who goes through).",
  },
  {
    id: WC_INTENT.STRUCTURAL,
    label: "Structural / group slate",
    description: "Group-stage value, group winners, advancement slates, team-level tournament goal leaders.",
  },
  {
    id: WC_INTENT.SCORE_PREDICTION,
    label: "Scorelines",
    description: "Final score predictions and scoreline lists — not player scorers.",
  },
  {
    id: WC_INTENT.TOP_GOALSCORERS_LIST,
    label: "Top goalscorers list",
    description: "Ranked lists of individual goalscorers (e.g. top 5 goalscorers / goalscores).",
  },
  {
    id: WC_INTENT.TOP_SCORER,
    label: "Top scorer",
    description: "Single tournament top scorer / most goals lean.",
  },
  {
    id: WC_INTENT.GOLDEN_BOOT,
    label: "Golden Boot",
    description: "Golden Boot winner market and value.",
  },
  {
    id: WC_INTENT.PLAYER_PROP,
    label: "Player prop",
    description:
      "Named player match props (scorer, assists O/U, shots/SOT O/U, card markets) when fixture lines exist in VERIFIED CONTEXT.",
  },
  {
    id: WC_INTENT.CONTINUATION,
    label: "Continuation",
    description: "Follow-up on the immediately prior thread (what about, go deeper, build on that take).",
  },
];

const RULES_SIGNAL_RE =
  /\b(extra time|penalties|penalty shootout|tiebreaker|tie-break|tie break|how does knockout|knockout rules|knockout format|away goals|advancement rules|what are the rules)\b/i;

/** @param {string} question */
export function isWcRulesQuestion(question) {
  const ql = String(question || "").trim().toLowerCase();
  if (!ql) return false;
  const hasPricingCue =
    PRICING_SIGNAL_RE.test(ql) || /\+\d{3,}/.test(ql) || /\bto win the (world cup|tournament)\b/i.test(ql);
  return RULES_SIGNAL_RE.test(ql) && !hasPricingCue;
}

const PRICING_SIGNAL_RE =
  /\b(mispriced|outright|fairly priced|fair price|overpriced|underpriced)\b/i;

const MATCHUP_SIGNAL_RE = /\b(vs\.?|versus|who advances|advance from|go through)\b/i;

const STRUCTURAL_SIGNAL_RE =
  /\b(best value|longshot|cleanest|structural|group [a-l]\b|contender|favorite)\b/i;

/** Group-stage / slate picks — never treat as Golden Boot continuation. */
const WC_GROUP_SLATE_RE =
  /\b(best|top|safest|sharp|value|single)\b.*\b(group\s*stage|group\s*winner|group\s*winners|to advance|advancement|advance)\b/i;

/**
 * @param {string} question
 */
export function isWcGroupSlateQuestion(question) {
  const q = String(question || "").trim();
  if (!q) return false;
  if (WC_GOLDEN_BOOT_RE.test(q) || WC_PLAYER_PROP_RE.test(q)) return false;
  return WC_GROUP_SLATE_RE.test(q) || /\bgroup\s*stage\s*bet\b/i.test(q);
}

const CONTINUATION_SIGNAL_RE =
  /\b(what about|tell me more|go deeper|what kills|other side|build a parlay|that take|this edge|them|they)\b/i;

const WC_TEAM_GOALS_RE =
  /\b(which team|what team|team will|nation will|country will|national team|teams score)\b/i;

const WC_GOLDEN_BOOT_RE = /\b(golden boot|boot winner|top goalscorer|top goal scorer)\b/i;

const WC_TOP_SCORER_RE =
  /\b(top scorer|most goals|leading scorer|highest goal scorer|score the most goals|who will score the most|who scores the most)\b/i;

const WC_PLAYER_PROP_RE =
  /\b(which player|what player|player will|player to|name a player|striker|forward to score|individual scorer|player score|anytime goal\s*scorer|anytime scorer|to score anytime|first goal|first goal scorer|assist\s*prop|record an assist|to record an assist|player assists?|assists?\s*(prop|market|o\/u|over)|shots?\s*on\s*target|sot\s*prop|player shots?|total shots?\s*(prop|o\/u)|to be carded|receive a card|booking\s*prop|yellow card|red card|card\s*prop)\b/i;

const WC_WHO_WILL_SCORE_RE = /\bwho will score\b/i;

const WC_SCORE_PREDICTION_RE =
  /\b(top\s*\d+\s*scores?|scorelines?|score\s*lines?|predict\s+(?:the\s+)?\d+\s*scores?|scores?\s+to\s+consider|likely\s+final\s+scores?)\b/i;

/**
 * Match scorelines vs goalscorer lists — "top 5 goalscores" is players, not final scores.
 * @param {string} question
 */
export function isWcTopGoalscorersListQuestion(question) {
  const q = String(question || "").trim();
  if (!q) return false;
  if (/\b(anytime|first|last)\s+goal\s*scorer\b/i.test(q)) return false;
  if (WC_PLAYER_PROP_RE.test(q) && !/\btop\s*\d+\b/i.test(q)) return false;
  if (WC_GOLDEN_BOOT_RE.test(q) && !/\btop\s*\d+\b/i.test(q)) return false;
  if (/\bpredict\s+(?:the\s+)?top\s*\d+\b/i.test(q) && /\b(goal|scorer)/i.test(q)) {
    return true;
  }
  if (/\btop\s*\d+\s*(?:goal\s*)?(?:scorers?|goalscorers?|goalscores?)\b/i.test(q)) {
    return true;
  }
  return /\b(goalscorers|goalscores)\b/i.test(q) && /\btop\s*\d+\b/i.test(q);
}

/**
 * @param {string} question
 */
export function isWcScorePredictionQuestion(question) {
  const q = String(question || "").trim();
  if (!q) return false;
  if (isWcTopGoalscorersListQuestion(q)) return false;
  if (WC_GOLDEN_BOOT_RE.test(q) || WC_TOP_SCORER_RE.test(q) || WC_PLAYER_PROP_RE.test(q)) {
    return false;
  }
  return WC_SCORE_PREDICTION_RE.test(q);
}

/**
 * @param {string} question
 * @returns {typeof WC_INTENT.PLAYER_PROP | typeof WC_INTENT.GOLDEN_BOOT | typeof WC_INTENT.TOP_SCORER | null}
 */
export function classifyWcPlayerMarketIntent(question) {
  const q = String(question || "").trim();
  const ql = q.toLowerCase();
  if (!q) return null;
  if (WC_TEAM_GOALS_RE.test(ql)) return null;

  if (WC_PLAYER_PROP_RE.test(ql)) return WC_INTENT.PLAYER_PROP;
  if (WC_GOLDEN_BOOT_RE.test(ql)) return WC_INTENT.GOLDEN_BOOT;
  if (WC_TOP_SCORER_RE.test(ql)) return WC_INTENT.TOP_SCORER;
  if (WC_WHO_WILL_SCORE_RE.test(ql)) return WC_INTENT.TOP_SCORER;
  if (/\b(goal scorer|score more goals)\b/i.test(ql)) return WC_INTENT.TOP_SCORER;

  return null;
}

/**
 * Check if intent is a player-market intent (for downstream routing/rules).
 * Exported to fix wcUrTakePlayerMarket.js import gap and prevent 500 crashes.
 * @param {string} intent
 */
export function isWcPlayerMarketIntent(intent) {
  const i = String(intent || "");
  return (
    i === WC_INTENT.PLAYER_PROP ||
    i === WC_INTENT.GOLDEN_BOOT ||
    i === WC_INTENT.TOP_SCORER ||
    i === WC_INTENT.TOP_GOALSCORERS_LIST
  );
}

/** Static tournament rules — always available regardless of live phase. */
export const WC_STATIC_RULES_BLOCK = `WC TOURNAMENT RULES (binding — factual reference for rules questions):
  Group stage: 12 groups of 4. Top two from each group advance (24 teams) plus eight best third-place teams (32 total) to Round of 32.
  Group tiebreakers (in order): points, goal difference, goals scored, fair play, then drawing of lots.
  Knockout format: Single elimination from Round of 32 through Final.
  Regulation: 90 minutes. If level after 90 minutes in knockout → extra time (two 15-minute periods).
  If still level after extra time → penalty shootout to determine the winner.
  Away goals rule does NOT apply at the 2026 World Cup.
  Betting settlement (knockout): 90-minute moneylines are regulation-only and do NOT settle advancement.
  For "to advance" or "who wins the match" in knockout: factor extra time and penalties — a draw price is not a safe push.
  Third-place match (if scheduled): separate fixture; does not affect the main knockout bracket path to the title.`;

/**
 * @param {string} question
 * @param {WcUrTakeIntent} intent
 */
export function shouldInjectStaticRules(question, intent) {
  if (intent === WC_INTENT.RULES) return true;
  if (RULES_SIGNAL_RE.test(String(question || ""))) return true;
  return isKnockoutAdvancementQuestion(question);
}

/**
 * @param {string} question
 * @param {object[]} [history]
 * @returns {WcUrTakeIntent}
 */
export function classifyWcQuestionIntent(question, history = []) {
  const q = extractLatestUserTurnForRouting(String(question || "").trim());
  const ql = q.toLowerCase();
  if (!q) return WC_INTENT.UNCLASSIFIED;

  const mentioned = extractMentionedWcTeams(q);
  const hasPricingCue =
    PRICING_SIGNAL_RE.test(ql) || /\+\d{3,}/.test(ql) || /\bto win the (world cup|tournament)\b/i.test(ql);

  if (RULES_SIGNAL_RE.test(ql) && !hasPricingCue) {
    return WC_INTENT.RULES;
  }

  if (isWcGroupSlateQuestion(q)) {
    return WC_INTENT.STRUCTURAL;
  }

  if (isWcPredictionsRoundupQuestion(q)) {
    return WC_INTENT.PREDICTIONS_ROUNDUP;
  }

  if (isWcTopGoalscorersListQuestion(q)) {
    return WC_INTENT.TOP_GOALSCORERS_LIST;
  }

  if (isWcScorePredictionQuestion(q)) {
    return WC_INTENT.SCORE_PREDICTION;
  }

  const playerMarketIntent = classifyWcPlayerMarketIntent(q);
  if (playerMarketIntent) {
    return playerMarketIntent;
  }

  if (MATCHUP_SIGNAL_RE.test(ql) && mentioned.length >= 1) {
    return WC_INTENT.MATCHUP;
  }

  if (hasPricingCue && mentioned.length >= 1) {
    return WC_INTENT.ENTITY_PRICING;
  }

  if (hasPricingCue) {
    return WC_INTENT.ENTITY_PRICING;
  }

  if (mentioned.length >= 2 && MATCHUP_SIGNAL_RE.test(ql)) {
    return WC_INTENT.MATCHUP;
  }

  if (WC_TEAM_GOALS_RE.test(ql)) {
    return WC_INTENT.STRUCTURAL;
  }

  if (STRUCTURAL_SIGNAL_RE.test(ql)) {
    return WC_INTENT.STRUCTURAL;
  }

  if (
    mentioned.length === 0 &&
    CONTINUATION_SIGNAL_RE.test(ql) &&
    Array.isArray(history) &&
    history.length > 0
  ) {
    return WC_INTENT.CONTINUATION;
  }

  if (mentioned.length === 1) {
    return WC_INTENT.ENTITY_PRICING;
  }

  if (mentioned.length >= 2) {
    return WC_INTENT.MATCHUP;
  }

  return WC_INTENT.GENERAL;
}

/**
 * @param {object[]} history
 * @returns {string[]}
 */
export function resolveContinuationEntities(history) {
  if (!Array.isArray(history)) return [];
  for (let i = history.length - 1; i >= 0; i -= 1) {
    const turn = history[i];
    if (turn?.role !== "user") continue;
    const text = String(turn.content || turn.text || "");
    const teams = extractMentionedWcTeams(text);
    if (teams.length) return teams;
  }
  return [];
}

/**
 * @param {string} question
 * @param {import("./wcUrTakeIntent.js").WcUrTakeIntent} [wcIntent]
 */
export function buildWcTurnScopeBlock(question, wcIntent) {
  const routingQuestion = extractLatestUserTurnForRouting(String(question || "").trim());
  const intent = wcIntent || classifyWcQuestionIntent(routingQuestion);
  if (
    isWcTopGoalscorersListQuestion(routingQuestion) ||
    intent === WC_INTENT.TOP_GOALSCORERS_LIST
  ) {
    return `TURN SCOPE (binding):
- User asked for a RANKED LIST of goalscorers (e.g. top 5 goalscorers / goalscores) — NOT a single Golden Boot lean.
- Name exactly five players with American odds from PLAYER MARKETS / Golden Boot in VERIFIED CONTEXT (one line each or compact numbered list).
- You may keep the prior #1 pick if still valid, but MUST add four more names — never repeat only Mbappé from the last turn.`;
  }
  if (isWcScorePredictionQuestion(routingQuestion) || intent === WC_INTENT.SCORE_PREDICTION) {
    return `TURN SCOPE (binding):
- User asked for SCORELINE predictions (e.g. top 5 scores to consider) — NOT Golden Boot, NOT top scorer, NOT a single-player prop.
- List exactly five plausible final scores (e.g. 2-1, 1-1, 2-0) for the match or slate in scope; one short line each if space allows.
- Do NOT repeat Mbappé, Golden Boot, or any prior player-market lean from this chat.`;
  }
  if (isWcGroupSlateQuestion(routingQuestion)) {
    return `TURN SCOPE (binding):
- Answer ONLY the current question: group-stage value, group winner, or advancement — name the team(s) and price if citing odds.
- Do NOT repeat Golden Boot, top scorer, or named-player prop answers from earlier in this chat unless the user asked for them again.
- Prior player-market PASS/lean lines are not the answer to this question — ignore SESSION STRUCTURAL EDGE if it names a player.`;
  }
  if (intent === WC_INTENT.CONTINUATION) {
    return `TURN SCOPE (binding):
- This is a follow-up on the prior thread — go deeper or widen the angle the user asked for.
- Do not restart with an unrelated thesis; build on the last exchange when it still applies.`;
  }
  if (intent === WC_INTENT.GENERAL || intent === WC_INTENT.UNCLASSIFIED) {
    return `TURN SCOPE (binding):
- Answer the user's World Cup question directly in plain language — no forced template (not automatically a group pick, scorer lean, or rules lecture).
- Use VERIFIED CONTEXT when citing odds, groups, or fixtures; stay honest when data is thin.
- Do not repeat a prior one-line lean unless the user is clearly asking for an update on that same market.`;
  }
  if (intent === WC_INTENT.PREDICTIONS_ROUNDUP) {
    return `TURN SCOPE (binding):
- User asked for MULTIPLE labeled predictions in one message — answer every slot they listed (Winners, Dark horse, Breakout player, Top goalscorer).
- Do NOT collapse the answer into a single Golden Boot / top-scorer thesis.
- Label each pick in deep; use sims/odds from VERIFIED CONTEXT when citing numbers.`;
  }
  if (isWcPlayerMarketIntent(intent)) {
    return `TURN SCOPE (binding):
- Answer ONLY the named player market in the current question (Golden Boot / top scorer / prop).
- Do not pivot to an unrelated group-stage pick unless the user asked for both.`;
  }
  if (intent === WC_INTENT.ENTITY_PRICING && isWcAdvancementMarketQuestion(routingQuestion)) {
    return `TURN SCOPE (binding):
- User asked about a knockout-reach / advancement market (e.g. Round of 16) — NOT tournament winner outright.
- Cite the correct sim stat (r16Pct for R16, advancePct for group escape) and do not swap them.
- Do not use CURRENT OUTRIGHT ODDS as the market price for this question.`;
  }
  return "";
}

export const WC_FOLLOW_UP_SYSTEM_APPENDIX = `WC FOLLOW-UP (mandatory — same chat, this sport only):
- UnderReview handles ANY World Cup question — intents are routing hints, not an allowlist. When unsure, answer literally (GENERAL).
- Each user message is a NEW question. Re-read intent every turn — do not auto-repeat the last answer.
- Answer only the specific World Cup question asked. 3–5 sentences in summary unless structured JSON mode applies.
- When the user changes the ask (single top scorer → top 5 goalscorers, Golden Boot → group pick, matchup → scorelines), deliver the NEW shape — never paste the prior one-liner.
- REQUIRED ENTITIES from the user message are binding — do not substitute a prior thread thesis or a different team.
- Use only WORLD CUP 2026 — VERIFIED CONTEXT in the user message. Never claim data is missing if it appears there.
- Never narrate sport routing, context switches, or prior takes unless the user asks about them directly.
- For rules questions: factual answer only — no betting recommendation as the lead.
- For pricing questions: cite odds from VERIFIED CONTEXT when claiming mispriced; never use "mispriced" when odds are STALE or absent.`;
