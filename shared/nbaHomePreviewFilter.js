/**
 * Home "Today's Edge" preview post-processing — sentence-safe trim + irrelevant-player gate.
 */

/** End-of-bench names that must not appear in structural home preview copy. */
export const NBA_HOME_PREVIEW_IRRELEVANT_PLAYERS = [
  "Bismack Biyombo",
  "Biyombo",
];

const IRRELEVANT_NAME_RE = new RegExp(
  NBA_HOME_PREVIEW_IRRELEVANT_PLAYERS.map((n) =>
    String(n)
      .trim()
      .replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
  ).join("|"),
  "i",
);

/**
 * Trim to maxLen without cutting mid-word; prefer ending on sentence punctuation.
 * @param {string} text
 * @param {number} maxLen
 */
export function trimPreviewTextToCompleteSentences(text, maxLen) {
  const raw = String(text || "").replace(/\s+/g, " ").trim();
  if (!raw) return "";
  if (raw.length <= maxLen) return raw;

  const slice = raw.slice(0, maxLen);
  const sentences = slice.match(/[^.!?]+[.!?]+/g);
  if (sentences && sentences.length > 0) {
    let out = "";
    for (const s of sentences) {
      const next = out ? `${out} ${s.trim()}` : s.trim();
      if (next.length > maxLen) break;
      out = next;
    }
    if (out.length >= 24) return out.trim();
  }

  const lastSpace = slice.lastIndexOf(" ");
  if (lastSpace > 40) return `${slice.slice(0, lastSpace).trim()}…`;
  return `${slice.trim()}…`;
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

  const redacted = raw.replace(IRRELEVANT_NAME_RE, "").replace(/\s+/g, " ").trim();
  return IRRELEVANT_NAME_RE.test(redacted) ? "" : redacted;
}

/**
 * @param {string} text
 * @param {number} maxLen
 */
export function polishHomePreviewField(text, maxLen) {
  const filtered = filterIrrelevantPlayersFromPreviewText(text);
  return trimPreviewTextToCompleteSentences(filtered, maxLen);
}
