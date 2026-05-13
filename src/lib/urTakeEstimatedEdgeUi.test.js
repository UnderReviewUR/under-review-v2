import test from "node:test";
import assert from "node:assert/strict";

import {
  buildEstimatedEdgeCardModel,
  displayedEstimatedEdgeConfidence,
  formatEstimatedEdgeTierBadgeLabel,
} from "./urTakeEstimatedEdgeUi.js";

const baseEe = {
  source: "estimated_edge",
  sport: "nba",
  marketType: "points",
  subject: "Test Player",
  projection: "26.5 pts",
  fairLine: "24.5",
  playableOverAtOrBelow: 25,
  playableUnderAtOrAbove: 22,
  passBand: "Pass if posted above 27.5",
  confidence: "High",
  drivers: ["Verified minutes trend", "Matchup length"],
  dataQualityReason: "Verified board + season anchor.",
  leanRead: "Lean over on soft matchups only.",
};

test("formatEstimatedEdgeTierBadgeLabel matches Strong / Usable / Thin", () => {
  assert.equal(formatEstimatedEdgeTierBadgeLabel("strong"), "Strong");
  assert.equal(formatEstimatedEdgeTierBadgeLabel("usable"), "Usable");
  assert.equal(formatEstimatedEdgeTierBadgeLabel("thin"), "Thin");
});

test("Strong: full numeric rows + drivers; badge Strong; confidence not capped from High", () => {
  const m = buildEstimatedEdgeCardModel({ ...baseEe, dataQuality: "strong" });
  assert.ok(m);
  assert.equal(m.layout, "strong");
  assert.equal(m.tierBadgeLabel, "Strong");
  assert.equal(m.confidenceLabel, "High");
  const keys = m.numericRows.map((r) => r.key);
  assert.deepEqual(keys, ["projection", "fairRead", "playable", "passBand"]);
  assert.equal(m.drivers.length, 2);
  for (const row of m.numericRows) {
    assert.match(row.label, /^(?!.*\bodds\b)(?!.*\bbook\b)(?!.*opening line).*$/i, row.label);
  }
  assert.equal(m.whyTierBody, "Verified board + season anchor.");
});

test("Usable: same rows; confidence capped to Medium when API says High", () => {
  const m = buildEstimatedEdgeCardModel({ ...baseEe, dataQuality: "usable", confidence: "High" });
  assert.ok(m);
  assert.equal(m.layout, "usable");
  assert.equal(m.tierBadgeLabel, "Usable");
  assert.equal(m.confidenceLabel, "Medium");
  assert.equal(m.numericRows.length, 4);
});

test("Thin: lean-only layout; no numeric rows; badge Thin; confidence cap", () => {
  const m = buildEstimatedEdgeCardModel({
    ...baseEe,
    dataQuality: "thin",
    projection: null,
    fairLine: null,
    playableOverAtOrBelow: null,
    playableUnderAtOrAbove: null,
    passBand: null,
    confidence: "High",
    leanRead: "Pass — context too thin for a number.",
  });
  assert.ok(m);
  assert.equal(m.layout, "thin");
  assert.equal(m.tierBadgeLabel, "Thin");
  assert.equal(m.confidenceLabel, "Medium");
  assert.equal(m.numericRows.length, 0);
  assert.equal(m.leanHeading, "Lean / pass read only");
  assert.ok(String(m.leanBody).includes("Pass"));
});

test("Why this tier always has display text (fallback em dash)", () => {
  const m = buildEstimatedEdgeCardModel({
    ...baseEe,
    dataQuality: "strong",
    dataQualityReason: "   ",
  });
  assert.equal(m.whyTierBody, "—");
});

test("displayedEstimatedEdgeConfidence edge cases", () => {
  assert.equal(
    displayedEstimatedEdgeConfidence({ dataQuality: "usable", confidence: "Speculative" }),
    "Speculative",
  );
  assert.equal(displayedEstimatedEdgeConfidence({ dataQuality: "strong", confidence: "High" }), "High");
});

/** Serializations for CTO verification without a browser (structure ≈ DOM sections). */
test("DOM-equivalent snapshots for Strong / Usable / Thin", () => {
  const strong = buildEstimatedEdgeCardModel({ ...baseEe, dataQuality: "strong" });
  const usable = buildEstimatedEdgeCardModel({ ...baseEe, dataQuality: "usable", confidence: "High" });
  const thin = buildEstimatedEdgeCardModel({
    source: "estimated_edge",
    sport: "nba",
    dataQuality: "thin",
    dataQualityReason: "Thin tier reason.",
    confidence: "Speculative",
    drivers: ["d1"],
    leanRead: "Lean text only.",
    projection: null,
    fairLine: null,
    passBand: null,
    playableOverAtOrBelow: null,
    playableUnderAtOrAbove: null,
  });
  const snap = { strong, usable, thin };
  assert.ok(JSON.stringify(snap).includes('"tierBadgeLabel":"Strong"'));
  assert.ok(JSON.stringify(snap).includes('"tierBadgeLabel":"Usable"'));
  assert.ok(JSON.stringify(snap).includes('"tierBadgeLabel":"Thin"'));
  assert.ok(JSON.stringify(snap).includes('"numericRows":[]'));
});
