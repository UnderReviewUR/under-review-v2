import { scrubStructuredFaceText } from "./urTakeFaceTextScrub.js";

/** Badge label only — Strong / Usable / Thin (title case). */
export function formatEstimatedEdgeTierBadgeLabel(dataQuality) {
  const d = String(dataQuality || "").toLowerCase();
  if (d === "strong") return "Strong";
  if (d === "usable") return "Usable";
  if (d === "thin") return "Thin";
  return "—";
}

/**
 * EE confidence shown in the card: usable + thin never show High (cap at Medium).
 * @param {{ dataQuality?: string, confidence?: string } | null} ee
 */
export function displayedEstimatedEdgeConfidence(ee) {
  const dq = String(ee?.dataQuality || "").toLowerCase();
  const raw = String(ee?.confidence || "").trim();
  const normalized =
    raw === "High" || raw === "Medium" || raw === "Speculative" ? raw : "Speculative";
  if (dq === "usable" || dq === "thin") {
    if (normalized === "High") return "Medium";
    return normalized;
  }
  if (dq === "strong") return normalized;
  return normalized;
}

function nonEmptyStr(v) {
  return v != null && String(v).trim() !== "";
}

function playableAtPartsFromEdge(ee) {
  const parts = [];
  if (ee?.playableOverAtOrBelow != null && String(ee.playableOverAtOrBelow).trim() !== "") {
    parts.push(`Over threshold ≤ ${ee.playableOverAtOrBelow}`);
  }
  if (ee?.playableUnderAtOrAbove != null && String(ee.playableUnderAtOrAbove).trim() !== "") {
    parts.push(`Under threshold ≥ ${ee.playableUnderAtOrAbove}`);
  }
  return parts;
}

/**
 * View-model for the Estimated Edge card (assertable without a browser).
 * @param {object | null | undefined} ee
 */
export function buildEstimatedEdgeCardModel(ee) {
  if (!ee || typeof ee !== "object" || ee.source !== "estimated_edge") return null;

  const dq = String(ee.dataQuality || "").toLowerCase();
  const tierBadgeLabel = formatEstimatedEdgeTierBadgeLabel(ee.dataQuality);
  const reasonRaw = scrubStructuredFaceText(ee.dataQualityReason);
  const whyTierBody = reasonRaw.trim() ? reasonRaw : "—";
  const confidenceLabel = displayedEstimatedEdgeConfidence(ee);

  const playableParts = playableAtPartsFromEdge(ee);
  const playableAtDisplay = playableParts.length ? playableParts.join(" · ") : null;

  const isThin = dq === "thin";

  if (isThin) {
    const lean = scrubStructuredFaceText(ee.leanRead);
    const drivers = Array.isArray(ee.drivers)
      ? ee.drivers.map((d) => scrubStructuredFaceText(String(d ?? ""))).filter((s) => s.trim())
      : [];
    return {
      sport: ee.sport,
      tierBadgeLabel,
      whyTierBody,
      confidenceLabel,
      layout: "thin",
      leanHeading: "Lean / pass read only",
      leanBody: lean.trim() ? lean : "—",
      drivers,
      /** No numeric projection / fair / playable / pass-band rows in thin mode. */
      numericRows: [],
    };
  }

  const rows = [];
  if (nonEmptyStr(ee.projection)) {
    rows.push({ key: "projection", label: "UR projection", value: scrubStructuredFaceText(ee.projection) });
  }
  if (nonEmptyStr(ee.fairLine)) {
    rows.push({
      key: "fairRead",
      label: "Structural fair read",
      value: String(ee.fairLine).trim(),
    });
  }
  if (playableAtDisplay) {
    rows.push({ key: "playable", label: "Playable at", value: playableAtDisplay });
  }
  if (nonEmptyStr(ee.passBand)) {
    rows.push({ key: "passBand", label: "Pass band", value: String(ee.passBand).trim() });
  }

  const drivers = Array.isArray(ee.drivers)
    ? ee.drivers.map((d) => scrubStructuredFaceText(String(d ?? ""))).filter((s) => s.trim())
    : [];

  return {
    sport: ee.sport,
    tierBadgeLabel,
    whyTierBody,
    confidenceLabel,
    layout: dq === "usable" ? "usable" : "strong",
    leanHeading: null,
    leanBody: null,
    drivers,
    numericRows: rows,
  };
}
