/**
 * Free tier: analysis + soft lean only. Pro owns THE PLAY, parlay legs, and full call.
 */
import { synthesizeLeanLine, truncateLeanAtWord, LEAN_MAX_CHARS } from "./urTakeLean.js";

/** System appendix for plain-text full cards (not JSON contract turns). */
export const FREE_TIER_UR_TAKE_APPENDIX = `[FREE TIER — ANALYSIS + SOFT LEAN ONLY]
You are responding to a free user. They do not get THE PLAY or an explicit bet ticket.
- Provide matchup analysis (whyNow, edge, and analysis sections when applicable).
- Close with one soft lean only: a single "Lean: …" sentence — directional, no stake sizing, no parlay legs.
- Do NOT output a THE PLAY block, play-tracker language, or parlay leg lists.
- Do NOT reference prior session takes or cross-session memory.`;

const THE_PLAY_SECTION_RE =
  /(?:^|\n)\s*(?:\*{0,2})THE\s+PLAY(?:\*{0,2})\s*:?\s*[\s\S]*?(?=(?:\n\s*(?:\*{0,2})?(?:CONFIDENCE|MARKET|MATCH READ|WHY|EDGE|WHAT KILLS|LEAN)\b)|$)/gi;

/**
 * Remove THE PLAY section(s) from plain prose (dual-publish + legacy cards).
 * @param {string} text
 * @returns {string}
 */
export function stripThePlayFromProse(text) {
  const raw = String(text || "");
  if (!raw.trim()) return raw;
  let out = raw.replace(THE_PLAY_SECTION_RE, "\n");
  out = out.replace(/\n{3,}/g, "\n\n").trim();
  return out;
}

/**
 * @param {Record<string, unknown> | null | undefined} structured
 * @returns {Record<string, unknown> | null | undefined}
 */
export function maskStructuredForFreeTier(structured) {
  if (!structured || typeof structured !== "object") return structured;
  const callType = String(structured.callType || "").toLowerCase();
  if (callType === "rules") return structured;

  const leanOnly = synthesizeLeanLine({
    lean: structured.lean,
    call: "",
    whyNow: structured.whyNow,
  });

  const next = { ...structured };
  next.call = "";
  next.parlayLegs = [];
  next.parlayTotalOdds = null;
  next.lean = truncateLeanAtWord(leanOnly || String(structured.lean || "").trim(), LEAN_MAX_CHARS);
  if (next.deep && /\bTHE\s+PLAY\b/i.test(String(next.deep))) {
    next.deep = stripThePlayFromProse(String(next.deep));
  }
  return next;
}
