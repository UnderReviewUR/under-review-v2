/**
 * Phase 2b — fixture-local pre-match form multiplier for Poisson λ (unplayed sim fixtures).
 */

export const FORM_BASELINE = 7.5;
export const FORM_SLOPE = 0.04;
export const FORM_CLAMP = 0.06;

/**
 * @param {number} n
 * @param {number} min
 * @param {number} max
 */
export function clamp(n, min, max) {
  return Math.min(max, Math.max(min, n));
}

function round1(n) {
  return Math.round(Number(n) * 10) / 10;
}

/**
 * @param {number | null | undefined} avgRating
 */
export function formBumpFromRating(avgRating) {
  if (avgRating == null || !Number.isFinite(Number(avgRating))) return 1;
  const delta = Number(avgRating) - FORM_BASELINE;
  return 1 + clamp(FORM_SLOPE * delta, -FORM_CLAMP, FORM_CLAMP);
}

/**
 * @param {string} abbrA
 * @param {string} abbrB
 */
export function buildFixtureFormKey(abbrA, abbrB) {
  const [a, b] = [String(abbrA || "").toUpperCase(), String(abbrB || "").toUpperCase()].sort();
  return `${a}|${b}`;
}

/**
 * @param {Record<string, Record<string, { avgRating?: number }>> | null | undefined} formByFixture
 * @param {string} abbrA
 * @param {string} abbrB
 * @param {string} teamAbbr
 */
export function fixtureFormRating(formByFixture, abbrA, abbrB, teamAbbr) {
  const key = buildFixtureFormKey(abbrA, abbrB);
  const row = formByFixture?.[key];
  const abbr = String(teamAbbr || "").toUpperCase();
  const rating = row?.[abbr]?.avgRating;
  return Number.isFinite(Number(rating)) ? Number(rating) : null;
}

/**
 * @param {number} lambda
 * @param {number | null | undefined} avgRating
 */
export function applyFormBump(lambda, avgRating) {
  const base = Number(lambda);
  if (!Number.isFinite(base) || base <= 0) return base;
  return base * formBumpFromRating(avgRating);
}

/**
 * @param {{
 *   formFixturesResolved?: number,
 *   formTeamsAffected?: number,
 *   formRatingMin?: number | null,
 *   formRatingMax?: number | null,
 * }} formResult
 */
export function buildSimFormFingerprintSuffix(formResult) {
  const fixtures = Number(formResult?.formFixturesResolved) || 0;
  const teams = Number(formResult?.formTeamsAffected) || 0;
  if (fixtures <= 0) return "frm:0:0";
  const min = formResult?.formRatingMin;
  const max = formResult?.formRatingMax;
  if (Number.isFinite(Number(min)) && Number.isFinite(Number(max))) {
    return `frm:${fixtures}:${teams}:${round1(min)}-${round1(max)}`;
  }
  return `frm:${fixtures}:${teams}`;
}
