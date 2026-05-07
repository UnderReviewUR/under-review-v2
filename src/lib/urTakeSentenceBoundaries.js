/**
 * Sentence boundaries for UR Take chat display — decimals must not read as full stops.
 * (e.g. "6.5-7.5" and "6.4 assists" must not split into "6." + "5…" / "6." + "4…")
 */

export function isUrTakeDecimalSeparator(text, i) {
  if (String(text[i] || "") !== ".") return false;
  if (i <= 0 || i + 1 >= text.length) return false;
  return /\d/.test(text[i - 1]) && /\d/.test(text[i + 1]);
}

/**
 * First sentence + remainder (for gradient headline vs body).
 * @returns {{ first: string, rest: string }}
 */
export function takeFirstSentenceSpan(text) {
  const t = String(text || "");
  if (!t.trim()) return { first: "", rest: "" };

  for (let i = 0; i < t.length; i++) {
    const c = t[i];
    if (c !== "." && c !== "!" && c !== "?") continue;
    if (isUrTakeDecimalSeparator(t, i)) continue;

    let end = i + 1;
    while (end < t.length && (t[end] === "!" || t[end] === "?")) end += 1;

    return {
      first: t.slice(0, end).trim(),
      rest: t.slice(end).trim(),
    };
  }

  return { first: "", rest: t.trim() };
}

/**
 * Split into sentences for paragraph clustering (display-only).
 * @returns {string[]}
 */
export function splitSentencesForUrTakeDisplay(source) {
  const t = String(source || "").trim();
  if (!t) return [""];

  const sentences = [];
  let segStart = 0;

  for (let i = 0; i < t.length; i++) {
    const c = t[i];
    if (c !== "." && c !== "!" && c !== "?") continue;
    if (isUrTakeDecimalSeparator(t, i)) continue;

    let end = i + 1;
    while (end < t.length && (t[end] === "!" || t[end] === "?")) end += 1;

    const piece = t.slice(segStart, end).trim();
    if (piece) sentences.push(piece);
    segStart = end;
    while (segStart < t.length && /\s/.test(t[segStart])) segStart += 1;
    i = end - 1;
  }

  const tail = t.slice(segStart).trim();
  if (tail) sentences.push(tail);

  return sentences.length > 0 ? sentences : [t];
}
