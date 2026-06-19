/**
 * World Cup UR Take — question intent classification + static rules corpus.
 */

import { extractMentionedWcTeams } from "./wcUrTakeKeywords.js";
import { isKnockoutAdvancementQuestion, isTournamentWinnerQuestion } from "./wcPhaseUtils.js";
import { isWcAdvancementMarketQuestion } from "./wcAdvancementMarket.js";
import { extractLatestUserTurnForRouting } from "./urTakeSportRouting.js";
import { classifyWcFollowUpIntent } from "./wcFollowUpExplain.js";
import { isWcLiveBetTimingQuestion, isWcLiveBetsQuestion } from "./wcLiveMatchQuestion.js";
import { isWcPredictionsRoundupQuestion } from "./wcPredictionsRoundup.js";
import { isWcTomorrowOrSlateBetQuestion } from "./wcTakeRetentionQA.js";
import { detectParlayIntent, extractParlayLegCount } from "./detectParlayIntent.js";
import {
  extractWcPlayerParlayRankCount,
  isWcLiveMatchProbabilityQuestion,
  isWcMatchProbabilityQuestion,
  isWcPlayerParlaySlateQuestion,
  resolveWcLiveProbabilityMatchFromThread,
} from "./wcMatchProbabilityQuestion.js";
import {
  isWcFixturePlayerPropsQuestion,
  isGenericWcPlayerPropQuestion,
  isWcFixtureScopedPlayerMarketQuestion,
} from "./wcUrTakePlayerMarket.js";
import { detectWcSgpComboIntent } from "./wcUrTakePhilosophy.js";

/** @typedef {"RULES"|"ENTITY_PRICING"|"MATCHUP"|"PARLAY"|"STRUCTURAL"|"GENERAL"|"CONTINUATION"|"PLAYER_PROP"|"GOLDEN_BOOT"|"TOP_SCORER"|"TOP_GOALSCORERS_LIST"|"SCORE_PREDICTION"|"PREDICTIONS_ROUNDUP"|"UNCLASSIFIED"} WcUrTakeIntent */

export const WC_INTENT = {
  RULES: "RULES",
  ENTITY_PRICING: "ENTITY_PRICING",
  MATCHUP: "MATCHUP",
  /** Cross-market SGP / explicit multi-leg ticket on a pinned fixture thread. */
  PARLAY: "PARLAY",
  STRUCTURAL: "STRUCTURAL",
  /** Open-ended WC questions — default when no specialized pattern matches. */
  GENERAL: "GENERAL",
  CONTINUATION: "CONTINUATION",
  PLAYER_PROP: "PLAYER_PROP",
  GOLDEN_BOOT: "GOLDEN_BOOT",
  GOLDEN_GLOVE: "GOLDEN_GLOVE",
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
    id: WC_INTENT.PARLAY,
    label: "Parlay / SGP",
    description:
      "Multi-leg or same-game parlay on a pinned fixture — player + team market combos, never plain totals-only.",
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
    id: WC_INTENT.GOLDEN_GLOVE,
    label: "Golden Glove",
    description: "Golden Glove / best goalkeeper award — not group advancement.",
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
  /\b(best|top|safest|sharp|value|single)\b.*\b(group[\s-]*stage|group[\s-]*winner|group[\s-]*winners|to advance|advancement|advance)\b/i;

/**
 * @param {string} question
 */
export function isWcGroupSlateQuestion(question) {
  const q = extractLatestUserTurnForRouting(String(question || "").trim());
  if (!q) return false;
  if (WC_GOLDEN_GLOVE_RE.test(q) || WC_GOLDEN_BOOT_RE.test(q) || WC_PLAYER_PROP_RE.test(q)) {
    return false;
  }
  return WC_GROUP_SLATE_RE.test(q) || /\bgroup[\s-]*stage\s*bet\b/i.test(q) || isWcTomorrowOrSlateBetQuestion(q);
}

const CONTINUATION_SIGNAL_RE =
  /\b(what about|tell me more|go deeper|what kills|other side|build a parlay|that take|this edge|them|they)\b/i;

const WC_TEAM_GOALS_RE =
  /\b(which team|what team|team will|nation will|country will|national team|teams score)\b/i;

const WC_TEAM_MATCH_GOALS_COUNT_RE = /\bhow many goals\b/i;

const WC_GOLDEN_BOOT_RE = /\b(golden boot|boot winner|top goalscorer|top goal scorer)\b/i;

const WC_GOLDEN_GLOVE_RE = /\b(golden glove|glove winner|best goalkeeper|goalkeeper of the tournament)\b/i;

const WC_TOP_SCORER_RE =
  /\b(top scorer|most goals|leading scorer|highest goal scorer|score the most goals|who will score the most|who scores the most)\b/i;

const WC_PLAYER_PROP_RE =
  /\b(which player|what player|player will|player to|name a player|striker|forward to score|individual scorer|player score|anytime goal\s*scorer|anytime scorer|to score anytime|first goal|first goal scorer|to score or assist|score or assist|assist\s*prop|record an assist|to record an assist|player assists?|assists?\s*(prop|market|o\/u|over)|\d+\+\s*shots?|\d+\.5\s*shots?(?:\s+on\s+target)?|(?:over|under)\s*\d+\.5\s*shots?|\d+\s*or\s+more\s+shots?|player\s+to\s+have\s+\d+\s*or\s+more\s+shots?|shots?\s*on\s*target|sot\s*prop|player shots?|total shots?\s*(prop|o\/u)|to be carded|receive a card|booking\s*prop|yellow card|red card|card\s*prop|team\s+to\s+score\s+(?:the\s+)?first\s+goal|most\s+corners?|best player prop|player props?|player parlays?|parlay props?|will\s+[A-Za-zÀ-ÿ][\wÀ-ÿ' -]{1,40}\s+score\b)\b/i;

const WC_WHO_WILL_SCORE_RE = /\bwho will score\b/i;

/**
 * Tournament-wide top scorer — not fixture/match player props.
 * @param {string} question
 */
export function isWcTournamentTopScorerQuestion(question) {
  const q = String(question || "").trim();
  const ql = q.toLowerCase();
  if (!q) return false;
  if (WC_GOLDEN_BOOT_RE.test(ql)) return true;
  if (/\b(player props?|anytime scorer|this match|this game|this fixture|tonight'?s? match)\b/i.test(ql)) {
    return false;
  }
  if (/\b(vs\.?|versus)\b/i.test(ql) && extractMentionedWcTeams(q).length >= 2) return false;
  if (/\b(world cup|the tournament|this tournament|in the cup|wc 2026|tournament)\b/i.test(ql)) {
    return (
      WC_TOP_SCORER_RE.test(ql) ||
      WC_WHO_WILL_SCORE_RE.test(ql) ||
      /\b(goal scorer|score more goals|score the most goals)\b/i.test(ql)
    );
  }
  if (/\bscore the most goals\b/i.test(ql)) return true;
  if (WC_TOP_SCORER_RE.test(ql) && /\bmost goals\b/i.test(ql) && !/\b(match|game|fixture|tonight)\b/i.test(ql)) {
    return true;
  }
  return false;
}

/** Match total goals O/U — not a player-prop ask. */
const WC_MATCH_TOTALS_RE =
  /\b(?:over|under)\s+\d+(?:\.\d+)?(?:\s+goals?)?\b|\bgoals?\s+(?:over|under)\s+\d+(?:\.\d+)?\b|\b(?:hit|reach|see)\s+over\s+\d+(?:\.\d+)?(?:\s+goals?)?\b/i;

function isWcPlayerPropOuAsk(question) {
  const q = String(question || "");
  return (
    /\b(?:shots?|sot|assists?|cards?|tackles?|saves?)\b/i.test(q) &&
    /\b(?:over|under)\s+\d+(?:\.\d+)?/i.test(q)
  );
}

/**
 * @param {string} question
 */
export function isWcMatchTotalsQuestion(question) {
  const q = String(question || "").trim();
  if (!q) return false;
  if (isWcPlayerPropOuAsk(q)) return false;
  if (WC_MATCH_TOTALS_RE.test(q)) return true;
  if (/\b(?:has|have)\s+over\s+\d+(?:\.\d+)?(?:\s+goals?)?\b/i.test(q)) return true;
  if (/\bsafe to bet\b[\s\S]{0,80}\bover\s+\d+(?:\.\d+)?(?:\s+goals?)?\b/i.test(q)) return true;
  if (/\bthoughts?\s+(?:on\s+)?(?:the\s+)?(?:over|under)\s+\d+(?:\.\d+)?/i.test(q)) return true;
  return false;
}

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
/**
 * Nation/team total goals in a match — not a player-prop ask.
 * @param {string} question
 */
export function isWcTeamMatchGoalsQuestion(question) {
  const q = String(question || "").trim();
  if (!WC_TEAM_MATCH_GOALS_COUNT_RE.test(q)) return false;
  return extractMentionedWcTeams(q).length >= 1;
}

export function classifyWcPlayerMarketIntent(question) {
  const q = String(question || "").trim();
  const ql = q.toLowerCase();
  if (!q) return null;
  if (isWcMatchTotalsQuestion(q)) return null;
  if (WC_TEAM_GOALS_RE.test(ql) && !/\b(player parlays?|parlay props?)\b/i.test(ql)) return null;
  if (isWcTeamMatchGoalsQuestion(q)) return null;

  if (WC_GOLDEN_BOOT_RE.test(ql)) return WC_INTENT.GOLDEN_BOOT;
  if (WC_GOLDEN_GLOVE_RE.test(ql)) return WC_INTENT.GOLDEN_GLOVE;
  if (/\b(which player|what player)\b/i.test(ql)) return WC_INTENT.PLAYER_PROP;
  if (isWcTournamentTopScorerQuestion(q)) return WC_INTENT.TOP_SCORER;

  if (isWcFixtureScopedPlayerMarketQuestion(q)) return WC_INTENT.PLAYER_PROP;

  if (isWcPlayerParlaySlateQuestion(q)) return WC_INTENT.PLAYER_PROP;
  if (detectWcSgpComboIntent(q)) return WC_INTENT.PLAYER_PROP;
  if (detectParlayIntent(q) && /\b(player|props?|scorer|goalscorer|shots?|assists?)\b/i.test(q)) {
    return WC_INTENT.PLAYER_PROP;
  }
  if (detectParlayIntent(q) && (extractParlayLegCount(q) != null || extractWcPlayerParlayRankCount(q) != null)) {
    return WC_INTENT.PLAYER_PROP;
  }

  if (WC_PLAYER_PROP_RE.test(ql)) return WC_INTENT.PLAYER_PROP;

  return null;
}

/**
 * Check if intent is a player-market intent (for downstream routing/rules).
 * Exported to fix wcUrTakePlayerMarket.js import gap and prevent 500 crashes.
 * @param {string} intent
 */
export function isWcPlayerMarketIntent(intent) {
  const i = String(intent || "");
  return i === WC_INTENT.PLAYER_PROP || i === WC_INTENT.PARLAY;
}

/** Fixture-scoped player props or N-leg player parlay tickets. */
export function isWcFixturePlayerMarketIntent(intent) {
  return isWcPlayerMarketIntent(intent);
}

/** Golden Boot / top scorer / list intents — separate from fixture props + parlay routing. */
export function isWcPlayerAwardMarketIntent(intent) {
  const i = String(intent || "");
  return (
    i === WC_INTENT.GOLDEN_BOOT ||
    i === WC_INTENT.TOP_SCORER ||
    i === WC_INTENT.TOP_GOALSCORERS_LIST ||
    i === WC_INTENT.GOLDEN_GLOVE
  );
}

/**
 * Group-slate QA / prebuilt repair applies only when THIS turn is structural — not prior chat turns
 * prepended by buildContextualQuestion.
 * @param {string} question
 * @param {string} [wcIntent]
 */
export function isWcGroupStructureQuestion(question, wcIntent) {
  if (String(wcIntent || "") === WC_INTENT.STRUCTURAL) return true;
  return isWcGroupSlateQuestion(question);
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
  Third-place match (if scheduled): separate fixture; does not affect the main knockout bracket path to the title.
  GROUP ROSTER: Each group has exactly four teams — use GROUP BINDING blocks and GROUPS in VERIFIED CONTEXT only; never place a nation in the wrong group.`;

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

  const followUpIntent = classifyWcFollowUpIntent(q, history);
  if (followUpIntent) {
    return /** @type {WcUrTakeIntent} */ (followUpIntent);
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

  if (isWcTeamMatchGoalsQuestion(q)) {
    return WC_INTENT.SCORE_PREDICTION;
  }

  if (detectParlayIntent(q)) {
    return WC_INTENT.PARLAY;
  }

  if (
    detectWcSgpComboIntent(q) &&
    (/\b(parlay|sgp|ticket)\b/i.test(q) || isWcMatchTotalsQuestion(q))
  ) {
    return WC_INTENT.PARLAY;
  }

  if (isWcMatchTotalsQuestion(q)) {
    return WC_INTENT.MATCHUP;
  }

  if (
    isWcLiveBetTimingQuestion(q) &&
    Array.isArray(history) &&
    history.length > 0
  ) {
    return WC_INTENT.MATCHUP;
  }

  if (isWcLiveBetsQuestion(q)) {
    return WC_INTENT.MATCHUP;
  }

  const playerMarketIntent = classifyWcPlayerMarketIntent(q);
  if (playerMarketIntent) {
    return playerMarketIntent;
  }

  if (isWcMatchProbabilityQuestion(q)) {
    return WC_INTENT.MATCHUP;
  }

  if (isTournamentWinnerQuestion(q)) {
    return WC_INTENT.ENTITY_PRICING;
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
 * @param {{ isConversationFollowUp?: boolean, match?: Record<string, unknown> | null, history?: object[] }} [opts]
 */
export function buildWcTurnScopeBlock(question, wcIntent, opts = {}) {
  const routingQuestion = extractLatestUserTurnForRouting(String(question || "").trim());
  const intent = wcIntent || classifyWcQuestionIntent(routingQuestion);
  const liveProbabilityOpts = {
    isConversationFollowUp: Boolean(opts.isConversationFollowUp),
    match:
      opts.match ||
      resolveWcLiveProbabilityMatchFromThread(opts.history) ||
      null,
  };
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
  if (intent === WC_INTENT.GOLDEN_GLOVE) {
    return `TURN SCOPE (binding):
- User asked about the Golden Glove (best goalkeeper) — NOT Golden Boot, NOT group advancement, NOT a nation-level pick.
- Name a goalkeeper with reasoning; cite odds only if listed in VERIFIED CONTEXT — do not invent prices.
- Do NOT repeat a prior group-stage value pick from this chat.`;
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
  if (
    detectWcSgpComboIntent(routingQuestion) &&
    !detectParlayIntent(routingQuestion) &&
    !isWcFixturePlayerPropsQuestion(routingQuestion)
  ) {
    return `TURN SCOPE (binding):
- User asked for a multi-leg PLAYER PROP ticket (both score, score+assist, SGP-style combo) — NOT moneyline, totals, or both-advance.
- Build legs from MATCH PLAYER PROPS in VERIFIED CONTEXT — cite player, market, and American price per leg when posted.
- Use parlayLegs when 2+ verified player legs exist; otherwise Pass and name missing lines or correlation — never substitute Under/Over goals.`;
  }
  if (detectParlayIntent(routingQuestion)) {
    const legCount = extractParlayLegCount(routingQuestion) || extractWcPlayerParlayRankCount(routingQuestion);
    const slateNote = isWcPlayerParlaySlateQuestion(routingQuestion)
      ? " Rank/build distinct tickets when asked (best, traps, under-the-radar). Honor the requested count when the user names a number."
      : "";
    return `TURN SCOPE (binding):
- User asked for a PLAYER PARLAY${legCount ? ` (${legCount} legs or tickets)` : ""} — NOT a moneyline, totals, or both-advance angle.${slateNote}
- Build legs from MATCH PLAYER PROPS and Golden Boot rows in VERIFIED CONTEXT — cite player full name, market, and American price per leg.
- Use callType "parlay" with parlayLegs when 2+ verified player legs exist; otherwise Pass and name what lines are missing.
- Do NOT repeat a prior matchup lean (Under/Over goals, ML winner, both teams advance) from this chat.`;
  }
  if (isWcLiveMatchProbabilityQuestion(routingQuestion, liveProbabilityOpts)) {
    return `TURN SCOPE (binding):
- User asked for LIVE in-play PROBABILITY — anchor on the stated score and minute from the question or live thread.
- Answer chances of draw, winner, or late goal directly — cite implied % from live context/sims when present; do not restart with pre-kickoff ML or totals template.
- Name both teams when the fixture is inferable from chat or VERIFIED CONTEXT.`;
  }
  if (isWcMatchProbabilityQuestion(routingQuestion)) {
    return `TURN SCOPE (binding):
- User asked for PROBABILITY / CHANCES on a match or team goal threshold — answer the number asked.
- Cite sim or market implied % from VERIFIED CONTEXT; do not substitute a generic Under/Over lean card unless that is the closest posted market.
- For "more than N goals" asks, discuss team total / scoring path — not Golden Boot or unrelated player props.`;
  }
  if (isWcFixturePlayerPropsQuestion(routingQuestion)) {
    return `TURN SCOPE (binding):
- User asked for MULTIPLE player props on this fixture — numbered list in lean (3-5 players with market + American price).
- Cover both teams when MATCH PLAYER PROPS has rows for each side.
- HEADLINE/call: #1 prop only; never one truncated sentence ending in "lean his…".`;
  }
  if (
    isGenericWcPlayerPropQuestion(routingQuestion) &&
    !isWcFixturePlayerPropsQuestion(routingQuestion)
  ) {
    return `TURN SCOPE (binding):
- User asked for PLAYER PROPS across today's / remaining World Cup slate — NOT NBA/NFL/MLB/tennis/golf/F1.
- When MATCH PLAYER PROPS has rows, return a numbered list (3-5 players with market + American price).
- When lines are missing, Pass honestly — never ask which sport, games, or players to track.
- Never treat Best/What/Remaining as player names.`;
  }
  if (isWcPlayerMarketIntent(intent) || isWcPlayerAwardMarketIntent(intent)) {
    return `TURN SCOPE (binding):
- Answer ONLY the named player market in the current question (Golden Boot / top scorer / prop).
- Do not pivot to an unrelated group-stage pick unless the user asked for both.`;
  }
  if (isTournamentWinnerQuestion(routingQuestion)) {
    return `TURN SCOPE (binding):
- User asked who wins the TOURNAMENT outright — NOT a single group match, Game 1, or prior fixture thread.
- Lead summary with top 2-4 favorites from CURRENT OUTRIGHT ODDS and/or BDL tournament sim winPct (Spain, France, Argentina, etc.).
- Do NOT answer with Mexico vs South Africa or repeat a prior Game 1 lean unless the user asked that specific match this turn.
- Do NOT use group advancement % (advancePct) as the tournament-winner answer — use outright odds and winPct.
- Lean must pair the correct team with its price (favorites at negative odds; longshots at +300 or higher).`;
  }
  if (intent === WC_INTENT.ENTITY_PRICING && isWcAdvancementMarketQuestion(routingQuestion)) {
    return `TURN SCOPE (binding):
- User asked about a knockout-reach / advancement market (e.g. Round of 16) — NOT tournament winner outright.
- Cite the correct sim stat (r16Pct for R16, advancePct for group escape) and do not swap them.
- Do not use CURRENT OUTRIGHT ODDS as the market price for this question.`;
  }
  return "";
}

export { isTournamentWinnerQuestion as isWcTournamentWinnerQuestion } from "./wcPhaseUtils.js";

export const WC_FOLLOW_UP_SYSTEM_APPENDIX = `WC FOLLOW-UP (mandatory — same chat, this sport only):
- UnderReview handles ANY World Cup question — intents are routing hints, not an allowlist. When unsure, answer literally (GENERAL).
- Each user message is a NEW question. Re-read intent every turn — do not auto-repeat the last answer.
- Push-back chips answer ONLY the new question. If the prior take named a runner-up group (e.g. Group K), answer that group's value — do NOT re-issue the #1 pick or a new full slate card for a different group.
- Answer only the specific World Cup question asked. 3–5 sentences in summary unless structured JSON mode applies.
- When the user changes the ask (single top scorer → top 5 goalscorers, Golden Boot → group pick, matchup → scorelines), deliver the NEW shape — never paste the prior one-liner.
- REQUIRED ENTITIES from the user message are binding — do not substitute a prior thread thesis or a different team.
- whyNow must read as analysis in plain English (e.g. "the market prices X as near-certain but sims show…") with sim% vs market% — never telemetry dumps, brackets, or roster-only ("Group X is four teams…").
- If you cannot prove misprice from VERIFIED CONTEXT, set confidence Speculative and state what is missing in whyNow.
- edge / watchFor = trigger to act or pass; user must leave with bet + why the number is wrong + what to watch.
- Use only WORLD CUP 2026 — VERIFIED CONTEXT in the user message. Never claim data is missing if it appears there.
- Never narrate sport routing, context switches, or prior takes unless the user asks about them directly.
- For rules questions: factual answer only — no betting recommendation as the lead.
- For pricing questions: cite odds from VERIFIED CONTEXT when claiming mispriced; never use "mispriced" when odds are STALE or absent.
- For matchup alt-market follow-ups ("besides the moneyline", "both teams to advance", "over or under goals"): headline must be the alternate market only — never repeat "[Team] [ML] to win" as sentence one.`;
