/**
 * World Cup UR Take — multi-turn intent pivots and prior-take filtering.
 */

import {
  classifyWcQuestionIntent,
  isWcPlayerMarketIntent,
  WC_INTENT,
} from "./wcUrTakeIntent.js";

const PLAYER_MARKET_PRIOR_RE =
  /\b(golden boot|top scorer|goalscorer|goal scorer|mbapp|haaland|kane|bellingham|\+600|\+800|player market)\b/i;

/**
 * @param {string} intent
 */
export function wcIntentFamily(intent) {
  const i = String(intent || "");
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

/**
 * @param {object[]} history
 * @returns {string | null}
 */
export function getPriorUserWcIntent(history) {
  if (!Array.isArray(history)) return null;
  for (let i = history.length - 1; i >= 0; i -= 1) {
    const turn = history[i];
    if (turn?.role !== "user") continue;
    const text = String(turn?.content || turn?.text || "").trim();
    if (!text) continue;
    const slice = history.slice(0, i);
    return classifyWcQuestionIntent(text, slice);
  }
  return null;
}

/**
 * @param {string} question
 * @param {object[]} history
 * @param {string} [currentIntent]
 */
export function wcConversationPivotMeta(question, history, currentIntent) {
  const current =
    currentIntent || classifyWcQuestionIntent(String(question || ""), history || []);
  const prior = getPriorUserWcIntent(history || []);
  if (!prior || prior === current) {
    return { pivoted: false, priorIntent: prior, currentIntent: current, priorFamily: null, currentFamily: null };
  }
  const priorFamily = wcIntentFamily(prior);
  const currentFamily = wcIntentFamily(current);
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
 * @param {string} question
 * @param {object[]} history
 * @param {string} [wcIntent]
 */
export function filterPriorTakesOnWcConversationPivot(
  priorSummary,
  question,
  history,
  wcIntent,
) {
  const pivot = wcConversationPivotMeta(question, history, wcIntent);
  if (!pivot.pivoted || pivot.currentIntent === WC_INTENT.CONTINUATION) {
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

  const stripPlayerMarket =
    pivot.currentFamily === "goalscorers_list" ||
    pivot.currentFamily === "scorelines" ||
    pivot.currentFamily === "group" ||
    pivot.currentFamily === "matchup" ||
    pivot.currentFamily === "pricing" ||
    pivot.currentFamily === "general" ||
    (pivot.currentFamily === "player_market_single" &&
      pivot.priorFamily === "goalscorers_list");

  const stripSingleLeanForList =
    pivot.currentFamily === "goalscorers_list" &&
    (pivot.priorFamily === "player_market_single" || pivot.priorIntent === WC_INTENT.GOLDEN_BOOT);

  if (stripPlayerMarket || stripSingleLeanForList || familyChanged) {
    const lines = raw.split("\n");
    raw = lines
      .filter((line) => {
        if (/^PRIOR TAKES THIS SESSION/i.test(line)) return true;
        if (/^Prior takes are optional context/i.test(line)) return true;
        if (/^When the current question/i.test(line)) return false;
        if (/^Never silently contradict/i.test(line)) return true;
        if (/^same player, same team/i.test(line)) return false;
        if (/^explicitly\. Examples:/i.test(line)) return false;
        if (/^SESSION STRUCTURAL EDGE/i.test(line)) return false;
        if (familyChanged && /^\d+\.\s/.test(line)) return false;
        if (/^\d+\.\s/.test(line) && PLAYER_MARKET_PRIOR_RE.test(line)) return false;
        if (stripSingleLeanForList && /^\d+\.\s/.test(line) && /\+\d{3}/.test(line)) return false;
        return true;
      })
      .join("\n")
      .trim();
  }

  return softenPriorTakesInstructions(raw);
}

/**
 * @param {string} question
 * @param {object[]} history
 * @param {string} [wcIntent]
 */
export function buildWcConversationTransitionBlock(question, history, wcIntent) {
  const pivot = wcConversationPivotMeta(question, history, wcIntent);
  if (!pivot.pivoted) return "";

  const lines = [
    "CONVERSATION PIVOT (binding — new question in same chat):",
    `Prior turn was ${pivot.priorIntent}; this turn is ${pivot.currentIntent}.`,
    "Answer ONLY what the user asked now — do not repeat the previous one-line lean verbatim.",
  ];

  if (pivot.currentFamily === "goalscorers_list") {
    lines.push(
      "Deliver a ranked list (typically five named players with odds from VERIFIED CONTEXT) — not a single Golden Boot pick.",
    );
  } else if (pivot.currentFamily === "scorelines") {
    lines.push("Deliver five scorelines — not Golden Boot or top scorer picks.");
  } else if (pivot.currentFamily === "group" || pivot.currentFamily === "matchup") {
    lines.push("Do not answer with a player-market lean from the prior turn.");
  } else if (pivot.currentFamily === "general") {
    lines.push(
      "Treat this as a fresh open question — answer literally from VERIFIED CONTEXT without forcing a prior template.",
    );
  } else if (pivot.priorFamily !== pivot.currentFamily) {
    lines.push(
      `Deliver a ${pivot.currentIntent} answer — do not reuse the prior ${pivot.priorIntent} answer format.`,
    );
  }

  return `${lines.join("\n")}\n`;
}

/**
 * @param {string} priorSummary
 */
export function softenPriorTakesInstructions(priorSummary) {
  let raw = String(priorSummary || "").trim();
  if (!raw) return "";
  raw = raw.replace(
    /When the current question relates[\s\S]*?prior takes — don't force a connection\./,
    "Prior takes are optional context only when the current question is directly related — if the user changed topic or ask shape, answer fresh without repeating prior leans.",
  );
  return raw;
}
