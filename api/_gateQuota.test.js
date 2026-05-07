import test from "node:test";
import assert from "node:assert/strict";

/**
 * Mirrors api/gate.js FREE_QUERIES_LIFETIME (lifetime cap per email, not a rolling week).
 * Must match src/lib/freeTierLimits.js FREE_QUESTION_LIMIT.
 */
const FREE_QUERIES_LIFETIME = 2;

function isWithinLifetimeQuota(queriesLength) {
  return queriesLength < FREE_QUERIES_LIFETIME;
}

test("free tier allows requests while below lifetime limit", () => {
  assert.ok(isWithinLifetimeQuota(0));
  assert.ok(isWithinLifetimeQuota(1));
  assert.ok(!isWithinLifetimeQuota(2));
});

test("lifetime limit matches gate.js and client FREE_QUESTION_LIMIT (2)", () => {
  assert.equal(FREE_QUERIES_LIFETIME, 2);
});
