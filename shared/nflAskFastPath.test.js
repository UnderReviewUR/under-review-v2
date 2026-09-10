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

test("isNflScopedPropFastPath — named props follow-up", () => {
  assert.equal(
    isNflScopedPropFastPath("any good props for kittle, kyren, kittle? mccaffrey?"),
    true,
  );
});
