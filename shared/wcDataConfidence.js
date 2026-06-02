/**
 * World Cup UR Take — data confidence tier for UI chip + prompt guidance.
 */

/** @typedef {"confirmed" | "pre_match_estimate" | "limited_intel"} WcDataConfidence */

export const WC_DATA_CONFIDENCE_CHIP = {
  confirmed: "Confirmed data",
  pre_match_estimate: "Pre-match estimate",
  limited_intel: "Limited intel",
};

/**
 * @param {Array<{ lineupConfirmed?: boolean, injuries?: Array<unknown>, phase?: string }> | null | undefined} matchDetails
 * @returns {WcDataConfidence}
 */
export function deriveWcDataConfidence(matchDetails) {
  const rows = Array.isArray(matchDetails) ? matchDetails : [];
  if (!rows.length) return "pre_match_estimate";

  const hasStructuredInjury = rows.some((d) => Array.isArray(d.injuries) && d.injuries.length > 0);
  const hasConfirmedLineup = rows.some((d) => d.lineupConfirmed === true);

  if (hasConfirmedLineup) return "confirmed";
  if (hasStructuredInjury) return "limited_intel";
  return "pre_match_estimate";
}

/**
 * @param {WcDataConfidence} tier
 */
export function wcDataConfidenceChipLabel(tier) {
  return WC_DATA_CONFIDENCE_CHIP[tier] || WC_DATA_CONFIDENCE_CHIP.pre_match_estimate;
}
