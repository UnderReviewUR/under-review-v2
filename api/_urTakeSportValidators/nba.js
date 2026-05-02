/**
 * NBA-specific sport lint beyond global DD/TD + assist heuristics (handled in _urTakeOutputQA).
 * Reserved for future structured checks (minutes, injury flags from context).
 *
 * @param {string} _text
 * @param {object} [_options]
 * @returns {Array<import("./_shared.js").SportQaIssue>}
 */
export function lintNbaOutput(_text, _options = {}) {
  return [];
}
