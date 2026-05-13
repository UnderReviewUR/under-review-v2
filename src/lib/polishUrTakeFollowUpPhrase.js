/**
 * Turn follow-up chip copy into short, complete phrases (not tag fragments).
 * Applied to API + heuristic chips before display.
 */
const EXACT = new Map(
  [
    ["best single leg", "What's the best single leg?"],
    ["sharpen to 2 legs", "Sharpen this to 2 legs."],
    ["what breaks this parlay", "What breaks this parlay?"],
    ["what breaks this parlay?", "What breaks this parlay?"],
    ["build a parlay around this", "Build a parlay around this."],
    ["give me the other side", "What's the other side of this?"],
    ["what kills this edge?", "What kills this edge?"],
    ["what kills this edge", "What kills this edge?"],
    ["which is the safest single bet?", "Which is the safest single bet?"],
    ["which is the safest single bet", "Which is the safest single bet?"],
    ["rank these by confidence", "Rank these by confidence."],
    ["build a parlay from these", "Build a parlay from these."],
    ["give me a specific number to target", "Give me a specific number to target."],
    ["what's the strongest edge here?", "What's the strongest edge here?"],
    ["whats the strongest edge here?", "What's the strongest edge here?"],
    ["what's the strongest edge here", "What's the strongest edge here?"],
    ["what kills this take?", "What kills this take?"],
    ["what kills this take", "What kills this take?"],
  ].map(([k, v]) => [k.toLowerCase(), v]),
);

function stripTrailingPunct(s) {
  return String(s || "")
    .trim()
    .replace(/[.?!…]+$/u, "")
    .trim();
}

function ensureTerminal(s) {
  const t = String(s || "").trim();
  if (!t) return t;
  if (/[.?!…]$/u.test(t)) return t;
  const lower = t.toLowerCase();
  if (
    lower.startsWith("what ") ||
    lower.startsWith("which ") ||
    lower.startsWith("who ") ||
    lower.startsWith("how ") ||
    lower.startsWith("when ") ||
    lower.startsWith("why ") ||
    lower.startsWith("where ") ||
    lower.startsWith("give ") ||
    lower.startsWith("show ") ||
    lower.startsWith("tell ") ||
    lower.startsWith("is ") ||
    lower.startsWith("are ") ||
    lower.startsWith("can ") ||
    lower.startsWith("could ") ||
    lower.startsWith("should ")
  ) {
    return `${t}?`;
  }
  if (lower.startsWith("build ") || lower.startsWith("sharpen ") || lower.startsWith("rank ")) {
    return t.endsWith(".") ? t : `${t}.`;
  }
  return `${t}.`;
}

/**
 * @param {string} raw
 * @returns {string}
 */
export function polishUrTakeFollowUpPhrase(raw) {
  const trimmed = String(raw || "").trim().replace(/\s+/g, " ");
  if (trimmed.length < 3) return trimmed;

  const key = stripTrailingPunct(trimmed).toLowerCase();
  if (EXACT.has(key)) return EXACT.get(key);

  if (trimmed.length > 72) return `${trimmed.slice(0, 69)}…`;

  if (/[.?!…]$/u.test(trimmed)) return trimmed;

  return ensureTerminal(trimmed);
}
