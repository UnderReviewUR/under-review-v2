import assert from "node:assert/strict";
import test from "node:test";
import { isNflGamePriceAsk, isNflScopedPropFastPath } from "./nflAskFastPath.js";
import { nflAskUsesMarriedPropPath, resolveNflAskModelLane } from "./nflAskModelRoute.js";
import { detectNflAskMarket } from "./nflGoatExtractionContract.js";

test("isNflScopedPropFastPath — Maye passing TD ask", () => {
  assert.equal(
    isNflScopedPropFastPath(
      "I'm looking at Maye 1.5 passing TDs (NE @ SEA). Should I fade the over?",
    ),
    true,
  );
});

test("home total nudge is a game-price ask, not a props fast path", () => {
  const q = "On CAR @ ATL, the total is 43.5. Over, under, or pass? Give me the lean.";
  assert.equal(detectNflAskMarket(q).marketId, "total");
  assert.equal(isNflGamePriceAsk(q), true);
  assert.equal(isNflScopedPropFastPath(q), false);
  assert.equal(nflAskUsesMarriedPropPath(q), false);
  assert.equal(nflAskUsesMarriedPropPath(q, { fastPathActive: true }), false);
  assert.equal(resolveNflAskModelLane(q).lane, "sonnet");
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

test("isNflScopedPropFastPath — who is X is not a prop fast path", () => {
  assert.equal(isNflScopedPropFastPath("Who is Vaki?"), false);
});
