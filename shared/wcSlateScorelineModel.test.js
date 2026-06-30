import assert from "node:assert/strict";
import test from "node:test";
import { topWcScorelinesForFixture } from "./wcSlateScorelineModel.js";

test("topWcScorelinesForFixture returns plausible scorelines for known teams", () => {
  const model = topWcScorelinesForFixture("FRA", "BRA");
  assert.ok(model?.best?.scoreline);
  assert.match(model.best.scoreline, /^\d+-\d+$/);
  assert.ok(model.best.probPct > 0 && model.best.probPct < 40);
  assert.ok(model.top.length >= 2);
});
