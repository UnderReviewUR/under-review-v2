/** Strip internal prompt / UI scaffolding that sometimes leaks into structured JSON. */
export function scrubStructuredFaceText(text) {
  let s = String(text || "");
  const patterns = [
    /\bLegs below are shown in the structured card[^.!?\n]*/gi,
    /\byour full write-up stays in the thread\.?/gi,
    /\blayout is extracted from plain text\.?/gi,
  ];
  for (const re of patterns) {
    s = s.replace(re, " ");
  }
  return s.replace(/\s{2,}/g, " ").replace(/^\s+|\s+$/g, "").trim();
}
