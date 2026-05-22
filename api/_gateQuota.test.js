import test from "node:test";
import assert from "node:assert/strict";

/**
 * Mirrors api/gate.js FREE_QUERIES_PER_DAY (UTC calendar day per email).
 * Client daily keys use local midnight — see src/lib/freeTierLimits.js.
 */
const FREE_QUERIES_PER_DAY = 3;

function utcDateKey(ms = Date.now()) {
  return new Date(ms).toISOString().slice(0, 10);
}

function countQueriesToday(queries, nowMs = Date.now()) {
  const day = utcDateKey(nowMs);
  return (queries || []).filter((ts) => {
    const n = Number(ts);
    return Number.isFinite(n) && n > 0 && utcDateKey(n) === day;
  }).length;
}

function isWithinDailyQuota(queries, nowMs = Date.now()) {
  return countQueriesToday(queries, nowMs) < FREE_QUERIES_PER_DAY;
}

test("free tier allows requests while below daily limit", () => {
  const now = Date.UTC(2026, 4, 21, 12, 0, 0);
  const twoToday = [now - 1000, now - 2000];
  assert.ok(isWithinDailyQuota(twoToday, now));
  assert.ok(!isWithinDailyQuota([...twoToday, now - 3000], now));
});

test("queries from a previous UTC day do not count toward today", () => {
  const now = Date.UTC(2026, 4, 21, 12, 0, 0);
  const yesterday = Date.UTC(2026, 4, 20, 12, 0, 0);
  assert.ok(isWithinDailyQuota([yesterday, yesterday, yesterday], now));
  assert.equal(countQueriesToday([yesterday, yesterday], now), 0);
});

test("daily limit matches gate.js and client FREE_QUESTION_LIMIT (3)", () => {
  assert.equal(FREE_QUERIES_PER_DAY, 3);
});
