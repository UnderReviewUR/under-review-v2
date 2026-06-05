/**
 * World Cup UR Take — question intent classification + static rules corpus.
 */

import { extractMentionedWcTeams } from "./wcUrTakeKeywords.js";
import { isKnockoutAdvancementQuestion } from "./wcPhaseUtils.js";
import { isWcPlayerMarketIntent } from "./wcUrTakePlayerMarket.js";

/** @typedef {"RULES"|"ENTITY_PRICING"|"MATCHUP"|"STRUCTURAL"|"CONTINUATION"|"PLAYER_PROP"|"GOLDEN_BOOT"|"TOP_SCORER"|"UNCLASSIFIED"} WcUrTakeIntent */

export const WC_INTENT = {
  RULES: "RULES",
  ENTITY_PRICING: "ENTITY_PRICING",
  MATCHUP: "MATCHUP",
  STRUCTURAL: "STRUCTURAL",
  CONTINUATION: "CONTINUATION",
  PLAYER_PROP: "PLAYER_PROP",
  GOLDEN_BOOT: "GOLDEN_BOOT",
  TOP_SCORER: "TOP_SCORER",
  UNCLASSIFIED: "UNCLASSIFIED",
};

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
  /\b(which player|what player|player will score|player to score|name a player|striker|forward to score|individual scorer|player score|anytime goal\s*scorer|anytime scorer|to score anytime|first goal\s*scorer|score in this match|score tonight)\b/i;

const WC_WHO_WILL_SCORE_RE = /\bwho will score\b/i;

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
  const q = String(question || "").trim();
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

  return WC_INTENT.STRUCTURAL;
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
  const intent = wcIntent || classifyWcQuestionIntent(String(question || ""));
  if (isWcGroupSlateQuestion(question) || intent === WC_INTENT.STRUCTURAL) {
    return `TURN SCOPE (binding):
- Answer ONLY the current question: group-stage value, group winner, or advancement — name the team(s) and price if citing odds.
- Do NOT repeat Golden Boot, top scorer, or named-player prop answers from earlier in this chat unless the user asked for them again.
- Prior player-market PASS/lean lines are not the answer to this question — ignore SESSION STRUCTURAL EDGE if it names a player.`;
  }
  if (isWcPlayerMarketIntent(intent)) {
    return `TURN SCOPE (binding):
- Answer ONLY the named player market in the current question (Golden Boot / top scorer / prop).
- Do not pivot to an unrelated group-stage pick unless the user asked for both.`;
  }
  return "";
}

export const WC_FOLLOW_UP_SYSTEM_APPENDIX = `WC FOLLOW-UP (mandatory — same chat, this sport only):
- Answer only the specific World Cup question asked. 3–5 sentences in summary unless structured JSON mode applies.
- REQUIRED ENTITIES from the user message are binding — do not substitute a prior thread thesis or a different team.
- Use only WORLD CUP 2026 — VERIFIED CONTEXT in the user message. Never claim data is missing if it appears there.
- Never narrate sport routing, context switches, or prior takes unless the user asks about them directly.
- For rules questions: factual answer only — no betting recommendation as the lead.
- For pricing questions: cite odds from VERIFIED CONTEXT when claiming mispriced; never use "mispriced" when odds are STALE or absent.`;
