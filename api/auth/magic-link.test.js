import test from "node:test";
import assert from "node:assert/strict";
import crypto from "crypto";
import { setDurableJson } from "../_durableStore.js";
import {
  MAGIC_LINK_GENERIC_MESSAGE,
  magicRecordKeyFromHash,
  pruneRateHits,
  sha256HexUtf8,
  trySendProMagicLink,
  verifyMagicTokenAndIssuePro,
} from "./magicLinkCore.js";

function stripeWithSubscription(active) {
  return {
    customers: {
      list: async ({ email: em }) => ({
        data: em ? [{ id: "cus_magic_test", email: String(em) }] : [],
      }),
    },
    subscriptions: {
      list: async () => ({
        data: active
          ? [
              {
                id: "sub_magic_test",
                status: "active",
                current_period_end: Math.floor(Date.now() / 1000) + 86400 * 30,
              },
            ]
          : [],
      }),
    },
  };
}

test("pruneRateHits drops timestamps outside 1h window", () => {
  const now = 10_000_000_000;
  const old = now - 61 * 60 * 1000;
  const hits = pruneRateHits([now, now - 1000, old], now);
  assert.equal(hits.length, 2);
});

test("sha256HexUtf8 is stable for utf8 input", () => {
  assert.equal(
    sha256HexUtf8("hello"),
    "2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824",
  );
});

test("trySendProMagicLink: non-subscriber does not call Resend", async (t) => {
  const orig = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = async () => {
    calls += 1;
    return { ok: true, text: async () => "" };
  };
  t.after(() => {
    globalThis.fetch = orig;
  });

  process.env.RESEND_API_KEY = "re_test";
  process.env.AUTH_EMAIL_FROM = "onboarding@resend.dev";
  process.env.APP_BASE_URL = "http://localhost:5173";

  const email = `nosub-${crypto.randomBytes(6).toString("hex")}@test.local`;
  const out = await trySendProMagicLink({
    email,
    clientIp: "127.0.0.1",
    stripe: stripeWithSubscription(false),
  });
  assert.equal(out.outcome, "not_subscribed");
  assert.equal(calls, 0);
});

test("trySendProMagicLink: subscriber triggers Resend once", async (t) => {
  const orig = globalThis.fetch;
  let bodies = [];
  globalThis.fetch = async (url, opts) => {
    if (String(url).includes("resend.com")) {
      bodies.push(JSON.parse(String(opts.body || "{}")));
      return { ok: true, text: async () => "" };
    }
    return orig(url, opts);
  };
  t.after(() => {
    globalThis.fetch = orig;
  });

  process.env.RESEND_API_KEY = "re_test";
  process.env.AUTH_EMAIL_FROM = "onboarding@resend.dev";
  process.env.APP_BASE_URL = "http://localhost:5173";

  const email = `sub-${crypto.randomBytes(8).toString("hex")}@test.local`;
  const out = await trySendProMagicLink({
    email,
    clientIp: "127.0.0.2",
    stripe: stripeWithSubscription(true),
  });
  assert.equal(out.outcome, "sent");
  assert.equal(bodies.length, 1);
  assert.equal(bodies[0].to[0], email);
  assert.ok(String(bodies[0].text || "").includes("/api/auth/verify?token="));
});

test("trySendProMagicLink: fourth request same email is rate limited (no fourth Resend)", async (t) => {
  const orig = globalThis.fetch;
  let resendCalls = 0;
  globalThis.fetch = async (url, opts) => {
    if (String(url).includes("resend.com")) {
      resendCalls += 1;
      return { ok: true, text: async () => "" };
    }
    return orig(url, opts);
  };
  t.after(() => {
    globalThis.fetch = orig;
  });

  process.env.RESEND_API_KEY = "re_test";
  process.env.AUTH_EMAIL_FROM = "onboarding@resend.dev";
  process.env.APP_BASE_URL = "http://localhost:5173";

  const stripe = stripeWithSubscription(true);
  const email = `rl-${crypto.randomBytes(8).toString("hex")}@test.local`;
  const ip = "10.0.0.44";

  assert.equal((await trySendProMagicLink({ email, clientIp: ip, stripe })).outcome, "sent");
  assert.equal((await trySendProMagicLink({ email, clientIp: ip, stripe })).outcome, "sent");
  assert.equal((await trySendProMagicLink({ email, clientIp: ip, stripe })).outcome, "sent");
  assert.equal((await trySendProMagicLink({ email, clientIp: ip, stripe })).outcome, "rate_limited");
  assert.equal(resendCalls, 3);
});

test("verifyMagicTokenAndIssuePro: expired token", async () => {
  const secret = "unit-test-access-token-secret-32b!!";
  const raw = crypto.randomBytes(32).toString("hex");
  const key = magicRecordKeyFromHash(sha256HexUtf8(raw));
  const email = `exp-${crypto.randomBytes(4).toString("hex")}@test.local`;
  await setDurableJson(
    key,
    { email, expiresAt: Date.now() - 60_000, used: false },
    { ttlSeconds: 120 },
  );
  const r = await verifyMagicTokenAndIssuePro(raw, stripeWithSubscription(true), secret);
  assert.equal(r.ok, false);
  assert.equal(r.reason, "expired");
});

test("verifyMagicTokenAndIssuePro: token cannot be reused", async (t) => {
  const orig = globalThis.fetch;
  let raw = "";
  globalThis.fetch = async (url, opts) => {
    if (String(url).includes("resend.com")) {
      const j = JSON.parse(String(opts.body || "{}"));
      const m = /token=([a-f0-9]{64})/i.exec(String(j.text || ""));
      if (m) raw = m[1];
      return { ok: true, text: async () => "" };
    }
    return orig(url, opts);
  };
  t.after(() => {
    globalThis.fetch = orig;
  });

  process.env.RESEND_API_KEY = "re_test";
  process.env.AUTH_EMAIL_FROM = "onboarding@resend.dev";
  process.env.APP_BASE_URL = "http://localhost:5173";

  const secret = "unit-test-access-token-secret-32b!!";
  const stripe = stripeWithSubscription(true);
  const email = `reuse-${crypto.randomBytes(8).toString("hex")}@test.local`;
  await trySendProMagicLink({ email, clientIp: "127.0.0.9", stripe });
  assert.ok(/^[a-f0-9]{64}$/i.test(raw));

  const first = await verifyMagicTokenAndIssuePro(raw, stripe, secret);
  assert.equal(first.ok, true);
  assert.ok(first.token);

  const second = await verifyMagicTokenAndIssuePro(raw, stripe, secret);
  assert.equal(second.ok, false);
  assert.equal(second.reason, "used");
});

test("verifyMagicTokenAndIssuePro: concurrent verify only issues one token", async () => {
  const secret = "unit-test-access-token-secret-32b!!";
  const raw = crypto.randomBytes(32).toString("hex");
  const key = magicRecordKeyFromHash(sha256HexUtf8(raw));
  const email = `race-${crypto.randomBytes(6).toString("hex")}@test.local`;
  await setDurableJson(
    key,
    { email, expiresAt: Date.now() + 600_000, used: false },
    { ttlSeconds: 120 },
  );
  const stripe = stripeWithSubscription(true);
  const [first, second] = await Promise.all([
    verifyMagicTokenAndIssuePro(raw, stripe, secret),
    verifyMagicTokenAndIssuePro(raw, stripe, secret),
  ]);
  const winners = [first, second].filter((r) => r.ok);
  const losers = [first, second].filter((r) => !r.ok);
  assert.equal(winners.length, 1);
  assert.equal(losers.length, 1);
  assert.equal(losers[0].reason, "used");
  assert.ok(winners[0].token);
});

test("verifyMagicTokenAndIssuePro: subscription inactive at verify time", async (t) => {
  const orig = globalThis.fetch;
  let raw = "";
  globalThis.fetch = async (url, opts) => {
    if (String(url).includes("resend.com")) {
      const j = JSON.parse(String(opts.body || "{}"));
      const m = /token=([a-f0-9]{64})/i.exec(String(j.text || ""));
      if (m) raw = m[1];
      return { ok: true, text: async () => "" };
    }
    return orig(url, opts);
  };
  t.after(() => {
    globalThis.fetch = orig;
  });

  process.env.RESEND_API_KEY = "re_test";
  process.env.AUTH_EMAIL_FROM = "onboarding@resend.dev";
  process.env.APP_BASE_URL = "http://localhost:5173";

  const secret = "unit-test-access-token-secret-32b!!";
  const email = `inactive-${crypto.randomBytes(8).toString("hex")}@test.local`;
  await trySendProMagicLink({
    email,
    clientIp: "127.0.0.11",
    stripe: stripeWithSubscription(true),
  });
  assert.ok(/^[a-f0-9]{64}$/i.test(raw));

  const r = await verifyMagicTokenAndIssuePro(raw, stripeWithSubscription(false), secret);
  assert.equal(r.ok, false);
  assert.equal(r.reason, "subscription_inactive");
});

test("MAGIC_LINK_GENERIC_MESSAGE mentions email, not definitive Pro state", () => {
  assert.match(MAGIC_LINK_GENERIC_MESSAGE, /email/i);
});
