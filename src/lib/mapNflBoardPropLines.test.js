import assert from "node:assert/strict";
import test from "node:test";
import { mapNflBoardPropLinesToGuide } from "./mapNflBoardPropLines.js";

test("mapNflBoardPropLinesToGuide labels over lean from de-vig", () => {
  const guide = mapNflBoardPropLinesToGuide([
    {
      player: "Jacoby Brissett",
      prop: "pass yards",
      line: 239.5,
      game: "CAR @ ARI",
      overOdds: -140,
      underOdds: 110,
      overImpliedDevig: 0.58,
      underImpliedDevig: 0.42,
      book: "DraftKings",
    },
  ]);
  assert.equal(guide.length, 1);
  assert.equal(guide[0].propType, "pass yards");
  assert.equal(guide[0].live, true);
  assert.match(guide[0].lean, /OVER/);
  assert.equal(guide[0].leanClass, "lean-over");
});
