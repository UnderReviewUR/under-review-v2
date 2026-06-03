/**
 * World Cup UR Take — rules-turn isolation (no prior-thread bleed).
 */

import { extractMentionedWcTeams } from "./wcUrTakeKeywords.js";

const PRIOR_THREAD_NARRATION_RE =
  /\b(you asked about|as (we|i) (discussed|noted)|earlier (in|you)|prior (turn|question|take)|from (the|your) (last|previous))\b/i;

export const WC_RULES_TURN_APPENDIX = `WC RULES TURN (mandatory — this question only):
- Answer ONLY the knockout/tournament rules asked. No team advancement picks, no group-stage predictions, no outright pricing.
- Do NOT reference prior chat questions, teams, or takes (e.g. Norway, France, Brazil) unless this question names them.
- Do NOT open with "You asked about…" or bridge from a prior matchup/pricing thread.
- Use WC TOURNAMENT RULES in VERIFIED CONTEXT as the factual source.
- This is NOT a betting pick — no Lean/Edge/Prop framing; plain factual summary + optional deep bullets.`;

/**
 * @param {string} text
 * @param {string[]} forbiddenEntities
 */
export function stripRulesThreadBleed(text, forbiddenEntities = []) {
  let out = String(text || "");
  if (!out.trim()) return out;

  out = out.replace(
    /\bYou asked about[^.!?\n]*(?:advancement|mispriced|pricing|matchup|knockout rules)[^.!?\n]*[.!?]?\s*/gi,
    "",
  );
  out = out.replace(/\bYou asked about knockout rules[^.!?\n]*[.!?]?\s*/gi, "");
  out = out.replace(
    /\bKnockout rules matter for settlement and betting strategy[^.!?\n]*[.!?]?\s*/gi,
    (m) => (forbiddenEntities.length ? "" : m),
  );

  for (const abbr of forbiddenEntities) {
    const teamRe = new RegExp(`\\b${abbr}\\b`, "i");
    if (teamRe.test(out) && PRIOR_THREAD_NARRATION_RE.test(out)) {
      out = out.replace(/[^.!?\n]*\b(Norway|France|Brazil|Paraguay)[^.!?\n]*[.!?]?\s*/gi, "");
    }
  }

  return out.replace(/\n{3,}/g, "\n\n").trim();
}

/**
 * @param {string} body
 * @param {string} question
 * @param {string[]} forbiddenEntities
 */
export function detectRulesThreadBleed(body, question, forbiddenEntities = []) {
  const qTeams = extractMentionedWcTeams(String(question || ""));
  if (qTeams.length > 0) return false;

  const text = String(body || "");
  if (PRIOR_THREAD_NARRATION_RE.test(text)) return true;
  if (/\byou asked about\b/i.test(text)) return true;

  const mentioned = extractMentionedWcTeams(text);
  if (!mentioned.length) return false;

  const forbidden = new Set(forbiddenEntities.map((t) => String(t).toUpperCase()));
  return mentioned.some((t) => forbidden.has(String(t).toUpperCase()));
}
