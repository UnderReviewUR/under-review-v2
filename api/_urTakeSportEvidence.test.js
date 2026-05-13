import test from "node:test";
import assert from "node:assert/strict";

import {
  buildConfidenceDriversFromUrTakeSignals,
  buildDefaultUnsupportedClaimFlags,
  buildSportEvidenceLayer,
  formatEvidencePromptBlock,
} from "./_urTakeSportEvidence.js";
import { lintUrTakeOutput } from "./_urTakeOutputQA.js";

test("buildDefaultUnsupportedClaimFlags sets safe defaults", () => {
  const f = buildDefaultUnsupportedClaimFlags();
  assert.equal(f.lineMovementEvidence, false);
  assert.equal(f.weatherEvidence, false);
  assert.equal(f.injuryEvidence, false);
  assert.equal(f.matchupStatsEvidence, false);
  assert.equal(f.courseEvidence, false);
  assert.equal(f.surfaceEvidence, false);
  assert.equal(f.sessionDataEvidence, false);
});

test("formatEvidencePromptBlock includes VERIFIED_SNAPSHOT and CLAIM_FLAGS", () => {
  const block = formatEvidencePromptBlock({
    verifiedSnapshot: ["A", "B"],
    baselineFacts: ["C"],
    dataLimitations: ["D"],
    unsupportedClaimFlags: buildDefaultUnsupportedClaimFlags(),
    confidenceDrivers: ["Sport route: nba"],
  });
  assert.match(block, /VERIFIED_SNAPSHOT/);
  assert.match(block, /BASELINE/);
  assert.match(block, /DATA_LIMITATIONS/);
  assert.match(block, /CLAIM_FLAGS/);
  assert.match(block, /CONFIDENCE_DRIVERS/);
  assert.match(block, /"lineMovementEvidence":false/);
});

test("buildSportEvidenceLayer merges confidenceDrivers and handles derby", () => {
  const nba = buildSportEvidenceLayer({
    sportHint: "nba",
    question: "Lakers",
    nbaContextForModel: { todaysGames: [{}], propLines: [{}], injuries: [{}], playerStats: [] },
    confidenceDrivers: ["Payload/context quality: high"],
  });
  assert.ok(nba.confidenceDrivers.some((d) => d.includes("Payload")));
  assert.equal(nba.unsupportedClaimFlags.injuryEvidence, true);

  const derby = buildSportEvidenceLayer({
    sportHint: "derby",
    question: "Kentucky Derby",
    confidenceDrivers: ["Sport route: derby"],
  });
  assert.match(derby.verifiedSnapshot.join(" "), /Derby/);
  assert.ok(derby.confidenceDrivers.some((d) => d.includes("derby")));
});

test("buildConfidenceDriversFromUrTakeSignals notes live cap", () => {
  const d = buildConfidenceDriversFromUrTakeSignals({
    sportHint: "nba",
    intent: "general",
    hasImage: false,
    matchupContext: false,
    question: "test",
    contextQuality: "medium",
    isLive: true,
    evidenceThin: true,
  });
  assert.ok(d.some((x) => x.includes("Live keyword")));
  assert.ok(d.some((x) => x.includes("Evidence layer: thin")));
});

test("lintUrTakeOutput flags unsupported claims when evidence flags false", () => {
  const flags = buildDefaultUnsupportedClaimFlags();
  const sharp = lintUrTakeOutput("Syndicate steam moved this total.", { unsupportedClaimFlags: flags });
  assert.ok(sharp.criticalRegenerationCodes.includes("unsupported_line_movement_claim"));
  assert.ok(sharp.sportIssues?.some((i) => i.code === "unsupported_line_movement_claim"));

  const market = lintUrTakeOutput("The market moved hard on the under.", { unsupportedClaimFlags: flags });
  assert.ok(market.criticalRegenerationCodes.includes("unsupported_line_movement_claim"));

  const wx = lintUrTakeOutput("Expect 25 mph wind at first pitch.", { unsupportedClaimFlags: flags });
  assert.ok(wx.criticalRegenerationCodes.includes("unsupported_weather_claim"));
});
