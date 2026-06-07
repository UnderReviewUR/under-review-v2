/**
 * Cross-sport UR Take intent — lightweight classifier for sports without a dedicated module.
 * Intents are routing hints; unmatched questions fall through to GENERAL.
 */

/** @typedef {"GENERAL"|"CONTINUATION"|"RULES"|"MATCHUP"|"PRICING"|"PROP_PLAYER"|"LIVE"|"STRUCTURAL"|"UNCLASSIFIED"} GenericUrTakeIntent */

export const GENERIC_INTENT = {
  GENERAL: "GENERAL",
  CONTINUATION: "CONTINUATION",
  RULES: "RULES",
  MATCHUP: "MATCHUP",
  PRICING: "PRICING",
  PROP_PLAYER: "PROP_PLAYER",
  LIVE: "LIVE",
  STRUCTURAL: "STRUCTURAL",
  UNCLASSIFIED: "UNCLASSIFIED",
};

const CONTINUATION_SIGNAL_RE =
  /\b(what about|tell me more|go deeper|what kills|other side|build a parlay|that take|this edge|follow[- ]?up|same game|them|they)\b/i;

const RULES_SIGNAL_RE =
  /\b(extra time|penalties|penalty shootout|tiebreaker|how does knockout|playoff rules|tournament rules|what are the rules|settlement rules)\b/i;

const LIVE_SIGNAL_RE =
  /\b(live|in[- ]game|right now|q[1-4]\b|quarter|halftime|second half|clock|score is|we're in|lap \d+|inning \d+)\b/i;

const PRICING_SIGNAL_RE =
  /\b(mispriced|outright|fairly priced|fair price|overpriced|underpriced|value at|\+[1-9]\d{2,})\b/i;

const MATCHUP_SIGNAL_RE =
  /\b(vs\.?|versus|who wins tonight|who wins this|head to head|h2h|who advances|matchup)\b/i;

const PROP_SIGNAL_RE =
  /\b(prop|points|rebounds|assists|threes|strikeouts?|home run|anytime scorer|first goal|under \d|over \d|pra|double[- ]double)\b/i;

const STRUCTURAL_SIGNAL_RE =
  /\b(best value|longshot|cleanest|structural|favorite|contender|dark horse|sleepers?)\b/i;

/**
 * @param {string} question
 * @param {object[]} [history]
 * @returns {GenericUrTakeIntent}
 */
export function classifyGenericUrTakeIntent(question, history = []) {
  const q = String(question || "").trim();
  const ql = q.toLowerCase();
  if (!q) return GENERIC_INTENT.UNCLASSIFIED;

  if (RULES_SIGNAL_RE.test(ql) && !PRICING_SIGNAL_RE.test(ql)) {
    return GENERIC_INTENT.RULES;
  }
  if (LIVE_SIGNAL_RE.test(ql)) return GENERIC_INTENT.LIVE;
  if (
    CONTINUATION_SIGNAL_RE.test(ql) &&
    Array.isArray(history) &&
    history.length > 0
  ) {
    return GENERIC_INTENT.CONTINUATION;
  }
  if (PROP_SIGNAL_RE.test(ql)) return GENERIC_INTENT.PROP_PLAYER;
  if (MATCHUP_SIGNAL_RE.test(ql)) return GENERIC_INTENT.MATCHUP;
  if (PRICING_SIGNAL_RE.test(ql)) return GENERIC_INTENT.PRICING;
  if (STRUCTURAL_SIGNAL_RE.test(ql)) return GENERIC_INTENT.STRUCTURAL;

  return GENERIC_INTENT.GENERAL;
}
