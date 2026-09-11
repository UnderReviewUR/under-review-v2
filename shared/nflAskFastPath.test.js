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

test("isNflScopedPropFastPath — named props follow-up stays on full GOAT path", () => {
  assert.equal(
    isNflScopedPropFastPath("any good props for kittle, kyren, kittle? mccaffrey?"),
    false,
  );
});

test("isNflScopedPropFastPath — ticket review stays on full GOAT path", () => {
  assert.equal(
    isNflScopedPropFastPath(
      "for tonights game, i bet: seahawks win, aj brown over 34.5, darnold under 249.5. thoughts?",
    ),
    false,
  );
});

test("isNflScopedPropFastPath — best player props board stays on full GOAT path", () => {
  assert.equal(
    isNflScopedPropFastPath("best player props for the rams vs 49ers game tonight?"),
    false,
  );
});
