import assert from "node:assert/strict";
import test from "node:test";
import { detectParlayIntent } from "./detectParlayIntent.js";

test("detectParlayIntent — 3-leg player parlay", () => {
  assert.equal(
    detectParlayIntent("Build a 3 legged player parlay for the Knicks vs spurs tonight"),
    true,
  );
});

test("detectParlayIntent — ignores generic props", () => {
  assert.equal(detectParlayIntent("best player props tonight"), false);
});
