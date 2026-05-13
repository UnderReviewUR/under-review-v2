import { splitSentences } from "./_shared.js";

/** @typedef {import("./_shared.js").SportQaIssue} SportQaIssue */

const AG_SCORER =
  /\b(?:anytime\s+goal|goal\s+scorer|to\s+score|lights\s+the\s+lamp)\b/i;
const AG_HYPE = /\b(?:safe|lock|automatic|high\s+floor|guaranteed|can't\s+miss)\b/i;

const SOG = /\b(?:shots?\s+on\s+goal|SOG|shot\s+props)\b/i;
const SOG_CTX =
  /\b(?:shot\s+volume|PP\b|power\s+play|top\s+line|line\s+role|matchup|usage)\b/i;

const G_SAVE = /\b(?:goalie\s+saves|save\s+prop|saves\s+over)\b/i;
const G_CTX = /\b(?:shot\s+volume|expected\s+shots|offensive\s+pace|shots\s+against)\b/i;

/**
 * @param {string} text
 * @returns {SportQaIssue[]}
 */
/** @param {object} [_options] — forwarded from `runSportSpecificValidators` (e.g. `sportEvidenceLayer`) */
export function lintNhlOutput(text, _options = {}) {
  const issues = [];
  const raw = String(text || "");
  if (!raw.trim()) return issues;

  for (const s of splitSentences(raw)) {
    if (AG_SCORER.test(s) && AG_HYPE.test(s)) {
      issues.push({
        code: "nhl_goal_scorer_overconfidence",
        severity: "critical",
        message: "Goal scorer props are volatile; avoid lock/safe/automatic framing.",
        sentence: s,
        requiresRegeneration: true,
      });
      break;
    }
  }

  if (SOG.test(raw) && /\b(?:over|under)\b/i.test(raw) && !SOG_CTX.test(raw)) {
    issues.push({
      code: "nhl_sog_context_gap",
      severity: "warning",
      message: "Shots props benefit from volume, line role, PP usage, or matchup notes.",
      sentence: splitSentences(raw)[0] || raw.slice(0, 400),
      requiresRegeneration: false,
    });
  }

  if (G_SAVE.test(raw) && !G_CTX.test(raw)) {
    issues.push({
      code: "nhl_goalie_saves_context_gap",
      severity: "warning",
      message: "Goalie saves props should tie to opponent shot volume / pace.",
      sentence: splitSentences(raw)[0] || raw.slice(0, 400),
      requiresRegeneration: false,
    });
  }

  return issues;
}
