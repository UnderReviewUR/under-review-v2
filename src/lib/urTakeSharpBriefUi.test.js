import assert from "node:assert/strict";
import test from "node:test";
import { inferMarketPill } from "./urTakeSharpBriefUi.js";

test("player-prop Over/Under is Prop, not Game", () => {
  assert.equal(inferMarketPill("MAYE UNDER 261.5", "prop"), "Prop");
  assert.equal(inferMarketPill("UNDER 261.5", "prop"), "Prop");
  assert.equal(inferMarketPill("SEA -3.5", "spread"), "Game");
});
