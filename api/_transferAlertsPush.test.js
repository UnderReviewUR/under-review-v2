import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { signToken } from "./_hmacToken.js";
import {
  codesEqual,
  isOwnerPushActor,
  normalizePushSubscription,
  sendTransferAlertWebPush,
} from "./_transferAlertsPush.js";

describe("codesEqual", () => {
  it("matches owner codes case-insensitively", () => {
    assert.equal(codesEqual("Secret", "secret"), true);
    assert.equal(codesEqual("a", "b"), false);
    assert.equal(codesEqual("", "x"), false);
  });
});

describe("isOwnerPushActor", () => {
  it("allows owner code and owner token, not friend", () => {
    const prevOwner = process.env.OWNER_CODE;
    const prevSecret = process.env.ACCESS_TOKEN_SECRET;
    const prevVercel = process.env.VERCEL_ENV;
    process.env.OWNER_CODE = "jon-only";
    process.env.ACCESS_TOKEN_SECRET = "unit-test-secret-for-hmac";
    delete process.env.VERCEL_ENV;
    try {
      assert.equal(isOwnerPushActor({ body: { code: "JON-ONLY" }, headers: {} }), true);
      assert.equal(isOwnerPushActor({ body: { code: "friend-code" }, headers: {} }), false);

      const ownerTok = signToken({ tier: "owner", issuedAt: "2026-01-01" }, "unit-test-secret-for-hmac");
      const friendTok = signToken({ tier: "friend", issuedAt: "2026-01-01" }, "unit-test-secret-for-hmac");
      assert.equal(
        isOwnerPushActor({ headers: { authorization: `Bearer ${ownerTok}` }, body: {} }),
        true,
      );
      assert.equal(
        isOwnerPushActor({ headers: { authorization: `Bearer ${friendTok}` }, body: {} }),
        false,
      );
    } finally {
      if (prevOwner !== undefined) process.env.OWNER_CODE = prevOwner;
      else delete process.env.OWNER_CODE;
      if (prevSecret !== undefined) process.env.ACCESS_TOKEN_SECRET = prevSecret;
      else delete process.env.ACCESS_TOKEN_SECRET;
      if (prevVercel !== undefined) process.env.VERCEL_ENV = prevVercel;
    }
  });
});

describe("normalizePushSubscription", () => {
  it("drops junk", () => {
    assert.equal(normalizePushSubscription({ endpoint: "http://x" }), null);
    assert.ok(
      normalizePushSubscription({
        endpoint: "https://push.example/abc",
        keys: { p256dh: "p", auth: "a" },
      }),
    );
  });
});

describe("sendTransferAlertWebPush", () => {
  it("skips when VAPID unset", async () => {
    const prevPub = process.env.VAPID_PUBLIC_KEY;
    const prevPriv = process.env.VAPID_PRIVATE_KEY;
    delete process.env.VAPID_PUBLIC_KEY;
    delete process.env.VAPID_PRIVATE_KEY;
    try {
      const r = await sendTransferAlertWebPush({
        title: "Chelsea considering Martinez",
        description: "Personal terms",
        reporters: ["ornstein"],
        priority: 4,
      });
      assert.equal(r.skipped, true);
      assert.equal(r.reason, "vapid_missing");
    } finally {
      if (prevPub !== undefined) process.env.VAPID_PUBLIC_KEY = prevPub;
      if (prevPriv !== undefined) process.env.VAPID_PRIVATE_KEY = prevPriv;
    }
  });
});
