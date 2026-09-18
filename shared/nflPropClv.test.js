import assert from "node:assert/strict";
import test from "node:test";
import { nflPropClvFromLines } from "./nflPropClv.js";

test("Over gets positive CLV when line rises", () => {
  const c = nflPropClvFromLines(72.5, 75.5, "over");
  assert.equal(c.lineMove, 3);
  assert.equal(c.overClvPoints, 3);
  assert.equal(c.underClvPoints, -3);
  assert.equal(c.moveTowardWinner, true);
  assert.equal(c.openSideHadClv, true);
});

test("Under gets positive CLV when line falls", () => {
  const c = nflPropClvFromLines(72.5, 69.5, "under");
  assert.equal(c.lineMove, -3);
  assert.equal(c.underClvPoints, 3);
  assert.equal(c.moveTowardWinner, true);
  assert.equal(c.openSideHadClv, true);
});

test("steam against the winner → no open CLV", () => {
  const c = nflPropClvFromLines(72.5, 78.5, "under");
  assert.equal(c.moveTowardWinner, false);
  assert.equal(c.openSideHadClv, false);
});

test("push has null CLV flags", () => {
  const c = nflPropClvFromLines(72.5, 74.5, "push");
  assert.equal(c.moveTowardWinner, null);
  assert.equal(c.openSideHadClv, null);
});
