import { splitSentences } from "./_shared.js";

/** @typedef {import("./_shared.js").SportQaIssue} SportQaIssue */

const GS = /\b(?:anytime\s+goal|goal\s+scorer|to\s+score|first\s+goal)\b/i;
const GS_HYPE = /\b(?:safe|lock|automatic|guaranteed|can't\s+miss)\b/i;

const SHOTS = /\b(?:shots?\s+on\s+target|SoT|shots?\s+prop|total\s+shots)\b/i;
const SHOTS_CTX =
  /\b(?:striker|minutes|set\s+piece|penalty|role|lineup|press|opponent|defense)\b/i;

const KEEP = /\b(?:clean\s+sheet|keeper\s+saves|goalkeeper)\b/i;
const KEEP_CTX =
  /\b(?:attack|xG|shots\s+against|defensive\s+shape|opponent\s+offense|pace)\b/i;

/**
 * @param {string} text
 * @returns {SportQaIssue[]}
 */
/** @param {object} [_options] — forwarded from `runSportSpecificValidators` (e.g. `sportEvidenceLayer`) */
export function lintSoccerOutput(text, _options = {}) {
  const issues = [];
  const raw = String(text || "");
  if (!raw.trim()) return issues;

  for (const s of splitSentences(raw)) {
    if (GS.test(s) && GS_HYPE.test(s)) {
      issues.push({
        code: "soccer_goal_scorer_overconfidence",
        severity: "critical",
        message: "Goal scorer markets are volatile; avoid lock/safe/automatic language.",
        sentence: s,
        requiresRegeneration: true,
      });
      break;
    }
  }

  if (SHOTS.test(raw) && /\b(?:over|under)\b/i.test(raw) && !SHOTS_CTX.test(raw)) {
    issues.push({
      code: "soccer_shots_context_gap",
      severity: "warning",
      message: "Shots/SoT props need role, minutes, set pieces, or opponent style context.",
      sentence: splitSentences(raw)[0] || raw.slice(0, 400),
      requiresRegeneration: false,
    });
  }

  if (KEEP.test(raw) && !KEEP_CTX.test(raw)) {
    issues.push({
      code: "soccer_keeper_defense_context_gap",
      severity: "warning",
      message: "Clean sheet / keeper props need opponent attack volume or defensive context.",
      sentence: splitSentences(raw)[0] || raw.slice(0, 400),
      requiresRegeneration: false,
    });
  }

  return issues;
}
