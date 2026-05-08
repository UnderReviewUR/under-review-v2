import test from "node:test";
import assert from "node:assert/strict";
import {
  normalizeStructuredUrTakeResponse,
  validateStructuredURTakeResponse,
} from "./urTakeResponse.js";

test("normalize fixes confidence case and timestamp Z", () => {
  const raw = {
    call: "TEST PLAYER O10.5 PTS",
    confidence: "high",
    whyNow: "Market slow to adjust to role expansion tonight.",
    edge: "Books priced this as bench usage but minutes profile primary.",
    callType: "prop",
    analysis: {
      matchupAnalysis: "Volume rises vs weak perimeter defense in pace-up spot.",
      injuryContext: "No relevant injuries for this play.",
      marketContext: "Static board; recreational lean on the over.",
      lineMovement: "Line stable; no recent sharp movement.",
      statisticalEdge: "Season sample supports the threshold at current role.",
    },
    caveats: ["Late scratch risk always exists for rotation players."],
    parlayLegs: null,
    parlayTotalOdds: null,
    sport: "NBA",
    timestamp: "2026-05-07T18:00:00",
  };
  const n = normalizeStructuredUrTakeResponse(raw, "nba");
  assert.equal(n.confidence, "High");
  assert.match(n.timestamp, /Z$/);
  const v = validateStructuredURTakeResponse(n);
  assert.equal(v.valid, true, v.errors?.join("; "));
});

test("normalize maps sport from sportHint when enum wrong", () => {
  const raw = {
    call: "TEST PLAYER O10.5 PTS",
    confidence: "Medium",
    whyNow: "Market slow to adjust to role expansion tonight.",
    edge: "Books priced this as bench usage but minutes profile primary.",
    callType: "prop",
    analysis: {
      matchupAnalysis: "Volume rises vs weak perimeter defense in pace-up spot.",
      injuryContext: "No relevant injuries for this play.",
      marketContext: "Static board; recreational lean on the over.",
      lineMovement: "Line stable; no recent sharp movement.",
      statisticalEdge: "Season sample supports the threshold at current role.",
    },
    caveats: ["Late scratch risk always exists for rotation players."],
    parlayLegs: null,
    parlayTotalOdds: null,
    sport: "basketball",
    timestamp: "2026-05-07T18:00:00.000Z",
  };
  const n = normalizeStructuredUrTakeResponse(raw, "nba");
  assert.equal(n.sport, "NBA");
});
