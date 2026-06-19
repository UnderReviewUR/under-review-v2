/**
 * Phase 3 — named-leg player prop cards should not show fixture prop-board list face.
 */

const UR_TAKE_LOADING_PLACEHOLDERS = new Set([
  "ANALYZING...",
  "Analyzing…",
  "Pulling live lines…",
]);

/**
 * @param {string} [text]
 */
export function isUrTakeLoadingPlaceholder(text) {
  const t = String(text || "").trim();
  if (!t) return false;
  if (UR_TAKE_LOADING_PLACEHOLDERS.has(t)) return true;
  return /^ANALYZING/i.test(t);
}

/**
 * @param {object} [opts]
 * @param {string} [opts.call]
 * @param {string} [opts.lean]
 * @param {boolean} [opts.wcNamedPlayerPropsCard]
 */
export function isWcNamedLegPropsStructuredCard(opts = {}) {
  if (opts.wcNamedPlayerPropsCard === true) return true;
  const call = String(opts.call || "").trim();
  const lean = String(opts.lean || "").trim();
  if (/\d+\s+of\s+\d+\s+playable/i.test(call)) return true;
  if (
    /^\s*\d+\.\s+/m.test(lean) &&
    (/playable/i.test(lean) || /juice,\s*skip/i.test(lean) || /No \d+\.\d+ full-match/i.test(lean))
  ) {
    return true;
  }
  return false;
}

/**
 * @param {string} [sportHint]
 */
export function urTakeLoadingLabelForSport(sportHint) {
  const sport = String(sportHint || "").trim().toLowerCase();
  if (sport === "worldcup") return "Pulling live lines…";
  return "Analyzing…";
}
