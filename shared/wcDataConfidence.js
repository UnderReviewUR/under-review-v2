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

/**
 * @param {WcDataConfidence | string | null | undefined} dataConfidence
 */
export function wcDataConfidenceNeedsCaution(dataConfidence) {
  const tier = String(dataConfidence || "").trim();
  return tier.length > 0 && tier !== "confirmed";
}

/**
 * @param {WcDataConfidence | string | null | undefined} dataConfidence
 * @returns {string | null}
 */
export function wcDataConfidenceCautionBanner(dataConfidence) {
  if (!wcDataConfidenceNeedsCaution(dataConfidence)) return null;
  if (dataConfidence === "limited_intel") {
    return "Starting XIs not confirmed — take with caution. No starter-specific plays.";
  }
  return "Lineups not yet confirmed — take with caution. No starter-specific plays.";
}

const STRUCTURED_CONFIDENCE_TIERS = ["High", "Medium", "Speculative"];

/**
 * Cap model/API structured confidence when WC intel is not lineup-confirmed.
 * @param {string | null | undefined} confidence
 * @param {WcDataConfidence | string | null | undefined} dataConfidence
 * @returns {"High" | "Medium" | "Speculative"}
 */
export function capWcStructuredConfidence(confidence, dataConfidence) {
  const raw = String(confidence || "Medium").trim();
  const base = STRUCTURED_CONFIDENCE_TIERS.includes(raw) ? raw : "Medium";
  if (!wcDataConfidenceNeedsCaution(dataConfidence)) return base;
  if (base === "High") {
    return dataConfidence === "limited_intel" ? "Speculative" : "Medium";
  }
  if (dataConfidence === "limited_intel" && base === "Medium") return "Speculative";
  return base;
}
