import test from "node:test";
import assert from "node:assert/strict";
import {
  buildFreeQuotaPayload,
  buildSessionQuotaPayload,
  countQueriesToday,
  FREE_QUERIES_PER_DAY,
  FREE_SESSION_QUERIES,
  getFreeQuotaStatus,
  isGateServerQuotaEnforce,
  isValidSessionId,
  migrateSessionQuotaToEmail,
  releaseGateQuota,
  releaseSessionQuota,
  reserveGateQuota,
  reserveSessionQuota,
  shouldEnforceGateQuotaForTake,
  utcDateKey,
} from "./_gateQuota.js";
import {
  resolveUrTakeFailSoftFromResponse,
  UR_TAKE_FAIL_SOFT_EMAIL_GATE_MESSAGE,
  UR_TAKE_FAIL_SOFT_QUOTA_MESSAGE,
} from "../src/lib/urTakeFailSoft.js";

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

test("free user fourth question gets limit_reached and quota wall message", async () => {
  const prevEnforce = process.env.GATE_SERVER_QUOTA_ENFORCE;
  const prevAuth = process.env.UR_TAKE_REQUIRE_AUTH;
  process.env.GATE_SERVER_QUOTA_ENFORCE = "1";
  process.env.UR_TAKE_REQUIRE_AUTH = "true";

  try {
    assert.equal(
      shouldEnforceGateQuotaForTake({
        enforceFlag: true,
        dailyTakePipeline: false,
        urAuth: { ok: true, email: "free-user@example.com", tier: "free" },
      }),
      true,
    );

    const email = `quota-wall-${Date.now()}@example.com`;
    const now = Date.now();
    for (let i = 0; i < FREE_QUERIES_PER_DAY; i++) {
      const ok = await reserveGateQuota(email, now + i);
      assert.equal(ok.limitReached, false, `question ${i + 1} should be allowed`);
    }

    const blocked = await reserveGateQuota(email, now + FREE_QUERIES_PER_DAY);
    assert.equal(blocked.limitReached, true);

    const urTakePayload = {
      requestId: "test-request",
      limitReached: true,
      code: "limit_reached",
      freeQuota: blocked.freeQuota,
    };
    assert.equal(urTakePayload.code, "limit_reached");
    assert.equal(urTakePayload.freeQuota.remaining, 0);

    const presentation = resolveUrTakeFailSoftFromResponse(200, urTakePayload);
    assert.equal(presentation.message, UR_TAKE_FAIL_SOFT_QUOTA_MESSAGE);
    assert.equal(presentation.retryable, false);
    assert.equal(presentation.showUpgrade, true);
  } finally {
    if (prevEnforce === undefined) delete process.env.GATE_SERVER_QUOTA_ENFORCE;
    else process.env.GATE_SERVER_QUOTA_ENFORCE = prevEnforce;
    if (prevAuth === undefined) delete process.env.UR_TAKE_REQUIRE_AUTH;
    else process.env.UR_TAKE_REQUIRE_AUTH = prevAuth;
  }
});

test("anonymous session allows three questions then requires email", async () => {
  const sessionId = `test-session-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  assert.ok(isValidSessionId(sessionId));
  assert.equal((await reserveSessionQuota(sessionId)).limitReached, false);
  assert.equal((await reserveSessionQuota(sessionId)).limitReached, false);
  assert.equal((await reserveSessionQuota(sessionId)).limitReached, false);
  const fourth = await reserveSessionQuota(sessionId);
  assert.equal(fourth.limitReached, true);
  assert.equal(fourth.emailRequired, true);
  assert.equal(fourth.freeQuota.scope, "session");

  const presentation = resolveUrTakeFailSoftFromResponse(200, {
    limitReached: true,
    code: "email_required",
    freeQuota: fourth.freeQuota,
  });
  assert.equal(presentation.message, UR_TAKE_FAIL_SOFT_EMAIL_GATE_MESSAGE);
  assert.equal(presentation.showEmailGate, true);
});

test("migrate session quota to email merges usage", async () => {
  const sessionId = `migrate-session-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  const email = `migrate-${Date.now()}@example.com`;
  const now = Date.now();
  await reserveSessionQuota(sessionId, now);
  await reserveSessionQuota(sessionId, now + 1);
  await reserveSessionQuota(sessionId, now + 2);
  const migrated = await migrateSessionQuotaToEmail(sessionId, email, now + 3);
  assert.equal(migrated.ok, true);
  assert.equal(migrated.freeQuota.used, 3);
  assert.equal(migrated.freeQuota.scope, "email");
  const after = await getFreeQuotaStatus(email, now + 3);
  assert.equal(after.used, 3);
});

test("shouldEnforceGateQuotaForTake applies to anonymous session tokens", () => {
  assert.equal(
    shouldEnforceGateQuotaForTake({
      enforceFlag: true,
      dailyTakePipeline: false,
      urAuth: { ok: true, email: null, sessionId: "abc1234567890123", tier: "free" },
    }),
    true,
  );
});

test("session reserve then release restores quota", async () => {
  const sessionId = `session-release-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  const reserved = await reserveSessionQuota(sessionId);
  assert.equal(reserved.limitReached, false);
  await releaseSessionQuota(sessionId, reserved.reservationTs);
  const again = await reserveSessionQuota(sessionId);
  assert.equal(again.limitReached, false);
  assert.equal(again.freeQuota.used, 1);
});

test("buildSessionQuotaPayload tracks lifetime session count", () => {
  const q = buildSessionQuotaPayload([1, 2]);
  assert.equal(q.used, 2);
  assert.equal(q.remaining, 1);
  assert.equal(q.scope, "session");
  assert.equal(FREE_SESSION_QUERIES, 3);
});
