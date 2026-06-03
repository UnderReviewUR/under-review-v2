/**
 * World Cup UR Take — verdict classification for follow-up UX.
 */

/** @typedef {"HAS_EDGE"|"FAIR_PRICE"|"RULES_FACTUAL"|"MATCHUP"|"GENERAL"} WcUrTakeVerdict */

const FAIR_PRICE_RE =
  /\b(not mispriced|fairly priced|fair price|no edge|no mispricing|correctly priced|generous given|not a value|pass\b|no play\b)\b/i;

const EDGE_RE = /\b(mispriced|value|edge|longshot value|structural value|target)\b/i;

const RULES_RE =
  /\b(extra time|penalty shootout|penalties|single elimination|away goals|tiebreaker|90.?minute)\b/i;

/**
 * @param {object | null | undefined} message
 * @returns {WcUrTakeVerdict}
 */
export function classifyWcVerdictForUi(message) {
  const structured = message?.structured && typeof message.structured === "object" ? message.structured : null;
  const parts = [
    structured?.lean,
    structured?.whyNow,
    structured?.edge,
    structured?.call,
    message?.content,
    message?.text,
    message?.deepText,
  ]
    .filter(Boolean)
    .map(String)
    .join("\n");

  if (RULES_RE.test(parts) && !EDGE_RE.test(String(structured?.edge || ""))) {
    return "RULES_FACTUAL";
  }

  if (FAIR_PRICE_RE.test(parts)) return "FAIR_PRICE";
  if (EDGE_RE.test(parts)) return "HAS_EDGE";

  const sport = String(message?.sport || "").toLowerCase();
  if (sport === "worldcup" && /\b(vs\.?|versus|advances)\b/i.test(String(message?.question || ""))) {
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
        "What would need to change?",
        "Who is mispriced instead?",
        "Compare to similar contenders.",
      ];
    case "RULES_FACTUAL":
      return [
        "How does this affect betting?",
        "What about group-stage ties?",
        "Show me a knockout example.",
      ];
    case "MATCHUP":
      return [
        "What's the other side?",
        "Give me a specific number to target.",
        "What breaks this read?",
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
    default:
      return "Next: what's one thing that could break this?";
  }
}
