import assert from "node:assert/strict";
import test from "node:test";
import {
  canSpendWcApiFootballQuota,
  recordWcApiFootballQuota,
  wcApiFootballQuotaState,
} from "./wcApiFootballQuota.js";

test("wcApiFootballQuotaState resets on new ET day", () => {
  const kv = {
    quota: { dateYmd: "2026-06-10", used: 40, apiRemaining: 60 },
  };
  const state = wcApiFootballQuotaState(kv, Date.parse("2026-06-11T16:00:00Z"));
  assert.equal(state.usedToday, 0);
  assert.ok(state.remainingBudget > 0);
});

test("canSpendWcApiFootballQuota respects reserve", () => {
  const kv = {
    quota: recordWcApiFootballQuota({ quota: {} }, 80, Date.parse("2026-06-11T16:00:00Z")),
  };
  assert.equal(canSpendWcApiFootballQuota(kv, 1, Date.parse("2026-06-11T16:00:00Z")), false);
  assert.equal(canSpendWcApiFootballQuota({ quota: {} }, 1, Date.parse("2026-06-11T16:00:00Z")), true);
});
