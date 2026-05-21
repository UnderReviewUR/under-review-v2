/**
 * Home "Today's Edge" preview post-processing — sentence-safe trim + irrelevant-player gate.
 */

import { isLowImpactBlocklisted, LOW_IMPACT_PLAYER_BLOCKLIST } from "./lowImpactPlayerBlocklist.js";
import { trimToCompleteSentence } from "./textUtils.js";

/** @deprecated Use LOW_IMPACT_PLAYER_BLOCKLIST */
export const NBA_HOME_PREVIEW_IRRELEVANT_PLAYERS = LOW_IMPACT_PLAYER_BLOCKLIST;

const IRRELEVANT_NAME_RE = new RegExp(
  LOW_IMPACT_PLAYER_BLOCKLIST.map((n) =>
    String(n)
      .trim()
      .replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
  ).join("|"),
  "i",
);

/** Home featured angle + daily take preview field limits. */
export const HOME_FEATURED_LEAN_MAX_CHARS = 220;
export const HOME_FEATURED_REASON_MAX_CHARS = 420;

/**
 * Trim to maxLen on a complete sentence boundary only.
 * @param {string} text
 * @param {number} maxLen
 */
export function trimPreviewTextToCompleteSentences(text, maxLen) {
  return trimToCompleteSentence(text, maxLen);
}

/**
 * Drop sentences that center irrelevant deep-bench players; redact stray name mentions.
 * @param {string} text
 */
export function filterIrrelevantPlayersFromPreviewText(text) {
  const raw = String(text || "").trim();
  if (!raw || !IRRELEVANT_NAME_RE.test(raw)) return raw;

  const sentences = raw.match(/[^.!?]+[.!?]+|[^.!?]+$/g) || [raw];
  const kept = sentences
    .map((s) => s.trim())
    .filter((s) => s && !IRRELEVANT_NAME_RE.test(s));
  if (kept.length > 0) {
    const joined = kept.join(" ").replace(IRRELEVANT_NAME_RE, "").replace(/\s+/g, " ").trim();
    return IRRELEVANT_NAME_RE.test(joined) ? "" : joined;
  }

  return "";
}

/**
 * @param {string} text
 * @param {number} maxLen
 */
export function polishHomePreviewField(text, maxLen) {
  const filtered = filterIrrelevantPlayersFromPreviewText(text);
  return trimPreviewTextToCompleteSentences(filtered, maxLen);
}

/**
 * Featured angle card lean/reason — sentence-safe only.
 * @param {string} text
 * @param {number} maxLen
 */
export function polishFeaturedAnglePreviewField(text, maxLen) {
  return trimToCompleteSentence(String(text || "").trim(), maxLen);
}
