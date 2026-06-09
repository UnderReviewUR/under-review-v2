import assert from "node:assert/strict";
import test from "node:test";
import { detectNbaPlayerPropIntent } from "./detectNbaPlayerPropIntent.js";

test("detectNbaPlayerPropIntent — fox rebounds", () => {
  assert.equal(detectNbaPlayerPropIntent("fox over 3.5 rebounds?"), true);
});

test("detectNbaPlayerPropIntent — parlay is false", () => {
  assert.equal(
    detectNbaPlayerPropIntent("provide 3 leg player parlay for nba game tonight"),
    false,
  );
});

test("detectNbaPlayerPropIntent — series preview is false", () => {
  assert.equal(detectNbaPlayerPropIntent("Game 3 preview — who has the edge?"), false);
});
