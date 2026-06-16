/**
 * World Cup card — sentence boundaries for complete-sentence card face (Option 1).
 */

const ABBREV_ENDINGS = new Set([
  "mr",
  "mrs",
  "ms",
  "dr",
  "vs",
  "etc",
  "e.g",
  "i.e",
  "st",
  "jr",
  "sr",
  "prof",
  "rep",
  "sen",
  "gov",
  "gen",
  "col",
  "sgt",
  "capt",
  "lt",
  "ft",
  "dept",
  "approx",
  "min",
  "max",
  "vol",
  "no",
  "nos",
  "u.s",
  "u.k",
]);

/**
 * @param {string} text
 * @returns {string[]}
 */
export function splitWcSentences(text) {
  const t = String(text || "")
    .replace(/\s+/g, " ")
    .trim();
  if (!t) return [];

  /** @type {string[]} */
  const out = [];
  let buf = "";
  let depth = 0;

  for (let i = 0; i < t.length; i += 1) {
    const ch = t[i];
    buf += ch;

    if (ch === "(") depth += 1;
    else if (ch === ")" && depth > 0) depth -= 1;

    if (depth > 0) continue;
    if (ch !== "." && ch !== "!" && ch !== "?") continue;

    if (ch === ".") {
      const prev = t[i - 1] || "";
      const next = t[i + 1] || "";
      if (/\d/.test(prev) && /\d/.test(next)) continue;

      const wordBefore = buf.match(/([A-Za-zÀ-ÖØ-öø-ÿ]+)\.\s*$/);
      if (wordBefore) {
        const w = wordBefore[1].toLowerCase();
        if (w.length === 1 || ABBREV_ENDINGS.has(w)) continue;
      }
    }

    const tail = t.slice(i + 1);
    if (!tail.length || /^\s/.test(tail)) {
      out.push(buf.trim());
      buf = "";
      while (i + 1 < t.length && /\s/.test(t[i + 1])) i += 1;
      continue;
    }
    if (/^[A-Z("']/.test(tail.trimStart())) {
      out.push(buf.trim());
      buf = "";
    }
  }

  if (buf.trim()) out.push(buf.trim());
  return out.filter(Boolean);
}

/**
 * @param {string} text
 */
export function wcWordCount(text) {
  return String(text || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
}

/**
 * @param {string} text
 */
export function endsWithEllipsisTruncation(text) {
  return /…\s*$/.test(String(text || "").trim());
}

/**
 * @param {string} text
 * @param {{ allowListStub?: boolean }} [opts]
 */
export function isWcCompleteSentence(text, opts = {}) {
  const t = String(text || "").trim();
  if (!t) return false;
  if (endsWithEllipsisTruncation(t)) return false;
  if (opts.allowListStub && /^top \d+\s*[—–-]\s*tap to view/i.test(t)) return true;
  return /[.!?]["']?\s*$/.test(t);
}

/**
 * @param {string} text
 * @param {number} [maxWords]
 */
export function capWcDeepWords(text, maxWords = 600) {
  const words = String(text || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (words.length <= maxWords) return words.join(" ");
  return `${words.slice(0, maxWords).join(" ")}…`;
}

/**
 * Word-cap deep copy without flattening paragraph breaks (slate / group boards).
 * @param {string} text
 * @param {number} [maxWords]
 */
export function capWcStructuredDeep(text, maxWords = 600) {
  const raw = String(text || "").trim();
  if (!raw) return "";
  if (!raw.includes("\n")) return capWcDeepWords(raw, maxWords);

  const blocks = raw
    .split(/\n\n+/)
    .map((b) => b.trim())
    .filter(Boolean);
  if (!blocks.length) return capWcDeepWords(raw, maxWords);

  let wordCount = 0;
  /** @type {string[]} */
  const kept = [];
  for (const block of blocks) {
    const blockWords = block.split(/\s+/).filter(Boolean);
    if (!blockWords.length) continue;
    if (wordCount + blockWords.length > maxWords) {
      const remaining = maxWords - wordCount;
      if (remaining > 10) {
        kept.push(`${blockWords.slice(0, remaining).join(" ")}…`);
      }
      break;
    }
    kept.push(block);
    wordCount += blockWords.length;
  }
  return kept.join("\n\n");
}

