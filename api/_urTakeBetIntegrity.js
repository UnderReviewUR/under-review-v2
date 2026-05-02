/**
 * Deterministic post-pass on UR Take prose: factual stat terminology + betting language hygiene.
 * Does not call the model again — soft repair + observability only.
 */

/** Shown when double-double is paired with cited stats that cannot qualify (all cited cats &lt; 10). */
export const STAT_TERM_DD_REPLACEMENT =
  "Double-double requires 10+ in two categories; this leg depends mainly on points plus rebounds/assists reaching that threshold.";

/** Shown when triple-double is paired with any cited stat still below 10. */
export const STAT_TERM_TD_REPLACEMENT =
  "Triple-double requires 10+ in three categories; each leg must clear double digits before it counts.";

const DD_MENTION = /\bdouble[-\s]?double\b/i;
const TD_MENTION = /\btriple[-\s]?double\b/i;

/**
 * Values explicitly tied to stat categories (pts/reb/ast/etc.).
 * @param {string} sentence
 * @returns {number[]}
 */
function extractTaggedStatValues(sentence) {
  const vals = [];
  const re =
    /(\d+(?:\.\d+)?)\s*(?:pts|points|ppg|PPG|REB|reb|rebounds?|AST|ast|assists?|STL|stl|steals?|BLK|blk|blocks?)/gi;
  let m;
  while ((m = re.exec(sentence))) {
    const v = parseFloat(m[1]);
    if (Number.isFinite(v)) vals.push(v);
  }
  return vals;
}

function extractPlainPlusPair(sentence) {
  const m = sentence.match(/\b(\d+(?:\.\d+)?)\s*\+\s*(\d+(?:\.\d+)?)\b/);
  if (!m) return null;
  return [parseFloat(m[1]), parseFloat(m[2])];
}

function extractHyphenTriple(sentence) {
  const m = sentence.match(/\b(\d{1,2})\s*-\s*(\d{1,2})\s*-\s*(\d{1,2})\b/);
  if (!m) return null;
  return [Number(m[1]), Number(m[2]), Number(m[3])];
}

function isEducationalStatDefinition(sentence) {
  return /\b10\s*\+|10\s+or\s+more|two\s+categories.*10|three\s+categories.*10/i.test(sentence);
}

/**
 * Double-double mentioned with two cited stat values, both strictly below 10 — illogical as a DD outcome.
 */
export function sentenceFailsDoubleDoubleLogic(sentence) {
  const s = String(sentence || "").trim();
  if (!s || !DD_MENTION.test(s)) return false;
  if (isEducationalStatDefinition(s)) return false;

  let vals = extractTaggedStatValues(s);
  if (vals.length < 2) {
    const pair = extractPlainPlusPair(s);
    if (pair) vals = pair;
  }
  if (vals.length < 2) return false;
  return vals.every((v) => v < 10);
}

/**
 * Triple-double mentioned with three cited stat values where any is still below 10.
 */
export function sentenceFailsTripleDoubleLogic(sentence) {
  const s = String(sentence || "").trim();
  if (!s || !TD_MENTION.test(s)) return false;
  if (isEducationalStatDefinition(s)) return false;

  let vals = extractTaggedStatValues(s);
  if (vals.length < 3) {
    const tri = extractHyphenTriple(s);
    if (tri) vals = tri;
  }
  if (vals.length < 3) return false;
  return vals.some((v) => v < 10);
}

/**
 * Rewrite sentences that misuse double-double / triple-double relative to cited numbers.
 * @param {string} text
 * @param {string[]} issues
 * @returns {string}
 */
export function rewriteInvalidStatTerminology(text, issues) {
  const raw = String(text || "");
  if (!raw.trim()) return raw;

  const blocks = raw.split(/\n\n+/);
  const outBlocks = blocks.map((block) => {
    const sentences = block.split(/(?<=[.!?])\s+/);
    const rebuilt = sentences.map((sentence) => {
      const trimmed = sentence.trim();
      if (!trimmed) return sentence;

      if (sentenceFailsDoubleDoubleLogic(trimmed)) {
        issues.push("invalid_stat_term_logic");
        return STAT_TERM_DD_REPLACEMENT;
      }
      if (sentenceFailsTripleDoubleLogic(trimmed)) {
        issues.push("invalid_stat_term_logic");
        return STAT_TERM_TD_REPLACEMENT;
      }
      return sentence;
    });
    return rebuilt.join(" ");
  });

  return outBlocks.join("\n\n");
}

/**
 * @param {string} text
 * @param {object} [_options]
 * @returns {{ text: string, issues: string[], modified: boolean }}
 */
export function applyBetIntegrityPostProcess(text, _options = {}) {
  let s = String(text ?? "");
  const issues = [];
  if (!s.trim()) {
    return { text: s, issues, modified: false };
  }
  const original = s;

  s = rewriteInvalidStatTerminology(s, issues);
  s = softenUnsupportedHypeLanguage(s, issues);
  s = normalizeWhitespace(s);

  const modified = s !== original;
  return {
    text: s,
    issues: [...new Set(issues)],
    modified,
  };
}

function normalizeWhitespace(t) {
  return String(t || "")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/**
 * Hype / certainty softening — separate from factual stat terminology (see rewriteInvalidStatTerminology).
 */
function softenUnsupportedHypeLanguage(text, issues) {
  let s = String(text || "");

  const phraseReplacements = [
    [/\bnearly automatic\b/gi, "strong vs profile when hit-rate supports it"],
    [/\bbasically automatic\b/gi, "often vs weak matchups (confirm hit-rate)"],
    [/\bguaranteed\b/gi, "not priced as certainty — verify hit-rate"],
    [/\bcan't miss\b/gi, "high-variance lean"],
    [/\bfree money\b/gi, "mispriced lean"],
    [/\bmortal lock\b/gi, "high-conviction lean"],
    [/\bstone\s*-?\s*cold lock\b/gi, "high-conviction lean"],
    [/\bsure thing\b/gi, "plus-edge lean"],
    [/\bis automatic\b/gi, "is a strong lean only when hit-rate backs it"],
    [/\bare automatic\b/gi, "are strong leans only when hit-rate backs them"],
    [/\bautomatic double-double\b/gi, "double-double profile vs this matchup"],
  ];

  for (const [re, rep] of phraseReplacements) {
    if (re.test(s)) {
      issues.push("softened_hype_language");
      s = s.replace(re, rep);
    }
  }

  const globalPct = /\b\d{1,3}\s*%/.test(s);
  if (!globalPct && /\b(prop|bet|play|parlay|leg|pick)\b/i.test(s) && /\bthe lock\b/i.test(s)) {
    issues.push("softened_lock_metaphor");
    s = s.replace(/\bthe lock\b/gi, "the lean");
  }

  return s;
}
