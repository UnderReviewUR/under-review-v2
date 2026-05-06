/** UR Take closing-line extraction (pure); shared with helpers.jsx + unit tests. */

/** Single full line that reads as an explicit closing / verdict (scanned from bottom). */
function lineMatchesExplicitClosing(line) {
  const L = line.trim();
  if (!L) return false;
  if (/^(Look for|Back|Fade|Take the)\b/i.test(L)) return true;
  if (/\bis the play\b/i.test(L)) return true;
  if (/\b(lean over|lean under)\b/i.test(L) && L.length < 220) return true;
  if (/^\s*(?:the\s+)?(?:over|under)\s+[\d.]+\b/i.test(L)) return true;
  if (
    /\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)+\b/.test(L) &&
    /\d+(?:\.\d+)?/.test(L) &&
    /\b(over|under|points?|rebounds?|PRA)\b/i.test(L)
  ) {
    return true;
  }
  return false;
}

export function isSubstantiveClosing(text) {
  if (!text) return false;
  const stripped = text.replace(/[.,!?;:\s]/g, "").trim();
  return stripped.length >= 3;
}

export function splitLastSentence(block) {
  const t = block.trim();
  if (!t) return { body: "", last: "" };
  for (let i = t.length - 1; i > 0; i--) {
    const c = t[i];
    if (c === "." || c === "!" || c === "?") {
      if (c === "." && /\d/.test(t[i - 1])) {
        const nextCh = t[i + 1];
        if (nextCh && /\d/.test(nextCh)) continue;
      }
      const before = t.slice(0, i).trimEnd();
      if (!before) continue;
      const last = t.slice(i).trim();
      const meaningfulLast = last.replace(/[.,!?]/g, "").trim();
      if (meaningfulLast.length < 3) continue;
      return { body: before, last };
    }
  }
  return { body: "", last: t };
}

/**
 * Pull closing call from main narrative (after confidence peel, before Live trigger was split out).
 * Explicit patterns first; otherwise last sentence as verdict hero (two+ sentences only).
 */
export function peelClosingFromMain(mainChunk) {
  const lines = mainChunk.split("\n");
  for (let i = lines.length - 1; i >= 0; i--) {
    const line = lines[i].trim();
    if (!line) continue;
    if (lineMatchesExplicitClosing(line)) {
      if (!isSubstantiveClosing(line)) continue;
      const rest = [...lines.slice(0, i), ...lines.slice(i + 1)].join("\n").trimEnd();
      return { rest, closing: line };
    }
  }

  const { body, last } = splitLastSentence(mainChunk);
  if (!last || !body.trim()) {
    return { rest: mainChunk, closing: null };
  }
  const closing = last.trim();
  if (!isSubstantiveClosing(closing)) {
    return { rest: mainChunk, closing: null };
  }
  return { rest: body.trimEnd(), closing };
}
