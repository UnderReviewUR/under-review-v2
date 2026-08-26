import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  formatTransferAlertBody,
  formatTransferAlertTitle,
  sendTransferAlertNtfy,
  bounceTransferAlert,
} from "./_transferAlertsNotify.js";

const sample = {
  id: "ta_abc",
  title: "Barcelona close to striker deal — David Ornstein",
  link: "https://example.com/story",
  pubDate: null,
  source: "The Athletic",
  description: "Personal terms agreed, medical this week",
  feedId: "gnews_ornstein",
  feedLabel: "Ornstein wire",
  score: 12,
  barca: true,
  reporters: ["ornstein"],
  tier: 1,
  reasons: ["reporter:ornstein", "barca:barcelona"],
  priority: /** @type {5} */ (5),
};

describe("formatTransferAlertBody", () => {
  it("is extra fact plus reporter, not a URL dump", () => {
    const body = formatTransferAlertBody(sample);
    assert.match(body, /Personal terms/i);
    assert.match(body, /\(Ornstein\)/);
    assert.doesNotMatch(body, /example\.com/);
  });
});

describe("formatTransferAlertTitle", () => {
  it("spoilers the deal in the bold line", () => {
    const title = formatTransferAlertTitle(sample);
    assert.match(title, /Barcelona/i);
    assert.match(title, /Striker/i);
    assert.doesNotMatch(title, /Barça ·/i);
    assert.doesNotMatch(title, /ornstein/i);
  });

  it("does not use Breaking · reporter for tier-1", () => {
    const title = formatTransferAlertTitle({ ...sample, barca: false });
    assert.doesNotMatch(title, /Breaking/i);
    assert.match(title, /Barcelona/i);
  });
});

describe("sendTransferAlertNtfy", () => {
  it("skips when topic unset", async () => {
    const prev = process.env.TRANSFER_ALERTS_NTFY_TOPIC;
    delete process.env.TRANSFER_ALERTS_NTFY_TOPIC;
    try {
      const r = await sendTransferAlertNtfy(sample);
      assert.equal(r.skipped, true);
      assert.equal(r.reason, "topic_missing");
    } finally {
      if (prev !== undefined) process.env.TRANSFER_ALERTS_NTFY_TOPIC = prev;
    }
  });
});

describe("bounceTransferAlert", () => {
  it("returns per-channel results without throwing when unconfigured", async () => {
    const prevTopic = process.env.TRANSFER_ALERTS_NTFY_TOPIC;
    const prevResend = process.env.RESEND_API_KEY;
    const prevFrom = process.env.AUTH_EMAIL_FROM;
    delete process.env.TRANSFER_ALERTS_NTFY_TOPIC;
    delete process.env.RESEND_API_KEY;
    delete process.env.AUTH_EMAIL_FROM;
    try {
      const out = await bounceTransferAlert(sample);
      assert.equal(out.alertId, "ta_abc");
      assert.equal(out.results.length, 2);
      assert.ok(out.results.every((r) => r.skipped || r.ok === false));
    } finally {
      if (prevTopic !== undefined) process.env.TRANSFER_ALERTS_NTFY_TOPIC = prevTopic;
      if (prevResend !== undefined) process.env.RESEND_API_KEY = prevResend;
      if (prevFrom !== undefined) process.env.AUTH_EMAIL_FROM = prevFrom;
    }
  });
});
