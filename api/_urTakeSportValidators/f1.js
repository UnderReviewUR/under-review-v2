import { splitSentences } from "./_shared.js";

/** @typedef {import("./_shared.js").SportQaIssue} SportQaIssue */

const RESULT = /\b(?:race\s+winner|win\s+the\s+race|podium|top\s*3|to\s+win)\b/i;
const RESULT_CTX =
  /\b(?:pace|long\s+run|qualifying|quali|strategy|reliability|DRS|tyre|tire|degradation)\b/i;
const RESULT_HYPE = /\b(?:safe|lock|guaranteed|high[-\s]?confidence|auto|bank)\b/i;

const MATCHUP = /\b(?:head[-\s]?to[-\s]?head|matchup|vs\.|teammate)\b/i;
const MATCH_CTX =
  /\b(?:qualifying|quali|pace|tyre|tire|strategy|track|sector|DRS|setup)\b/i;

const FASTEST = /\b(?:fastest\s+lap|FL\b)\b/i;
const PIT_TIRE = /\b(?:pit|pit\s+window|tyre|tire|strategy|compound)\b/i;

/**
 * @param {string} text
 * @returns {SportQaIssue[]}
 */
/** @param {object} [_options] — forwarded from `runSportSpecificValidators` (e.g. `sportEvidenceLayer`) */
export function lintF1Output(text, _options = {}) {
  const issues = [];
  const raw = String(text || "");
  if (!raw.trim()) return issues;

  for (const s of splitSentences(raw)) {
    if (RESULT.test(s) && RESULT_HYPE.test(s) && !RESULT_CTX.test(s)) {
      issues.push({
        code: "f1_result_probability_inflation",
        severity: "warning",
        message: "F1 winner/podium calls should tie to pace, qualifying, strategy, or reliability.",
        sentence: s,
        requiresRegeneration: false,
      });
      break;
    }
  }

  if (RESULT.test(raw) && !RESULT_HYPE.test(raw) && !RESULT_CTX.test(raw)) {
    issues.push({
      code: "f1_result_probability_inflation",
      severity: "warning",
      message: "Podium/winner analysis should reference pace, qualifying, strategy, or reliability.",
      sentence: splitSentences(raw)[0] || raw.slice(0, 400),
      requiresRegeneration: false,
    });
  }

  for (const s of splitSentences(raw)) {
    if (MATCHUP.test(s) && !MATCH_CTX.test(raw)) {
      issues.push({
        code: "f1_driver_matchup_context_gap",
        severity: "warning",
        message: "Driver matchup picks need qualifying, pace, tyres/strategy, or track context.",
        sentence: s,
        requiresRegeneration: false,
      });
      break;
    }
  }

  for (const s of splitSentences(raw)) {
    if (FASTEST.test(s) && /\b(?:safe|lock|high\s+floor)\b/i.test(s) && !PIT_TIRE.test(raw)) {
      issues.push({
        code: "f1_fastest_lap_volatility_missing",
        severity: "critical",
        message:
          "Fastest lap is volatile — do not sound certain without pit window / tyre strategy.",
        sentence: s,
        requiresRegeneration: true,
      });
      break;
    }
  }

  return dedupeF1(issues);
}

/**
 * Deterministic catch for NBA (or basketball) leakage into an F1-marketed answer.
 * @param {string} text
 * @returns {import("./_shared.js").SportQaIssue[]}
 */
export function lintF1WrongSportCrossContamination(text) {
  const raw = String(text || "");
  if (!raw.trim()) return [];
  const nbaLeak =
    /\b(?:NBA\s+playoff|Eastern\s+Conference\s+playoff|Western\s+Conference\s+playoff|Celtics|\b76ers\b|\bLakers\b|Warriors\s+vs|BOS\s*[-–@]\s*PHI|DET\s*[-–@]\s*ORL|CLE\s*[-–@]\s*TOR|double-double|\bPRA\b|points\s*\+\s*rebounds\s*\+\s*assists)\b/i;
  if (!nbaLeak.test(raw)) return [];
  return [
    {
      code: "wrong_sport_context_payload",
      severity: "critical",
      message: "F1 response references NBA/basketball context — regenerate without cross-sport leakage.",
      sentence: raw.slice(0, 450),
      requiresRegeneration: true,
    },
  ];
}

function dedupeF1(arr) {
  const codes = new Set();
  return arr.filter((i) => {
    if (codes.has(i.code)) return false;
    codes.add(i.code);
    return true;
  });
}
