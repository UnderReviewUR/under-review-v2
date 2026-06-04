/**
 * NBA UR Take — verdict + follow-up chip routing (mirrors WC pattern).
 */

import {
  classifyNbaQuestionIntent,
  NBA_INTENT,
} from "./nbaUrTakeIntent.js";

/** @typedef {"HAS_EDGE"|"FAIR_PRICE"|"SERIES"|"FINALS_MVP"|"MATCHUP"|"LIVE_IN_GAME"|"GENERAL"} NbaUrTakeVerdict */

const FAIR_PRICE_RE =
  /\b(not mispriced|fairly priced|fairly valued|fair price|no edge|no mispricing|correctly priced|not a value|no actionable)\b/i;

const EDGE_RE =
  /\b(mispriced|structural value|actionable edge|longshot value)\b|\bedge\b/i;

/**
 * @param {object | null | undefined} message
 * @param {string} [userQuestion]
 */
export function resolveNbaIntentFromMessage(message, userQuestion = "") {
  const q = String(
    message?.question || message?.userQuestion || userQuestion || "",
  ).trim();

  const fromLog = message?.nbaRelevance?.nbaIntent || message?.urTakeTelemetry?.nbaIntent;
  if (fromLog) return String(fromLog);

  const classified = classifyNbaQuestionIntent(q);
  if (classified !== NBA_INTENT.UNCLASSIFIED && classified !== NBA_INTENT.CONTINUATION) {
    return classified;
  }
  return null;
}

/**
 * @param {object | null | undefined} message
 * @param {string} [userQuestion]
 * @returns {NbaUrTakeVerdict}
 */
export function classifyNbaVerdictForUi(message, userQuestion = "") {
  const nbaIntent = resolveNbaIntentFromMessage(message, userQuestion);
  const parts = collectNbaVerdictTextParts(message);

  if (nbaIntent === NBA_INTENT.SERIES_WINNER) {
    if (FAIR_PRICE_RE.test(parts)) return "FAIR_PRICE";
    if (EDGE_RE.test(parts)) return "HAS_EDGE";
    return "SERIES";
  }
  if (nbaIntent === NBA_INTENT.FINALS_MVP) {
    if (FAIR_PRICE_RE.test(parts)) return "FAIR_PRICE";
    if (EDGE_RE.test(parts)) return "HAS_EDGE";
    return "FINALS_MVP";
  }
  if (nbaIntent === NBA_INTENT.LIVE_IN_GAME) return "LIVE_IN_GAME";
  if (nbaIntent === NBA_INTENT.PREGAME_MATCHUP) return "MATCHUP";

  if (FAIR_PRICE_RE.test(parts)) return "FAIR_PRICE";
  if (EDGE_RE.test(parts)) return "HAS_EDGE";
  if (/\b(series|finals)\b/i.test(parts)) return "SERIES";

  return "GENERAL";
}

/**
 * @param {string} question
 * @param {object | null | undefined} message
 */
export function resolveNbaVerdictFromQuestion(question, message = null) {
  return classifyNbaVerdictForUi(message, String(question || "").trim());
}

/**
 * @param {object | null | undefined} message
 */
function collectNbaVerdictTextParts(message) {
  const s = message?.structured && typeof message.structured === "object" ? message.structured : null;
  return [
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
}

/**
 * @param {NbaUrTakeVerdict} verdict
 * @param {string} [nbaIntent]
 */
export function getNbaVerdictFollowUpChips(verdict, nbaIntent = null) {
  const intent = String(nbaIntent || "").toUpperCase();

  if (verdict === "HAS_EDGE") {
    return [
      "What kills this edge?",
      "Build a parlay around this.",
      "What's the other side of this?",
    ];
  }
  if (verdict === "FAIR_PRICE") {
    return [
      "What would need to change?",
      "Who is mispriced instead?",
      "Compare to the other side.",
    ];
  }
  if (verdict === "SERIES" || intent === NBA_INTENT.SERIES_WINNER) {
    return [
      "What's the other side?",
      "Give me a specific number to target.",
      "What breaks this series read?",
    ];
  }
  if (verdict === "FINALS_MVP" || intent === NBA_INTENT.FINALS_MVP) {
    return [
      "Who is mispriced instead?",
      "What's the other side on MVP?",
      "Give me a specific number to target.",
    ];
  }
  if (verdict === "LIVE_IN_GAME" || intent === NBA_INTENT.LIVE_IN_GAME) {
    return [
      "What's the live lean now?",
      "What kills this in-game edge?",
      "Best live prop angle?",
    ];
  }
  if (verdict === "MATCHUP" || intent === NBA_INTENT.PREGAME_MATCHUP) {
    return [
      "What's the other side?",
      "What breaks this read?",
      "Give me a specific number to target.",
    ];
  }
  return [
    "Give me a specific number to target.",
    "What's the strongest edge here?",
    "What kills this take?",
  ];
}

/**
 * Drop chips that fight a clear verdict (e.g. "mispriced instead" after FAIR_PRICE).
 * @param {string[]} chips
 * @param {NbaUrTakeVerdict} verdict
 */
export function filterNbaFollowUpsForVerdict(chips, verdict) {
  const list = Array.isArray(chips) ? chips : [];
  if (verdict === "FAIR_PRICE") {
    return list.filter((c) => !/\bbuild a parlay\b/i.test(c));
  }
  if (verdict === "HAS_EDGE") {
    return list.filter((c) => !/\bwho is mispriced instead\b/i.test(c));
  }
  if (verdict === "SERIES" || verdict === "FINALS_MVP") {
    return list.filter((c) => !/\bbuild a parlay\b/i.test(c) || list.length <= 2);
  }
  return list;
}

/**
 * @param {NbaUrTakeVerdict} verdict
 */
export function getNbaVerdictNextLine(verdict) {
  switch (verdict) {
    case "HAS_EDGE":
      return "Next: what's one thing that could break this?";
    case "FAIR_PRICE":
      return "Next: what would need to change for this to become a bet?";
    case "SERIES":
      return "Next: what's the other side on the series price?";
    case "FINALS_MVP":
      return "Next: who is mispriced instead on the MVP board?";
    case "LIVE_IN_GAME":
      return "Next: what's the live lean if the script flips?";
    case "MATCHUP":
      return "Next: what's the clearest angle on this matchup?";
    default:
      return "Next: what's one thing that could break this?";
  }
}
