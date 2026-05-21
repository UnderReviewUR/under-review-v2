import test from "node:test";
import assert from "node:assert/strict";
import {
  FREE_QUESTIONS_PER_WEEK,
  countQueriesInCurrentEtWeek,
  freeTierApproachingLimit,
  getEtWeekStartYmd,
  getNextEtWeekStartYmd,
  isWithinFreeTierQuota,
} from "./freeTierQuota.js";

test("FREE_QUESTIONS_PER_WEEK is 2", () => {
  assert.equal(FREE_QUESTIONS_PER_WEEK, 2);
});

test("countQueriesInCurrentEtWeek only counts timestamps in same ET week", () => {
  const mondayMs = Date.parse("2026-05-11T16:00:00.000Z");
  const weekStart = getEtWeekStartYmd(mondayMs);
  const tuesdayMs = Date.parse("2026-05-12T16:00:00.000Z");
  const priorWeekMs = Date.parse("2026-05-04T16:00:00.000Z");

  assert.equal(getEtWeekStartYmd(tuesdayMs), weekStart);
  assert.equal(countQueriesInCurrentEtWeek([priorWeekMs, tuesdayMs, tuesdayMs + 1], tuesdayMs), 2);
  assert.equal(countQueriesInCurrentEtWeek([priorWeekMs], tuesdayMs), 0);
});

test("isWithinFreeTierQuota and approaching limit", () => {
  assert.ok(isWithinFreeTierQuota(0));
  assert.ok(isWithinFreeTierQuota(1));
  assert.ok(!isWithinFreeTierQuota(2));
  assert.ok(freeTierApproachingLimit(1, 2));
  assert.ok(!freeTierApproachingLimit(0, 2));
});

test("getNextEtWeekStartYmd advances one week", () => {
  assert.equal(getNextEtWeekStartYmd("2026-05-11"), "2026-05-18");
});
