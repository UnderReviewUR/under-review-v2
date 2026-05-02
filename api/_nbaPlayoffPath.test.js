import test from "node:test";
import assert from "node:assert/strict";

import { projectPlayoffMeetingFromSeeds } from "./_nbaPlayoffPath.js";

test("projectPlayoffMeetingFromSeeds: same half (1 vs 4) → conference semis", () => {
  const p = projectPlayoffMeetingFromSeeds(1, 4);
  assert.equal(p.earliestRound, 2);
  assert.equal(p.sameSeriesR1, false);
});

test("projectPlayoffMeetingFromSeeds: opposite halves (1 vs 3) → conference finals", () => {
  const p = projectPlayoffMeetingFromSeeds(1, 3);
  assert.equal(p.earliestRound, 3);
});

test("projectPlayoffMeetingFromSeeds: 4 vs 5 → same R1 series", () => {
  const p = projectPlayoffMeetingFromSeeds(4, 5);
  assert.equal(p.sameSeriesR1, true);
  assert.equal(p.earliestRound, 1);
});
