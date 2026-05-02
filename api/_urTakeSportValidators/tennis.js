import { splitSentences } from "./_shared.js";

/** @typedef {import("./_shared.js").SportQaIssue} SportQaIssue */

const MATCH_BET = /\b(?:match\s+winner|moneyline|to\s+win\s+the\s+match|set\s+betting)\b/i;
const MATCH_HYPE = /\b(?:lock|automatic|guaranteed|can't\s+miss|sure\s+thing)\b/i;

const ACES =
  /\b(?:aces?\s+over|over\s+\d+(?:\.\d+)?\s+aces|ace\s+prop|total\s+aces)\b/i;
const ACES_CTX =
  /\b(?:surface|clay|grass|hard|return|serve\s+rate|hold|break)\b/i;

const GAMES = /\b(?:games?\s+handicap|spread|total\s+games|over\s+\d+\.?\d*\s+games)\b/i;
const GAMES_CTX = /\b(?:expected|length|competitive|close|straight\s+sets|form)\b/i;

/**
 * @param {string} text
 * @returns {SportQaIssue[]}
 */
export function lintTennisOutput(text) {
  const issues = [];
  const raw = String(text || "");
  if (!raw.trim()) return issues;

  for (const s of splitSentences(raw)) {
    if (MATCH_BET.test(s) && MATCH_HYPE.test(s)) {
      issues.push({
        code: "tennis_match_winner_overconfidence",
        severity: "critical",
        message: "Tennis match pricing is volatile; avoid lock/automatic/inflated certainty.",
        sentence: s,
        requiresRegeneration: true,
      });
      break;
    }
  }

  if (ACES.test(raw) && /\b(?:over|under|lean)\b/i.test(raw) && !ACES_CTX.test(raw)) {
    issues.push({
      code: "tennis_aces_context_gap",
      severity: "warning",
      message: "Ace props should tie to surface, return profile, or serve signals.",
      sentence: splitSentences(raw)[0] || raw.slice(0, 400),
      requiresRegeneration: false,
    });
  }

  if (GAMES.test(raw) && !GAMES_CTX.test(raw)) {
    issues.push({
      code: "tennis_games_context_gap",
      severity: "warning",
      message: "Games/spread markets need expected match length or competitiveness context.",
      sentence: splitSentences(raw)[0] || raw.slice(0, 400),
      requiresRegeneration: false,
    });
  }

  return issues;
}
