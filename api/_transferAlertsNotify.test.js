import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  formatTransferAlertBody,
  sendTransferAlertNtfy,
  bounceTransferAlert,
} from "./_transferAlertsNotify.js";

const sample = {
  id: "ta_abc",
  title: "Barcelona close to striker deal — David Ornstein",
  link: "https://example.com/story",
  pubDate: null,
  source: "The Athletic",
  description: "Exclusive",
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
  it("includes title and reporter", () => {
    const body = formatTransferAlertBody(sample);
    assert.match(body, /Barcelona close/);
    assert.match(body, /ornstein/i);
    assert.match(body, /BARÇA/);
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
