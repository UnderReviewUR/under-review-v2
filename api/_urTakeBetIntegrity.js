/**
 * Deterministic post-pass on UR Take prose: betting language hygiene + issue tagging.
 * Does not call the model again — soft repair + observability only.
 */

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
 * Replace absolute betting clichés (when model ignores prompt bans).
 * Avoid replacing substrings inside words (handled via phrase-level patterns).
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
