/**
 * Predictions roundup — thesis coherence, watch-for entities, dark-horse quality.
 */

import { wcCardHasDeltaSignal } from "./wcCardContractVoice.js";

const FAIR_PRICE_RE =
  /\b(fairly priced|fair price|fair co-favorite|market is pricing them fairly|no edge|not mispriced|pricing them fairly)\b/i;

const LEAN_NOT_PASS_RE = /^lean:/i;

const DARK_HORSE_PATH_RE =
  /\b(path|bracket|group|round of|qf|sf|knockout|draw side|soft side|survive|advance|knockout side)\b/i;
const DARK_HORSE_STYLE_RE =
  /\b(transition|set piece|set-piece|low.?block|counter|press|possession|direct|street|physical|aerial|width|volume)\b/i;
const DARK_HORSE_ODDS_RE =
  /\+\d{3,}|\bodds\b|\blonger odds\b|\bunderpriced\b|\bmispriced\b|\bmarket\b|\bbooks?\b/i;

const MARKET_ODDS_IN_LINE_RE = /\bmarket\s*\+\d{3,}|\+\d{3,}\s*(?:market|books?|board|line)/i;
const ANY_AMERICAN_ODDS_RE = /\+\d{3,}/;

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
export function scoreWcDarkHorseThesisAngles(slotValue) {
  const v = String(slotValue || "");
  return {
    path: DARK_HORSE_PATH_RE.test(v),
    style: DARK_HORSE_STYLE_RE.test(v),
    odds: DARK_HORSE_ODDS_RE.test(v),
  };
}

/**
 * Dark horse quality bar — need two of path / style / odds, not just low title %.
 * @param {string} slotValue
 */
export function detectWcDarkHorseWeakThesis(slotValue) {
  const v = String(slotValue || "");
  const angles = scoreWcDarkHorseThesisAngles(v);
  const angleCount = [angles.path, angles.style, angles.odds].filter(Boolean).length;
  if (angleCount >= 2) return null;

  const winPct = v.match(/(\d+\.?\d*)%\s*(?:win|title|sims)/i);
  const pct = winPct ? parseFloat(winPct[1]) : null;

  if (pct != null && pct < 8 && angleCount < 2) {
    return { reason: "dark_horse_insufficient_angles", pct, angles, angleCount };
  }

  if (/\b(qf|quarter)/i.test(v) && angleCount < 2) {
    return { reason: "dark_horse_qf_only_no_case", angles, angleCount };
  }

  if (angleCount === 0) {
    return { reason: "dark_horse_no_angles", angles, angleCount };
  }

  return null;
}

/**
 * Roundup LINE must cite market +XXX when outrights are in VERIFIED CONTEXT — not sims-only.
 * @param {string} line
 * @param {boolean} [outrightsAvailable]
 */
export function detectWcRoundupLineMissingMarketOdds(line, outrightsAvailable = false) {
  if (!outrightsAvailable) return null;
  const l = String(line || "").trim();
  if (!l) return null;
  if (MARKET_ODDS_IN_LINE_RE.test(l) || ANY_AMERICAN_ODDS_RE.test(l)) return null;
  if (/\bsims?\s+\d|%\s*(win|qf|title)/i.test(l)) {
    return { reason: "delta_sims_only_no_market_odds" };
  }
  return null;
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
