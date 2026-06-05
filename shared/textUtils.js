/**
 * Return the first non-empty string value among the arguments.
 * @param {...unknown} vals
 * @returns {string | null}
 */
export function firstNonEmpty(...vals) {
  for (const v of vals) {
    const s = v != null ? String(v).trim() : "";
    if (s) return s;
  }
  return null;
}

/** Sentence-terminal punctuation for preview trimming. */
const TERMINAL_PUNCT_RE = /[.!?]/;

/**
 * Drop trailing text after the last sentence end; return "" if no complete sentence remains.
 * @param {string} text
 */
export function dropIncompleteSentenceFragment(text) {
  const raw = String(text || "").replace(/\s+/g, " ").trim();
  if (!raw) return "";
  if (TERMINAL_PUNCT_RE.test(raw[raw.length - 1])) return raw;

  let lastEnd = -1;
  for (let i = 0; i < raw.length; i++) {
    if (TERMINAL_PUNCT_RE.test(raw[i])) lastEnd = i;
  }
  if (lastEnd < 0) return "";
  return raw.slice(0, lastEnd + 1).trim();
}

/**
 * Trim to maxChars at the last sentence end before the limit. Never cuts mid-word or mid-sentence.
 * @param {string} text
 * @param {number} maxChars
 */
export function trimToCompleteSentence(text, maxChars) {
  const raw = String(text || "").replace(/\s+/g, " ").trim();
  if (!raw) return "";

  const max = Math.max(1, Number(maxChars) || 0);
  if (raw.length <= max) return dropIncompleteSentenceFragment(raw);

  const sentences = raw.match(/[^.!?]+[.!?]+/g);
  if (sentences?.length) {
    let out = "";
    for (const s of sentences) {
      const piece = s.trim();
      const next = out ? `${out} ${piece}` : piece;
      if (next.length > max) break;
      out = next;
    }
    if (out.length >= 16) return dropIncompleteSentenceFragment(out);
    const first = sentences[0].trim();
    if (first.length <= max) return dropIncompleteSentenceFragment(first);
  }

  const window = raw.slice(0, max);
  let lastPunct = -1;
  for (let i = 0; i < window.length; i++) {
    if (TERMINAL_PUNCT_RE.test(window[i])) lastPunct = i;
  }
  if (lastPunct < 0) return "";

  return dropIncompleteSentenceFragment(window.slice(0, lastPunct + 1).trim());
}
