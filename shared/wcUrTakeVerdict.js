/**
 * World Cup UR Take — verdict + chip routing (intent-first).
 */

import {
  WC_INTENT,
  classifyWcQuestionIntent,
  isWcGroupSlateQuestion,
  isWcRulesQuestion,
} from "./wcUrTakeIntent.js";
import { isTournamentWinnerQuestion } from "./wcPhaseUtils.js";
import { extractLatestUserTurnForRouting } from "./urTakeSportRouting.js";
import {
  isWcFixtureScopedPlayerMarketQuestion,
  isWcPlayerMarketIntent,
} from "./wcUrTakePlayerMarket.js";

/** @typedef {"HAS_EDGE"|"FAIR_PRICE"|"RULES_FACTUAL"|"MATCHUP"|"PLAYER_MARKET_PASS"|"PLAYER_MARKET_POSTED"|"GROUP_SLATE"|"GENERAL"} WcUrTakeVerdict */

/**
 * @param {object | null | undefined} structured
 */
function hasPostedWcMatchPlayerProps(structured) {
  if (!structured || typeof structured !== "object") return false;
  if (/Posted anytime scorer lines/i.test(String(structured.whyNow || ""))) return true;
  return /^\s*\d+\.\s+.+anytime scorer\s+[+-]\d+/im.test(String(structured.lean || ""));
}

const FAIR_PRICE_RE =
  /\b(not mispriced|fairly priced|fairly valued|fair price|no edge|no mispricing|correctly priced|generous given|not a value|no actionable)\b/i;

const EDGE_RE = /\b(mispriced|structural value|longshot value|actionable edge)\b|\bedge\b/i;

/**
 * @param {object | null | undefined} message
 * @returns {string | null}
 */
export function resolveWcIntentFromMessage(message, userQuestion = "") {
  const rawQ = String(
    message?.question || message?.userQuestion || userQuestion || "",
  ).trim();
  const q = extractLatestUserTurnForRouting(rawQ);

  const direct = String(
    message?.wcIntent || message?.urTakeTelemetry?.wcIntent || "",
  ).toUpperCase();
  if (
    direct &&
    direct !== WC_INTENT.UNCLASSIFIED &&
    direct !== WC_INTENT.CONTINUATION
  ) {
    return direct;
  }

  if (isWcRulesQuestion(q)) return WC_INTENT.RULES;
  if (isWcFixtureScopedPlayerMarketQuestion(q)) return WC_INTENT.PLAYER_PROP;
  if (classifyWcQuestionIntent(q) === WC_INTENT.PARLAY) return WC_INTENT.PARLAY;

  const classified = classifyWcQuestionIntent(q);
  if (isWcPlayerMarketIntent(classified)) return classified;

  if (isTournamentWinnerQuestion(q)) return WC_INTENT.ENTITY_PRICING;
  if (
    /\b(vs\.?|versus|who advances)\b/i.test(q) &&
    !isWcFixtureScopedPlayerMarketQuestion(q)
  ) {
    return WC_INTENT.MATCHUP;
  }
  if (
    /\bmispriced\b/i.test(q) ||
    /\+\d{3,}/.test(q) ||
    /\bto win the (world cup|tournament)\b/i.test(q)
  ) {
    return WC_INTENT.ENTITY_PRICING;
  }

  if (
    classified !== WC_INTENT.UNCLASSIFIED &&
    classified !== WC_INTENT.CONTINUATION
  ) {
    return classified;
  }
  return null;
}

/**
 * True when API/card structured is a fixture player-market take (not matchup O/U).
 * @param {object | null | undefined} structured
 */
export function isWcStructuredPlayerMarketCard(structured) {
  if (!structured || typeof structured !== "object") return false;
  const callType = String(structured.callType || "").toLowerCase();
  if (callType.startsWith("player_market") || callType === "player_prop") {
    return true;
  }
  if (structured.playerMarketTier) return true;
  const lean = String(structured.lean || "").trim();
  return /^\s*\d+\.\s+/m.test(lean);
}

/** @param {string} question @param {object | null | undefined} message */
export function resolveWcVerdictFromQuestion(question, message = null) {
  const q = String(question || message?.userQuestion || message?.question || "").trim();
  const wcIntent = resolveWcIntentFromMessage(message, q);

  if (wcIntent === WC_INTENT.RULES) return "RULES_FACTUAL";
  if (wcIntent === WC_INTENT.MATCHUP) return "MATCHUP";
  if (wcIntent === WC_INTENT.ENTITY_PRICING) {
    const verdict = classifyWcVerdictForUi({ ...message, wcIntent }, q);
    if (verdict === "FAIR_PRICE" || verdict === "HAS_EDGE") return verdict;
    return "GENERAL";
  }
  return classifyWcVerdictForUi(message, q);
}

/**
 * @param {object | null | undefined} message
 * @returns {WcUrTakeVerdict}
 */
export function classifyWcVerdictForUi(message, userQuestion = "") {
  const wcIntent = resolveWcIntentFromMessage(message, userQuestion);
  const s = message?.structured && typeof message.structured === "object" ? message.structured : null;
  const callType = String(s?.callType || "").toLowerCase();

  if (wcIntent === WC_INTENT.RULES || callType === "rules") {
    return "RULES_FACTUAL";
  }
  if (
    callType === "player_market_pass" ||
    callType === "player_market_thin" ||
    callType === "player_market_odds" ||
    callType === "player_market_squad" ||
    callType === "player_market_verified"
  ) {
    if (hasPostedWcMatchPlayerProps(s)) return "PLAYER_MARKET_POSTED";
    return "PLAYER_MARKET_PASS";
  }
  if (isWcPlayerMarketIntent(wcIntent)) {
    if (hasPostedWcMatchPlayerProps(s)) return "PLAYER_MARKET_POSTED";
    return "PLAYER_MARKET_PASS";
  }
  if (wcIntent === WC_INTENT.MATCHUP || callType === "matchup") {
    return "MATCHUP";
  }

  const parts = [
    s?.lean,
    s?.whyNow,
    s?.edge,
    s?.call,
    message?.content,
    message?.text,
    message?.deepText,
  ]
    .filter(Boolean)
    .map(String)
    .join("\n");

  if (wcIntent === WC_INTENT.STRUCTURAL || isWcGroupSlateQuestion(userQuestion)) {
    return "GROUP_SLATE";
  }

  if (wcIntent === WC_INTENT.ENTITY_PRICING) {
    if (FAIR_PRICE_RE.test(parts)) return "FAIR_PRICE";
    if (EDGE_RE.test(parts)) return "HAS_EDGE";
    return "GENERAL";
  }

  if (FAIR_PRICE_RE.test(parts)) return "FAIR_PRICE";
  if (EDGE_RE.test(parts)) return "HAS_EDGE";

  if (/\b(vs\.?|versus|advances)\b/i.test(
    String(message?.question || message?.userQuestion || userQuestion || ""),
  )) {
    return "MATCHUP";
  }

  return "GENERAL";
}

/** @param {WcUrTakeVerdict} verdict */
export function getVerdictFollowUpChips(verdict) {
  switch (verdict) {
    case "HAS_EDGE":
      return ["Build a parlay around this.", "What kills this edge?", "What's the other side of this?"];
    case "FAIR_PRICE":
      return [
        "What's the best bet besides the moneyline?",
        "Both teams to advance?",
        "Who is mispriced instead?",
      ];
    case "RULES_FACTUAL":
      return [
        "How does this affect betting?",
        "What about group-stage ties?",
        "Show me a knockout example.",
      ];
    case "MATCHUP":
      return [
        "What's the best bet besides the moneyline?",
        "Both teams to advance?",
        "Over or under goals?",
      ];
    case "PLAYER_MARKET_PASS":
      return [
        "Best player parlays for remaining matches?",
        "Best group stage bet?",
        "Who lifts the trophy?",
      ];
    case "PLAYER_MARKET_POSTED":
      return [
        "4 player parlay for this matchup?",
        "Who wins this matchup?",
        "Over or under goals?",
      ];
    case "GROUP_SLATE":
      return [
        "Which group is the runner-up value?",
        "Who is mispriced instead?",
        "What's the best matchup on today's slate?",
      ];
    default:
      return [
        "Give me a specific number to target.",
        "What's the strongest edge here?",
        "What kills this take?",
      ];
  }
}

/** @param {WcUrTakeVerdict} verdict */
export function getVerdictNextLine(verdict) {
  switch (verdict) {
    case "HAS_EDGE":
      return "Next: what's one thing that could break this?";
    case "FAIR_PRICE":
      return "Next: what would need to change for this to become a bet?";
    case "RULES_FACTUAL":
      return "Next: how does this apply to a specific knockout bet?";
    case "MATCHUP":
      return "Next: what's the clearest angle on this matchup?";
    case "PLAYER_MARKET_PASS":
      return "Next: try a team or group angle while lineups are pending.";
    case "PLAYER_MARKET_POSTED":
      return "Next: build a parlay around the top lean.";
    case "GROUP_SLATE":
      return "Next: what would need to change for this group pick?";
    default:
      return "Next: what's one thing that could break this?";
  }
}
