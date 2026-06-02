import test from "node:test";
import assert from "node:assert/strict";
import {
  buildFreeQuotaPayload,
  countQueriesToday,
  FREE_QUERIES_PER_DAY,
  getFreeQuotaStatus,
  isGateServerQuotaEnforce,
  releaseGateQuota,
  reserveGateQuota,
  utcDateKey,
} from "./_gateQuota.js";

/**
 * UTC calendar day quota helpers — shared by api/gate.js and api/ur-take.js.
 */

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

test("buildFreeQuotaPayload computes remaining", () => {
  const now = Date.UTC(2026, 6, 1, 12, 0, 0);
  const q = buildFreeQuotaPayload([now - 1000], now);
  assert.equal(q.used, 1);
  assert.equal(q.remaining, 2);
  assert.equal(q.dayKey, utcDateKey(now));
});

test("isGateServerQuotaEnforce defaults off", () => {
  const prev = process.env.GATE_SERVER_QUOTA_ENFORCE;
  delete process.env.GATE_SERVER_QUOTA_ENFORCE;
  assert.equal(isGateServerQuotaEnforce(), false);
  process.env.GATE_SERVER_QUOTA_ENFORCE = "1";
  assert.equal(isGateServerQuotaEnforce(), true);
  if (prev === undefined) delete process.env.GATE_SERVER_QUOTA_ENFORCE;
  else process.env.GATE_SERVER_QUOTA_ENFORCE = prev;
});

test("reserve then release restores quota (in-memory durable store)", async () => {
  const email = `quota-release-${Date.now()}@example.com`;
  const now = Date.now();
  const reserved = await reserveGateQuota(email, now);
  assert.equal(reserved.limitReached, false);
  assert.ok(reserved.reservationTs != null);
  assert.equal(reserved.freeQuota.used, 1);

  await releaseGateQuota(email, reserved.reservationTs, now + 50);
  const status = await getFreeQuotaStatus(email, now + 50);
  assert.equal(status.used, 0);
  assert.equal(status.remaining, 3);
});

test("fourth reserve same UTC day hits limit", async () => {
  const email = `quota-limit-${Date.now()}@example.com`;
  const now = Date.now();
  assert.equal((await reserveGateQuota(email, now)).limitReached, false);
  assert.equal((await reserveGateQuota(email, now + 1)).limitReached, false);
  assert.equal((await reserveGateQuota(email, now + 2)).limitReached, false);
  const fourth = await reserveGateQuota(email, now + 3);
  assert.equal(fourth.limitReached, true);
  assert.equal(fourth.freeQuota.used, 3);
});
