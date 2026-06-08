/**
 * Predictions roundup — thesis coherence, watch-for entities, dark-horse quality.
 */

import { wcCardHasDeltaSignal } from "./wcCardContractVoice.js";

const FAIR_PRICE_RE =
  /\b(fairly priced|fair price|fair co-favorite|market is pricing them fairly|no edge|not mispriced|pricing them fairly)\b/i;

const LEAN_NOT_PASS_RE = /^lean:/i;

const DARK_HORSE_STRUCTURAL_RE =
  /\b(path|odds|transition|set piece|low.?block|bracket|mispriced|value|\+{1,2}\d{3,}|underpriced|longer odds|structural)\b/i;

const ORPHAN_PRONOUN_RE = /\b(him|her|them|he|she|they)\b/i;

/**
 * @param {string} summary
 * @param {string} lean
 * @param {string} [deep]
 */
export function detectWcRoundupFairPriceContradiction(summary, lean, deep = "") {
  const sum = String(summary || "");
  const play = String(lean || "");
  const blob = `${sum}\n${deep}`;
  if (!FAIR_PRICE_RE.test(sum) && !FAIR_PRICE_RE.test(blob.slice(0, 400))) return null;
  if (LEAN_NOT_PASS_RE.test(play) && !/^pass\b/i.test(play)) {
    return { reason: "fair_price_summary_with_lean_play" };
  }
  if (/\bLean:\s*[^P][^.]*\b(Spain|France|Brazil|England|Argentina|Germany|Portugal)\b/i.test(deep) && FAIR_PRICE_RE.test(sum)) {
    return { reason: "fair_price_summary_with_winner_lean_in_deep" };
  }
  return null;
}

/**
 * @param {string} slotValue
 */
export function detectWcDarkHorseWeakThesis(slotValue) {
  const v = String(slotValue || "");
  const winPct = v.match(/(\d+\.?\d*)%\s*(?:win|title|sims)/i);
  if (!winPct) return null;
  const pct = parseFloat(winPct[1]);
  if (pct >= 5) return null;
  if (DARK_HORSE_STRUCTURAL_RE.test(v)) return null;
  return { reason: "dark_horse_title_pct_without_structural_case", pct };
}

/**
 * @param {string} edge
 * @param {Array<{ key: string, value: string, label?: string }>} [slots]
 */
export function detectWcWatchForOrphanPronoun(edge, slots = []) {
  const e = String(edge || "").trim();
  if (!e || !ORPHAN_PRONOUN_RE.test(e)) return null;

  /** @type {string[]} */
  const names = [];
  for (const slot of slots) {
    const player = extractWcRoundupSlotPlayer(slot.value);
    const nation = extractWcRoundupSlotNation(slot.value);
    if (player) names.push(player);
    if (nation) names.push(nation);
  }

  const lower = e.toLowerCase();
  for (const name of names) {
    const parts = name.toLowerCase().split(/\s+/).filter((p) => p.length > 2);
    if (parts.some((p) => lower.includes(p))) return null;
  }

  return { reason: "watch_for_orphan_pronoun", suggestedNames: names };
}

/**
 * @param {string} line
 */
export function isWcRoundupLineMissingDelta(line) {
  const l = String(line || "").trim();
  if (!l) return true;
  return !wcCardHasDeltaSignal(l);
}

/**
 * Extract short nation from roundup slot value.
 * @param {string} slotValue
 */
export function extractWcRoundupSlotNation(slotValue) {
  const m = String(slotValue || "").match(/^(?:Winners|Dark horse):\s*([A-Za-zÀ-ÿ]+)/i);
  return m?.[1]?.trim() || "";
}

/**
 * @param {string} slotValue
 */
export function extractWcRoundupSlotPlayer(slotValue) {
  const v = String(slotValue || "");
  const m =
    v.match(/(?:Breakout player|Top goalscorer):\s*([A-Za-zÀ-ÿ]+(?:\s+[A-Za-zÀ-ÿ.'-]+)?)/i) ||
    v.match(/^([A-Z][\wÀ-ÿ]+(?:\s+[A-Z][\wÀ-ÿ]+)?)/);
  return m?.[1]?.trim().replace(/\s+/g, " ") || "";
}
