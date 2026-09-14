import assert from "node:assert/strict";
import test from "node:test";
import {
  formatNflMarriedBoardProse,
  slimNflMarriedStructuredForDelivery,
} from "./nflAskMarriedDelivery.js";

test("slimNflMarriedStructuredForDelivery drops board echo sections", () => {
  const slim = slimNflMarriedStructuredForDelivery({
    lean: "Lean: Mahomes under 225.5.",
    call: "MAHOMES UNDER 225.5",
    whyNow: "Board:\n1. Mahomes under 225.5",
    edge: "I'd take the under.",
    analysis: {
      matchupAnalysis: "Mahomes under 225.5. Early season.",
      injuryContext: "Check inactives before you bet it.",
      marketContext: "1. Mahomes under 225.5",
      lineMovement: "Stick to a posted number.",
      statisticalEdge: "Early season — treat last year's defense ranks as a prior only.",
    },
    caveats: [
      "Early season — treat last year's defense ranks as a prior only.",
      "If your number is a lot lower, the under gets worse.",
      "Early season — treat last year's defense ranks as a prior only.",
    ],
  });
  assert.equal(slim.analysis.matchupAnalysis, "");
  assert.equal(slim.analysis.marketContext, "");
  assert.equal(slim.analysis.injuryContext, "");
  assert.equal(slim.caveats.length, 2);
  assert.match(slim.caveats[1], /lot lower/i);
});

test("formatNflMarriedBoardProse keeps ticket + board, skips MATCH/MARKET", () => {
  const prose = formatNflMarriedBoardProse({
    lean: "Lean: Mahomes under 225.5.",
    call: "MAHOMES UNDER 225.5",
    confidence: "Speculative",
    whyNow: "Board:\n1. Mahomes under 225.5\n2. Nix under 230.5",
    edge: "I'd take the under. Don't stack it.",
    analysis: {
      matchupAnalysis: "should not appear",
      marketContext: "should not appear",
    },
    caveats: ["Early season — prior only."],
  });
  assert.match(prose, /Lean: Mahomes/);
  assert.match(prose, /Board:/);
  assert.doesNotMatch(prose, /MATCH READ|MARKET|LINE MOVEMENT|STAT EDGE|should not appear/);
  assert.match(prose, /WHAT KILLS IT/);
});
