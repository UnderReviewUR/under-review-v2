import { splitSentences, findSentenceContaining } from "./_shared.js";

/** @typedef {import("./_shared.js").SportQaIssue} SportQaIssue */

const TD_ANY = /\b(?:anytime\s+touchdown|anytime\s+TD|TD\s+scorer|to\s+score\s+a\s+touchdown)\b/i;
const TD_HYPE = /\b(?:safe|lock|automatic|high\s+floor|can't\s+miss|cant\s+miss|guaranteed)\b/i;

const QB_PASS = /\b(?:passing\s+yards|pass\s+yards|QB\s+yards)\b/i;
const QB_CTX =
  /\b(?:pressure|pass\s+rush|blitz|weather|wind|secondary|coverage|pass\s+defense)\b/i;

const RB_RUSH = /\b(?:rushing\s+yards|carry|rushes|rush\s+yards)\b/i;
const RB_CTX =
  /\b(?:carry|carries|snap|snap\s+share|goal[-\s]?line|split|committee|backfield)\b/i;

const REC = /\b(?:receiving\s+yards|receptions|rec\s+yards|targets)\b/i;
const REC_CTX = /\b(?:target|targets|route|snap|slot|outside|usage)\b/i;

/**
 * Heuristic: QB under passing + 2+ receiver overs mentioned without correlation language.
 * @param {string} raw
 */
function correlationConflictNfl(raw) {
  const qbUnder = /\b(?:under|below)\s+\d{2,3}(?:\.\d)?\s*(?:passing|pass)\s+yards\b/i.test(raw);
  const wrOvers = (
    raw.match(
      /\b(?:over|above)\s+\d{2,3}(?:\.\d)?\s*(?:receiving|rec\b|rec\.|WR\b|wide\s+receiver)/gi,
    ) || []
  ).length;
  const explained =
    /\b(?:correlat|game\s+script|contradict|tension|push|pull|pass\s+heavy|negative\s+script)\b/i.test(
      raw,
    );
  return qbUnder && wrOvers >= 2 && !explained;
}

/**
 * @param {string} text
 * @returns {SportQaIssue[]}
 */
export function lintNflOutput(text) {
  const issues = [];
  const raw = String(text || "");
  if (!raw.trim()) return issues;

  for (const s of splitSentences(raw)) {
    if (TD_ANY.test(s) && TD_HYPE.test(s)) {
      issues.push({
        code: "nfl_anytime_td_overconfidence",
        severity: "critical",
        message: "Anytime TD props are volatile; avoid safe/lock/automatic framing.",
        sentence: s,
        requiresRegeneration: true,
      });
      break;
    }
  }

  if (QB_PASS.test(raw) && /\b(?:over|under)\b/i.test(raw)) {
    const relevant = findSentenceContaining(raw, QB_PASS) || raw.slice(0, 500);
    if (!QB_CTX.test(raw) && relevant.length > 0) {
      issues.push({
        code: "nfl_qb_prop_context_gap",
        severity: "warning",
        message: "QB passing props usually need pressure/weather/secondary context.",
        sentence: relevant.slice(0, 500),
        requiresRegeneration: false,
      });
    }
  }

  if (RB_RUSH.test(raw) && /\b(?:over|under)\b/i.test(raw) && !RB_CTX.test(raw)) {
    issues.push({
      code: "nfl_rb_usage_context_gap",
      severity: "warning",
      message: "RB rushing markets benefit from carries/snap/goal-line/split context.",
      sentence: findSentenceContaining(raw, RB_RUSH) || raw.slice(0, 400),
      requiresRegeneration: false,
    });
  }

  if (REC.test(raw) && /\b(?:over|under)\b/i.test(raw) && !REC_CTX.test(raw)) {
    issues.push({
      code: "nfl_receiver_usage_context_gap",
      severity: "warning",
      message: "Receiver props benefit from target share / route / snap context.",
      sentence: findSentenceContaining(raw, REC) || raw.slice(0, 400),
      requiresRegeneration: false,
    });
  }

  if (correlationConflictNfl(raw)) {
    issues.push({
      code: "nfl_correlation_conflict",
      severity: "warning",
      message:
        "QB under passing yards paired with multiple receiver overs — explain correlation or game script.",
      sentence: raw.slice(0, 450),
      requiresRegeneration: false,
    });
  }

  return issues;
}
