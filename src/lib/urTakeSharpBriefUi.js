import { buildEstimatedEdgeCardModel, displayedEstimatedEdgeConfidence } from "./urTakeEstimatedEdgeUi.js";

function nonEmpty(v) {
  return v != null && String(v).trim() !== "";
}

function playableEeSummary(ee) {
  const parts = [];
  if (ee?.playableOverAtOrBelow != null && String(ee.playableOverAtOrBelow).trim() !== "") {
    parts.push(`O ≤ ${ee.playableOverAtOrBelow}`);
  }
  if (ee?.playableUnderAtOrAbove != null && String(ee.playableUnderAtOrAbove).trim() !== "") {
    parts.push(`U ≥ ${ee.playableUnderAtOrAbove}`);
  }
  return parts.length ? parts.join(" · ") : "Threshold in body";
}

/**
 * Four non-empty stat slots for Sharp Brief grid.
 * @param {object} opts
 * @param {object|null} opts.estimatedEdge
 * @param {object|null} opts.takeMeta
 * @param {object} opts.structured — { call, confidence, callType }
 */
export function buildSharpBriefStatGrid({ estimatedEdge, takeMeta, structured }) {
  const ee = estimatedEdge?.source === "estimated_edge" ? estimatedEdge : null;
  const call = String(structured?.call || "").trim();
  const conf = String(structured?.confidence || "Medium").trim();
  const callType = String(structured?.callType || "single").toLowerCase();

  if (ee) {
    const proj = nonEmpty(ee.projection)
      ? String(ee.projection).trim()
      : nonEmpty(ee.leanRead)
        ? String(ee.leanRead).trim().slice(0, 80)
        : call.slice(0, 80) || "UR read";
    const playable = playableEeSummary(ee);
    const dq = String(ee.dataQuality || "thin").replace(/^./, (c) => c.toUpperCase());
    const capConf = displayedEstimatedEdgeConfidence(ee);
    return {
      mode: "ee",
      slots: [
        { key: "p", label: "UR projection", value: proj, highlight: false },
        { key: "pl", label: "Playable at", value: playable, highlight: true },
        { key: "dq", label: "Data quality", value: dq, highlight: false },
        { key: "c", label: "Confidence — capped", value: capConf, highlight: false },
      ],
    };
  }

  if (callType === "parlay") {
    return {
      mode: "parlay",
      slots: [
        { key: "t", label: "Format", value: "Parlay", highlight: false },
        { key: "l", label: "Legs", value: "Multi-leg ticket", highlight: false },
        { key: "r", label: "Read", value: call.slice(0, 72) || "Stacked angles", highlight: false },
        { key: "c", label: "Confidence", value: conf || "Medium", highlight: false },
      ],
    };
  }

  const snap = takeMeta?.openingLineSnapshot;
  const lineVal =
    snap?.line != null && String(snap.line).trim() !== ""
      ? String(snap.line)
      : snap?.openingAmerican != null
        ? `${snap.openingAmerican > 0 ? "+" : ""}${snap.openingAmerican}`
        : "";
  const sideRaw = snap?.side != null ? String(snap.side).trim() : "";
  const direction =
    /over/i.test(sideRaw) ? "Over" : /under/i.test(sideRaw) ? "Under" : sideRaw ? sideRaw : "Side";
  const proj = call.slice(0, 80) || "UR read";

  if (lineVal) {
    const juice =
      snap?.openingAmerican != null && Number.isFinite(Number(snap.openingAmerican))
        ? ` (${snap.openingAmerican > 0 ? "+" : ""}${snap.openingAmerican})`
        : "";
    return {
      mode: "odds",
      slots: [
        { key: "p", label: "UR projection", value: proj, highlight: false },
        { key: "ln", label: "Line", value: `${lineVal}${juice}`, highlight: false },
        { key: "d", label: "Direction", value: direction, highlight: false },
        { key: "c", label: "Confidence", value: conf || "Medium", highlight: false },
      ],
    };
  }

  return {
    mode: "structural",
    slots: [
      { key: "p", label: "UR read", value: proj, highlight: false },
      { key: "ln", label: "Line", value: "Odds-off — no posted line", highlight: false },
      { key: "d", label: "Lean", value: direction !== "Side" ? direction : "See body", highlight: false },
      { key: "c", label: "Confidence", value: conf || "Medium", highlight: false },
    ],
  };
}

const INJURY_LEAD =
  /^(out|questionable|doubtful|injury|injured|ruled|inactive|dnp|gtd|probable|game\s*time|downgraded|upgraded|status|roster|minutes\s*restriction)\b/i;

/** Prefer edge-first headline; avoid opening on injury status lines. */
export function pickSharpBriefHeadline(call, edge, callType, sport) {
  const c = String(call || "").trim();
  const e = String(edge || "").trim();
  const firstCallLine = c.split("\n").map((l) => l.trim()).find(Boolean) || c;
  if (firstCallLine && !INJURY_LEAD.test(firstCallLine)) {
    return firstCallLine.length > 140 ? `${firstCallLine.slice(0, 137)}…` : firstCallLine;
  }
  const firstEdge = e.split("\n").map((l) => l.trim()).find(Boolean) || e;
  if (firstEdge) return firstEdge.length > 140 ? `${firstEdge.slice(0, 137)}…` : firstEdge;
  return c.slice(0, 140) || "UR Take read";
}

export function inferMarketPill(call, callType) {
  const t = String(call || "").toLowerCase();
  if (String(callType || "").toLowerCase() === "parlay") return "Parlay";
  if (/\bpra\b|\bpoints\s*\+?\s*rebounds\s*\+?\s*assists\b/i.test(t)) return "PRA";
  if (/\bpoints\b|\bppg\b|\bpts\b/i.test(t)) return "Points";
  if (/\brebounds?\b|\brpg\b/i.test(t)) return "Rebounds";
  if (/\bassists?\b|\bapg\b/i.test(t)) return "Assists";
  if (/\bspread\b|\bats\b|\bml\b|moneyline|total|over|under/i.test(t)) return "Game";
  return "Prop";
}

export function inferEdgeTypePill(callType) {
  const c = String(callType || "single").toLowerCase();
  if (c === "parlay") return "Parlay";
  if (c === "live") return "Live";
  return "Edge";
}
