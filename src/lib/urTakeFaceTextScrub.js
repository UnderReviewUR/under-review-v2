/** Strip internal prompt / UI scaffolding that sometimes leaks into structured JSON. */
export function scrubStructuredFaceText(text) {
  let s = String(text || "");
  const patterns = [
    /\bLegs below are shown in the structured card[^.!?\n]*/gi,
    /\byour full write-up stays in the thread\.?/gi,
    /\blayout is extracted from plain text\.?/gi,
    /\b(not available|unavailable|no live odds|stale|missing (data|odds|feed|intel)|could(n'?t| not) (load|fetch|get)|unable to (load|fetch|get))[^.!?\n]*/gi,
    /\b(reference seed|static seed|cold-start)[^.!?\n]*/gi,
  ];
  for (const re of patterns) {
    s = s.replace(re, " ");
  }
  return s.replace(/\s{2,}/g, " ").replace(/^\s+|\s+$/g, "").trim();
}

/** Alias — some imports use `scrubFaceText`; same implementation as `scrubStructuredFaceText`. */
export const scrubFaceText = scrubStructuredFaceText;
