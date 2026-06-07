/**
 * Cross-sport UR Take — multi-turn intent pivots, prior-take filtering, session memory.
 * All sports use this layer; sport-specific classifiers plug in via classifyUrTakeQuestionIntent.
 */

import { classifyNbaQuestionIntent, NBA_INTENT } from "./nbaUrTakeIntent.js";
import { classifyWcQuestionIntent, WC_INTENT } from "./wcUrTakeIntent.js";
import { isWcPlayerMarketIntent } from "./wcUrTakePlayerMarket.js";
import { classifyGenericUrTakeIntent, GENERIC_INTENT } from "./urTakeIntentGeneric.js";
import { appendSessionStructuralEdgeBlock } from "./urTakeSessionStructuralEdge.js";

const PRIOR_LEAN_LINE_RE =
  /\b(golden boot|top scorer|goalscorer|spread|total|moneyline|\bml\b|under \d|over \d|\+[1-9]\d{2,}|player market|prop lean)\b/i;

export const UR_TAKE_CONVERSATION_FOLLOW_UP_APPENDIX = `CONVERSATION FLOW (mandatory — all sports, same chat):
- UnderReview handles ANY question in the active sport — intents are routing hints, not an allowlist.
- Each user message is a NEW question. Re-read intent every turn — do not auto-repeat the last answer.
- When the user changes the ask shape (single pick → list, prop → team total, series → live angle), deliver the NEW format — never paste the prior one-liner.
- Prior takes in the user message are optional context when directly related — not a script to repeat verbatim.
- Speak like a sharp friend in text; answer literally what was asked this turn.`;

/**
 * @param {string} sportHint
 * @param {string} question
 * @param {object[]} history
 * @param {string} [overrideIntent]
 */
export function classifyUrTakeQuestionIntent(sportHint, question, history = [], overrideIntent = null) {
  if (overrideIntent) return String(overrideIntent);
  const sport = String(sportHint || "").toLowerCase();
  const q = String(question || "");
  if (sport === "worldcup") return classifyWcQuestionIntent(q, history);
  if (sport === "nba") return classifyNbaQuestionIntent(q, history);
  return classifyGenericUrTakeIntent(q, history);
}

/**
 * @param {string} sportHint
 * @param {string} intent
 */
export function urTakeIntentFamily(sportHint, intent) {
  const sport = String(sportHint || "").toLowerCase();
  const i = String(intent || "");

  if (sport === "worldcup") {
    if (i === WC_INTENT.RULES) return "rules";
    if (i === WC_INTENT.SCORE_PREDICTION) return "scorelines";
    if (i === WC_INTENT.TOP_GOALSCORERS_LIST) return "goalscorers_list";
    if (isWcPlayerMarketIntent(i)) return "player_market_single";
    if (i === WC_INTENT.MATCHUP) return "matchup";
    if (i === WC_INTENT.ENTITY_PRICING) return "pricing";
    if (i === WC_INTENT.STRUCTURAL) return "group";
    if (i === WC_INTENT.CONTINUATION) return "continuation";
    if (i === WC_INTENT.GENERAL || i === WC_INTENT.UNCLASSIFIED) return "general";
    return "other";
  }

  if (sport === "nba") {
    if (i === NBA_INTENT.LIVE_IN_GAME) return "live";
    if (i === NBA_INTENT.PROP_PLAYER) return "prop_player";
    if (i === NBA_INTENT.PREGAME_MATCHUP) return "matchup";
    if (i === NBA_INTENT.SERIES_WINNER) return "series";
    if (i === NBA_INTENT.FINALS_MVP) return "mvp";
    if (i === NBA_INTENT.CONTINUATION) return "continuation";
    if (i === NBA_INTENT.GENERAL || i === NBA_INTENT.UNCLASSIFIED) return "general";
    return "other";
  }

  if (i === GENERIC_INTENT.RULES) return "rules";
  if (i === GENERIC_INTENT.LIVE) return "live";
  if (i === GENERIC_INTENT.PROP_PLAYER) return "prop_player";
  if (i === GENERIC_INTENT.MATCHUP) return "matchup";
  if (i === GENERIC_INTENT.PRICING) return "pricing";
  if (i === GENERIC_INTENT.STRUCTURAL) return "structural";
  if (i === GENERIC_INTENT.CONTINUATION) return "continuation";
  if (i === GENERIC_INTENT.GENERAL || i === GENERIC_INTENT.UNCLASSIFIED) return "general";
  return "other";
}

/**
 * @param {string} sportHint
 * @param {object[]} history
 * @param {string} [overrideIntent]
 */
export function getPriorUserUrTakeIntent(sportHint, history, overrideIntent = null) {
  if (!Array.isArray(history)) return null;
  for (let i = history.length - 1; i >= 0; i -= 1) {
    const turn = history[i];
    if (turn?.role !== "user") continue;
    const text = String(turn?.content || turn?.text || "").trim();
    if (!text) continue;
    return classifyUrTakeQuestionIntent(sportHint, text, history.slice(0, i), overrideIntent);
  }
  return null;
}

/**
 * @param {string} sportHint
 * @param {string} question
 * @param {object[]} history
 * @param {string} [currentIntent]
 */
export function urTakeConversationPivotMeta(sportHint, question, history, currentIntent) {
  const current = currentIntent || classifyUrTakeQuestionIntent(sportHint, String(question || ""), history || []);
  const prior = getPriorUserUrTakeIntent(sportHint, history || []);
  if (!prior || prior === current) {
    return {
      pivoted: false,
      priorIntent: prior,
      currentIntent: current,
      priorFamily: null,
      currentFamily: null,
    };
  }
  const priorFamily = urTakeIntentFamily(sportHint, prior);
  const currentFamily = urTakeIntentFamily(sportHint, current);
  return {
    pivoted: priorFamily !== currentFamily || prior !== current,
    priorIntent: prior,
    currentIntent: current,
    priorFamily,
    currentFamily,
  };
}

/**
 * @param {string} priorSummary
 */
export function softenPriorTakesInstructions(priorSummary) {
  let raw = String(priorSummary || "").trim();
  if (!raw) return "";
  const replacement =
    "Prior takes are optional context only when the current question is directly related — if the user changed topic or ask shape, answer fresh without repeating prior leans.";
  const instructionNoise =
    /^When the current question|^same player, same team|^same game, same market|^explicitly|^"Related to my|^"Same game as|^"This is the third|^This is the third time/i;

  raw = raw.replace(
    /When the current question relates[\s\S]*?prior takes — don't force a connection\./,
    replacement,
  );
  raw = raw.replace(
    /When the current question relates[\s\S]*?(?=Never silently contradict|SESSION STRUCTURAL EDGE|$)/,
    `${replacement}\n\n`,
  );

  const lines = raw.split("\n").filter((line) => !instructionNoise.test(line.trim()));
  raw = lines.join("\n").trim();

  if (/PRIOR TAKES THIS SESSION/i.test(raw) && !/optional context/i.test(raw)) {
    const headerIdx = lines.findIndex((l) => /^PRIOR TAKES THIS SESSION/i.test(l));
    if (headerIdx >= 0) {
      let insertAt = headerIdx + 1;
      while (insertAt < lines.length && /^\d+\.\s/.test(lines[insertAt].trim())) {
        insertAt += 1;
      }
      lines.splice(insertAt, 0, "", replacement);
      raw = lines.join("\n").trim();
    }
  }

  return raw;
}

function isContinuationIntent(sportHint, intent) {
  const i = String(intent || "");
  if (i === WC_INTENT.CONTINUATION) return true;
  if (i === NBA_INTENT.CONTINUATION) return true;
  if (i === GENERIC_INTENT.CONTINUATION) return true;
  return false;
}

function shouldSkipPriorTakes(sportHint, intent) {
  const sport = String(sportHint || "").toLowerCase();
  if (sport === "worldcup" && intent === WC_INTENT.RULES) return true;
  if (intent === GENERIC_INTENT.RULES) return true;
  return false;
}

/**
 * @param {string} priorSummary
 * @param {string} sportHint
 * @param {string} question
 * @param {object[]} history
 * @param {string} [currentIntent]
 */
export function filterPriorTakesOnConversationPivot(
  priorSummary,
  sportHint,
  question,
  history,
  currentIntent,
) {
  const pivot = urTakeConversationPivotMeta(sportHint, question, history, currentIntent);
  if (!pivot.pivoted || isContinuationIntent(sportHint, pivot.currentIntent)) {
    return String(priorSummary || "").trim();
  }

  let raw = String(priorSummary || "").trim();
  if (!raw) return "";

  if (/SESSION STRUCTURAL EDGE/i.test(raw)) {
    raw = raw
      .split(/\n\n+/)
      .filter((block) => !/SESSION STRUCTURAL EDGE/i.test(block))
      .join("\n\n")
      .trim();
  }

  const familyChanged =
    pivot.priorFamily && pivot.currentFamily && pivot.priorFamily !== pivot.currentFamily;

  const stripLeanLines =
    familyChanged ||
    pivot.currentFamily === "goalscorers_list" ||
    pivot.currentFamily === "scorelines" ||
    pivot.currentFamily === "group" ||
    pivot.currentFamily === "matchup" ||
    pivot.currentFamily === "pricing" ||
    pivot.currentFamily === "general" ||
    pivot.currentFamily === "live" ||
    pivot.currentFamily === "series" ||
    pivot.currentFamily === "mvp" ||
    pivot.currentFamily === "prop_player" ||
    pivot.currentFamily === "structural";

  if (stripLeanLines) {
    const lines = raw.split("\n");
    raw = lines
      .filter((line) => {
        if (/^PRIOR TAKES THIS SESSION/i.test(line)) return true;
        if (/^Prior takes are optional context/i.test(line)) return true;
        if (/^When the current question/i.test(line)) return false;
        if (/^Never silently contradict/i.test(line)) return true;
        if (/^same player, same team/i.test(line)) return false;
        if (/^same game, same market/i.test(line)) return false;
        if (/^explicitly\. Examples:/i.test(line)) return false;
        if (/^explicitly\./i.test(line)) return false;
        if (/^SESSION STRUCTURAL EDGE/i.test(line)) return false;
        if (familyChanged && /^\d+\.\s/.test(line)) return false;
        if (/^\d+\.\s/.test(line) && PRIOR_LEAN_LINE_RE.test(line)) return false;
        return true;
      })
      .join("\n")
      .trim();
  }

  return softenPriorTakesInstructions(raw);
}

/**
 * @param {string} sportHint
 * @param {string} question
 * @param {object[]} history
 * @param {string} [currentIntent]
 */
export function buildConversationTransitionBlock(sportHint, question, history, currentIntent) {
  const pivot = urTakeConversationPivotMeta(sportHint, question, history, currentIntent);
  if (!pivot.pivoted) return "";

  const lines = [
    "CONVERSATION PIVOT (binding — new question in same chat):",
    `Prior turn was ${pivot.priorIntent}; this turn is ${pivot.currentIntent}.`,
    "Answer ONLY what the user asked now — do not repeat the previous one-line lean verbatim.",
  ];

  if (pivot.currentFamily === "goalscorers_list") {
    lines.push(
      "Deliver a ranked list (typically five named players with odds from context) — not a single top-scorer pick.",
    );
  } else if (pivot.currentFamily === "scorelines") {
    lines.push("Deliver scorelines — not player-scorer picks from the prior turn.");
  } else if (pivot.currentFamily === "prop_player") {
    lines.push("Deliver a player-prop read — do not reuse a team-level or series lean from the prior turn.");
  } else if (pivot.currentFamily === "live") {
    lines.push("Deliver a live in-game angle — do not paste a pregame or series thesis.");
  } else if (pivot.currentFamily === "series" || pivot.currentFamily === "mvp") {
    lines.push("Deliver series/finals pricing — not a game-level prop or unrelated player lean.");
  } else if (pivot.currentFamily === "group" || pivot.currentFamily === "matchup") {
    lines.push("Do not answer with a player-market lean from the prior turn.");
  } else if (pivot.currentFamily === "general") {
    lines.push(
      "Treat this as a fresh open question — answer literally from context without forcing a prior template.",
    );
  } else if (pivot.priorFamily !== pivot.currentFamily) {
    lines.push(
      `Deliver a ${pivot.currentIntent} answer — do not reuse the prior ${pivot.priorIntent} answer format.`,
    );
  }

  return `${lines.join("\n")}\n`;
}

/**
 * @param {string} priorSummary — output of summarizePriorTakes (no structural edge yet)
 * @param {object[]} history
 * @param {string} sportHint
 * @param {{ question?: string, intent?: string | null }} [opts]
 */
export function buildUrTakeSessionMemoryPrompt(priorSummary, history, sportHint, opts = {}) {
  const question = String(opts.question || "");
  const sport = String(sportHint || "").toLowerCase();
  const intent = classifyUrTakeQuestionIntent(sport, question, history, opts.intent || null);
  const conversationTransitionBlock = buildConversationTransitionBlock(sport, question, history, intent);

  if (shouldSkipPriorTakes(sport, intent)) {
    return { summary: "", structuralEdgeInjected: false, conversationTransitionBlock, intent };
  }

  let baseSummary = filterPriorTakesOnConversationPivot(
    priorSummary,
    sport,
    question,
    history,
    intent,
  );

  if (conversationTransitionBlock) {
    baseSummary = softenPriorTakesInstructions(baseSummary);
  }

  const pivot = urTakeConversationPivotMeta(sport, question, history, intent);
  const suppressStructuralEdge = pivot.pivoted;

  if (!suppressStructuralEdge && sport !== "worldcup") {
    const withEdge = appendSessionStructuralEdgeBlock(baseSummary, history, sportHint);
    const structuralEdgeInjected = withEdge.length > (baseSummary || "").length;
    return { summary: withEdge, structuralEdgeInjected, conversationTransitionBlock, intent };
  }

  return {
    summary: baseSummary,
    structuralEdgeInjected: false,
    conversationTransitionBlock,
    intent,
  };
}
