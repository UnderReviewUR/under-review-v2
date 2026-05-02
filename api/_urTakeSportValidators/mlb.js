import { splitSentences, findSentenceContaining } from "./_shared.js";

const K_PROP =
  /\b(?:over|under)\s+\d+(?:\.\d+)?\s+(?:strikeouts|strike\s+outs|K|Ks)\b/i;
const STARTER_CUE =
  /\b(?:starting\s+pitcher|scheduled\s+starter|confirmed\s+starter|listed\s+starter|probable\s+pitcher|tonight'?s\s+starter|SP\b|game\s*1\s+starter)\b/i;
const PITCHER_CUE = /\b(?:pitcher|starter|ace|SP)\b/i;

const BATTER_STAT = /\b(?:hits?|RBIs?|RBI|home\s+runs?|HRs?|total\s+bases|TB)\b/i;
const HYPE = /\b(?:safe|automatic|floor|lock|guaranteed|can't\s+miss|cant\s+miss)\b/i;

const HR_PROP = /\b(?:home\s+run|HR|homer|to\s+go\s+yard)\b/i;
const HR_HYPE = /\b(?:high[-\s]?confidence|safe|lock|slam|no[-\s]?doubt|smash|auto)\b/i;

const WIN_PROP = /\b(?:pitcher\s+win|to\s+get\s+the\s+win|win\s+the\s+game|record\s+the\s+win)\b/i;
const WIN_SUPPORT = /\b(?:bullpen|run\s+support|offense|lineup|scoring|run\s+prevention)\b/i;
const WIN_HYPE = /\b(?:reliable|safe|bank|lock|high\s+floor)\b/i;

/**
 * @param {string} text
 * @param {object} [_options]
 * @param {object} [_options.mlbContext]
 * @param {boolean} [_options.mlbContext.pitcherLikelyStarter] — optional structured hint
 * @returns {SportQaIssue[]}
 */
export function lintMlbOutput(text, _options = {}) {
  const issues = [];
  const raw = String(text || "");
  if (!raw.trim()) return issues;

  const forcedStarter = _options?.mlbContext?.pitcherLikelyStarter === true;

  if (K_PROP.test(raw) && PITCHER_CUE.test(raw) && !STARTER_CUE.test(raw) && !forcedStarter) {
    issues.push({
      code: "mlb_pitcher_k_prop_without_starter_context",
      severity: "warning",
      message: "Pitcher strikeout prop without clear confirmed/listed starter context.",
      sentence: findSentenceContaining(raw, K_PROP) || raw.slice(0, 400),
      requiresRegeneration: false,
    });
  }

  for (const s of splitSentences(raw)) {
    if (BATTER_STAT.test(s) && HYPE.test(s)) {
      issues.push({
        code: "mlb_batter_prop_overconfidence",
        severity: "critical",
        message: "Avoid safe/automatic/floor framing for batter counting props.",
        sentence: s,
        requiresRegeneration: true,
      });
      break;
    }
  }

  for (const s of splitSentences(raw)) {
    if (HR_PROP.test(s) && HR_HYPE.test(s)) {
      issues.push({
        code: "mlb_hr_prop_probability_inflation",
        severity: "critical",
        message: "HR markets are extremely volatile; avoid inflated confidence language.",
        sentence: s,
        requiresRegeneration: true,
      });
      break;
    }
  }

  for (const s of splitSentences(raw)) {
    if (WIN_PROP.test(s) && WIN_HYPE.test(s) && !WIN_SUPPORT.test(s)) {
      issues.push({
        code: "mlb_pitcher_win_context_missing",
        severity: "warning",
        message: "Pitcher win markets need run support / bullpen / offense context.",
        sentence: s,
        requiresRegeneration: false,
      });
      break;
    }
  }

  return issues;
}
