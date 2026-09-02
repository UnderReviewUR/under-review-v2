import assert from "node:assert/strict";
import test from "node:test";
import { isNflScopedPropFastPath } from "./nflAskFastPath.js";

test("isNflScopedPropFastPath — Maye passing TD ask", () => {
  assert.equal(
    isNflScopedPropFastPath(
      "I'm looking at Maye 1.5 passing TDs (NE @ SEA). Should I fade the over?",
    ),
    true,
  );
});

test("isNflScopedPropFastPath — rejects draft futures", () => {
  assert.equal(isNflScopedPropFastPath("Who wins the AFC at +400?"), false);
});

test("isNflScopedPropFastPath — spread without prop still fast when matchup present", () => {
  assert.equal(isNflScopedPropFastPath("NE @ SEA spread — take the dog or pass?"), true);
});
