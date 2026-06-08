import assert from "node:assert/strict";
import test from "node:test";
import { resolveOutputJsonMode } from "./outputMode.js";

test("resolveOutputJsonMode — Finals parlay uses tier2_5 not nba_finals_json", () => {
  const mode = resolveOutputJsonMode({
    chaseSignals: { isChase: false },
    intent: "general",
    hasImage: false,
    liveSignals: {},
    question: "Build a 3 legged player parlay for the Knicks vs spurs tonight",
    matchupContext: null,
    sportHint: "nba",
    wcIntent: null,
    finalsMode: true,
  });
  assert.equal(mode, "tier2_5_json");
});
