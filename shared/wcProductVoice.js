/**
 * User-facing World Cup copy — confident product voice (paid service).
 * Internal logs/prompts may still describe staleness; never surface that to users.
 */

/** @typedef {"confirmed" | "pending" | "unavailable"} WcXiStatus */
/** @typedef {"confirmed" | "pre_match_estimate" | "limited_intel"} WcDataConfidence */

export const WC_XI_USER_LABEL = {
  confirmed: "Starting XI locked",
  pending: "Lineups updating",
  unavailable: "Pre-kickoff",
};

export const WC_DATA_CONFIDENCE_USER_CHIP = {
  confirmed: "Lineups locked",
  pre_match_estimate: "Pre-kickoff",
  limited_intel: "Limited data",
};

/**
 * @param {WcXiStatus | string | null | undefined} status
 */
export function wcXiUserChipLabel(status) {
  const key = String(status || "unavailable").toLowerCase();
  return WC_XI_USER_LABEL[key] || WC_XI_USER_LABEL.unavailable;
}

/**
 * @param {WcDataConfidence | string | null | undefined} tier
 */
export function wcDataConfidenceUserChip(tier) {
  const key = String(tier || "pre_match_estimate").toLowerCase();
  return WC_DATA_CONFIDENCE_USER_CHIP[key] || WC_DATA_CONFIDENCE_USER_CHIP.pre_match_estimate;
}

/**
 * Pre-kickoff UR Take guidance — discipline without admitting missing feeds.
 * @param {WcDataConfidence | string | null | undefined} dataConfidence
 * @returns {string | null}
 */
export function wcUrTakeConfidenceNote(dataConfidence) {
  const tier = String(dataConfidence || "").trim();
  if (!tier || tier === "confirmed") return null;
  return "Team and tournament markets are in play. Starter-specific props unlock once lineups lock.";
}

/**
 * @param {{ ageMinutes?: number | null, lastUpdated?: number | null } | null | undefined} meta
 */
export function formatWcMarketsStatusChip(meta) {
  if (!meta) return null;
  if (meta.referenceOnly) {
    return "Tournament winner · reference lines";
  }
  const age = Number(meta.ageMinutes);
  if (Number.isFinite(age) && age >= 0 && age < 360) {
    return age <= 1 ? "Tournament markets · just updated" : `Tournament markets · ${age}m ago`;
  }
  const ts = Number(meta.lastUpdated);
  if (Number.isFinite(ts) && ts > 0) {
    return "Tournament markets";
  }
  return "Tournament markets";
}

export const WC_LOADING_LABEL = "Syncing World Cup board…";

export const WC_EMPTY_LIVE =
  "No matches in play right now. Kickoff windows update automatically — ask UR Take about the next fixture.";

export const WC_EMPTY_VIEW = "Fixtures appear here as the slate advances.";

export const WC_MATCH_INTEL_LOADING = "Pulling match intel…";

export const WC_MATCH_INTEL_BODY =
  "Kickoff, group context, and lineup status stay on this card. Deeper stats and props fill in as the match approaches.";
