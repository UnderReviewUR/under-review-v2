import { impliedProbFromAmerican } from "./wcGoldenBootConsensus.js";

/**
 * De-vig a two-way market (over/under or home/away).
 * @param {number | null | undefined} americanA
 * @param {number | null | undefined} americanB
 * @returns {{
 *   aRaw: number | null,
 *   bRaw: number | null,
 *   aDevig: number | null,
 *   bDevig: number | null,
 * } | null}
 */
export function impliedTwoWayFromAmerican(americanA, americanB) {
  const aRaw = impliedProbFromAmerican(americanA);
  const bRaw = impliedProbFromAmerican(americanB);
  if (aRaw == null && bRaw == null) return null;
  if (aRaw == null || bRaw == null) {
    return { aRaw, bRaw, aDevig: aRaw, bDevig: bRaw };
  }
  const sum = aRaw + bRaw;
  if (!(sum > 0)) return { aRaw, bRaw, aDevig: null, bDevig: null };
  return {
    aRaw,
    bRaw,
    aDevig: aRaw / sum,
    bDevig: bRaw / sum,
  };
}

/**
 * Round probability for JSON (0–1 → 4 decimals).
 * @param {number | null | undefined} p
 */
export function roundProb(p) {
  if (p == null || !Number.isFinite(p)) return null;
  return Math.round(p * 10000) / 10000;
}
