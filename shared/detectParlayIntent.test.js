import assert from "node:assert/strict";
import test from "node:test";
import { detectParlayIntent, extractParlayLegCount } from "./detectParlayIntent.js";

test("detectParlayIntent — 3-leg player parlay", () => {
  assert.equal(
    detectParlayIntent("Build a 3 legged player parlay for the Knicks vs spurs tonight"),
    true,
  );
});

test("detectParlayIntent — ignores generic props", () => {
  assert.equal(detectParlayIntent("best player props tonight"), false);
});

test("detectParlayIntent — 4 player parlay", () => {
  assert.equal(detectParlayIntent("4 player parlay"), true);
});

test("detectParlayIntent — plural player parlays", () => {
  assert.equal(detectParlayIntent("best player parlays today"), true);
});

test("extractParlayLegCount — player parlay count", () => {
  assert.equal(extractParlayLegCount("4 player parlay"), 4);
  assert.equal(extractParlayLegCount("build a 3 legged player parlay"), 3);
  assert.equal(extractParlayLegCount("rank the best 5 player parlays today"), 5);
  assert.equal(extractParlayLegCount("best player props tonight"), null);
});
