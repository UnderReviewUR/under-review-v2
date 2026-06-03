import assert from "node:assert/strict";
import test from "node:test";
import { buildWcXiStatusMap, detectXiConfirmedTransitions } from "./wcXiStatusPoll.js";

test("detectXiConfirmedTransitions finds pending to confirmed", () => {
  const prev = buildWcXiStatusMap([{ id: "1", xiStatus: "pending" }]);
  const next = [{ id: "1", xiStatus: "confirmed", homeTeam: "USA", awayTeam: "MEX" }];
  const hits = detectXiConfirmedTransitions(prev, next);
  assert.equal(hits.length, 1);
  assert.equal(hits[0].eventId, "1");
  assert.equal(hits[0].homeTeam, "USA");
});

test("detectXiConfirmedTransitions ignores unchanged or unavailable", () => {
  const prev = buildWcXiStatusMap([{ id: "2", xiStatus: "unavailable" }]);
  const hits = detectXiConfirmedTransitions(prev, [{ id: "2", xiStatus: "pending" }]);
  assert.equal(hits.length, 0);
});
