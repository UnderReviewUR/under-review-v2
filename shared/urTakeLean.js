/** @typedef {{ call?: string, whyNow?: string, lean?: string }} LeanSynthesisInput */

export const LEAN_MAX_CHARS = 120;
/** WC fixture player-prop numbered lists (multi-leg lean). */
export const WC_PLAYER_PROP_LIST_LEAN_MAX_CHARS = 800;

/** Soft QA — model should match; Pass / No play are single-clause. */
export const LEAN_CONTRACT_PATTERN = /^Lean:\s*.+\./;

/**
 * @param {string} text
 */
export function isWcNumberedPlayerPropLean(text) {
  return /^\s*\d+\.\s+/m.test(String(text || "").trim());
}

/**
 * Truncate at word boundary — never mid-word (card face readability).
 * @param {string} text
 * @param {number} max
 */
export function truncateLeanAtWord(text, max = LEAN_MAX_CHARS) {
  const raw = String(text || "").trim();
  if (!raw || raw.length <= max) return raw;
  const slice = raw.slice(0, max);
  const lastSpace = slice.lastIndexOf(" ");
  if (lastSpace > max * 0.6) {
    return `${slice.slice(0, lastSpace).trim()}…`;
  }
  return `${slice.trim()}…`;
}

/**
 * @param {string} text
 * @returns {string}
 */
function trimToWordCount(text, maxWords) {
  const words = String(text || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  return words.slice(0, maxWords).join(" ");
}

/**
 * @param {string} text
 * @returns {string}
 */
function firstSentence(text) {
  const raw = String(text || "").trim();
  if (!raw) return "";
  const m = raw.match(/[^.!?]+[.!?]+/);
  return m ? m[0].trim() : raw;
}

/**
 * Client + server fallback when model omits lean.
 * @param {LeanSynthesisInput} input
 * @returns {string}
 */
export function synthesizeLeanLine(input) {
  const existing = String(input?.lean || "").trim();
  if (existing) {
    if (isWcNumberedPlayerPropLean(existing)) {
      return truncateLeanAtWord(existing, WC_PLAYER_PROP_LIST_LEAN_MAX_CHARS);
    }
    return truncateLeanAtWord(existing, LEAN_MAX_CHARS);
  }

  const call = String(input?.call || "").trim();
  if (/^Lean:\s/i.test(call)) return truncateLeanAtWord(call, LEAN_MAX_CHARS);

  if (/^no\s*play/i.test(call)) return "Lean: No play.";
  if (/^pass\b/i.test(call)) return "Lean: Pass.";

  const play = call || "Pass";
  const whySnippet = trimToWordCount(firstSentence(input?.whyNow), 15);
  if (whySnippet) {
    return truncateLeanAtWord(`Lean: ${play}. ${whySnippet}`, LEAN_MAX_CHARS);
  }
  return truncateLeanAtWord(`Lean: ${play}.`, LEAN_MAX_CHARS);
}

/**
 * @param {Record<string, unknown> | null | undefined} structured
 * @returns {Record<string, unknown>}
 */
export function ensureLeanOnStructured(structured) {
  if (!structured || typeof structured !== "object") return structured;
  const lean = synthesizeLeanLine({
    lean: structured.lean,
    call: structured.call,
    whyNow: structured.whyNow,
  });
  return { ...structured, lean };
}

/**
 * Soft QA only — log on failure; no regeneration (Session 1a).
 * @param {Record<string, unknown> | null | undefined} structured
 * @returns {{ ok: boolean, code?: string, detail?: string }}
 */
export function lintLeanContract(structured) {
  if (!structured || typeof structured !== "object") {
    return { ok: false, code: "lean_contract_missing", detail: "no_structured_object" };
  }
  const lean = String(structured.lean || "").trim();
  if (!lean) {
    return { ok: false, code: "lean_contract_missing", detail: "empty_lean" };
  }
  if (lean.length > LEAN_MAX_CHARS) {
    return { ok: false, code: "lean_contract_missing", detail: `lean_too_long_${lean.length}` };
  }
  if (!LEAN_CONTRACT_PATTERN.test(lean)) {
    return { ok: false, code: "lean_contract_missing", detail: "pattern_mismatch" };
  }
  return { ok: true };
}
