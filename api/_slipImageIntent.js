/**
 * Slip-image routing owner (single source of truth).
 *
 * This module decides whether an image message should be treated as a betting-slip route.
 * It only returns route metadata/flags and does NOT run the slip vision pipeline itself.
 * `api/ur-take.js` should only orchestrate downstream behavior using this module's returned metadata
 * (for example, deciding whether to invoke vision and whether to downgrade vague routes after inventory).
 */

function normalizeSlipQuestionText(v) {
  return String(v || "").trim().toLowerCase();
}

function hasExplicitSlipLanguageInQuestion(q) {
  const s = normalizeSlipQuestionText(q);
  return (
    s.includes("slip") ||
    s.includes("parlay") ||
    s.includes("entry") ||
    s.includes("ticket") ||
    s.includes("pick em") ||
    s.includes("pick'em") ||
    s.includes("bet slip") ||
    s.includes("my slip") ||
    s.includes("my ticket")
  );
}

/** Text cues that suggest a betting slip / sportsbook screenshot — without requiring the word "slip". */
function hasBettingSlipKeywordSignals(q) {
  const s = normalizeSlipQuestionText(q);
  if (!s) return false;
  return (
    /\b(see attached|attached|paste[sd]?)\b/i.test(s) ||
    /\banalyze\b[\s\S]{0,48}\b(options|lines|markets|screenshot|odds)\b/i.test(s) ||
    /\bwhat'?s best to (play|bet)\b/i.test(s) ||
    /\b(odds|spread|moneyline|ml|totals?|over|under|o\/u|\bou\b|parlay|same[\s.\-]*game|sgp|pick'?em|pick em|entries|boost|leg|legs|prop|props|stake|units?|payout|book|sportsbook|draftkings|fanduel|betmgm|caesars|underdog|prizepicks|prize\s*picks)\b/i.test(
      s,
    ) ||
    /\b(pra|pts|points|rebounds|assists|rushing|receiving|passing|yards|touchdown|td|strikeout|home\s*run)\b/i.test(
      s,
    ) ||
    /\b(higher|lower)\b/i.test(s) ||
    /\d+\.?\d*\s*(pra|pts|reb|ast|yds|yd)\b/i.test(s)
  );
}

/** Skip vague slip routing when the question clearly targets non-prop screenshot intent. */
function hasNonBettingScreenshotQuestionExclusion(q) {
  const s = normalizeSlipQuestionText(q);
  return /\b(who won|final score|box score|standings|highlights?|when is the game|what time(\s+is)?|where to watch|how to watch|stream(ing)? the game|injury\s+report\s+for\s+the\s+team)\b/i.test(
    s,
  );
}

/**
 * Short / non-specific captions typical of image-first uploads ("thoughts?").
 * Used only when combined with hasImage — inventory pass decides real slip UI.
 */
function isVagueImageBettingQuestion(q) {
  const s = normalizeSlipQuestionText(q).replace(/\s+/g, " ").trim();
  if (s.length > 96) return false;
  if (hasNonBettingScreenshotQuestionExclusion(s)) return false;
  if (hasBettingSlipKeywordSignals(s) || hasExplicitSlipLanguageInQuestion(s)) return false;

  if (!s) return true;

  return (
    /^(thought|thoughts)\??$/i.test(s) ||
    /^(hm+|hmm+)\.?$/i.test(s) ||
    /^(hey|yo|sup|lol)\.?$/i.test(s) ||
    /^what do you think\??$/i.test(s) ||
    /^wdyt\??$/i.test(s) ||
    /^opinions?\??$/i.test(s) ||
    /^thoughts on this\??$/i.test(s) ||
    /^rate (this|it|my)\b/i.test(s) ||
    /^how'?s (this|it)\b/i.test(s) ||
    /^how is (this|it)\b/i.test(s) ||
    /^good (bet|call|play)\??$/i.test(s) ||
    /^bad (bet|call)\??$/i.test(s) ||
    /^make sense\??$/i.test(s) ||
    /^worth it\??$/i.test(s) ||
    /^(\?|👀)$/i.test(s) ||
    /^analyze (this|it)\b/i.test(s) ||
    /^break (this|it) down\b/i.test(s) ||
    /^look ok\??$/i.test(s) ||
    /^look good\??$/i.test(s) ||
    /\b(see attached|attached|paste[sd]?)\b/i.test(s) ||
    /\banalyze\b[\s\S]{0,48}\b(options|lines|markets|screenshot|odds)\b/i.test(s) ||
    /\bwhat'?s best to (play|bet)\b/i.test(s) ||
    /\bbest (?:thing|market|line|bet) to play\b/i.test(s)
  );
}

/**
 * @param {string} question
 * @param {boolean} hasImage
 * @returns {{ routesToSlip: boolean, via: "explicit" | "keywords" | "vague" | null }}
 */
export function getSlipImageRouteMeta(question, hasImage) {
  const q = normalizeSlipQuestionText(question);
  if (!hasImage) return { routesToSlip: false, via: null };
  if (hasExplicitSlipLanguageInQuestion(q)) return { routesToSlip: true, via: "explicit" };
  if (hasBettingSlipKeywordSignals(q)) return { routesToSlip: true, via: "keywords" };
  if (isVagueImageBettingQuestion(q)) return { routesToSlip: true, via: "vague" };
  return { routesToSlip: false, via: null };
}

/**
 * After vision pass 1: vague caption + no betting UI/cards → handler downgrades to general chat.
 * @param {string | null | undefined} slipRouteVia — from getSlipImageRouteMeta(...).via
 * @param {string | null | undefined} pipelineError — from runSlipScreenshotPipeline(...).error
 */
export function shouldDowngradeVagueSlipToGeneral(slipRouteVia, pipelineError) {
  return slipRouteVia === "vague" && pipelineError === "vague_no_betting_ui";
}
