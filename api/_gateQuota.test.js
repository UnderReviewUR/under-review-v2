import test from "node:test";
import assert from "node:assert/strict";

const FREE_QUERIES_PER_WEEK = 3;
const WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

function recentInWindow(queries, now) {
  const windowStart = now - WINDOW_MS;
  return queries.filter((t) => t > windowStart);
}

test("gate window keeps only timestamps inside 7d rolling window", () => {
  const now = 1_000_000_000_000;
  const old = now - WINDOW_MS - 1;
  const q = [now, now - 1000, old];
  const recent = recentInWindow(q, now);
  assert.equal(recent.length, 2);
});

test("free tier blocks at 3 queries in window", () => {
  const now = 2_000_000_000_000;
  const queries = [1, 2, 3].map((i) => now - i * 1000);
  const recent = recentInWindow(queries, now);
  assert.equal(recent.length, 3);
  assert.ok(recent.length >= FREE_QUERIES_PER_WEEK);
});
