import test from "node:test";
import assert from "node:assert/strict";

import { sanitizeDailyTakePreviewPayload } from "./_dailyTakeSanitize.js";

test("sanitizeDailyTakePreviewPayload passes through null payload", () => {
  assert.equal(sanitizeDailyTakePreviewPayload(null), null);
});

test("sanitizeDailyTakePreviewPayload passes through payload with ok=false", () => {
  const payload = { ok: false, error: "some_error" };
  const result = sanitizeDailyTakePreviewPayload(payload);
  assert.equal(result.ok, false);
});

test("sanitizeDailyTakePreviewPayload sanitizes fields when ok=true", () => {
  const payload = {
    ok: true,
    headline: "  Some headline  ",
    bodyChunk: "  Some body  ",
    closing: "  Some closing  ",
  };
  const result = sanitizeDailyTakePreviewPayload(payload);
  assert.equal(result.ok, true);
  assert.equal(typeof result.headline, "string");
  assert.equal(typeof result.bodyChunk, "string");
  assert.equal(typeof result.closing, "string");
});

test("sanitizeDailyTakePreviewPayload strips irrelevant player name (biyombo)", () => {
  const payload = {
    ok: true,
    headline: "Bismack Biyombo leads tonight",
    bodyChunk: "Body text",
    closing: "Closing",
  };
  const result = sanitizeDailyTakePreviewPayload(payload);
  assert.ok(!result.headline.toLowerCase().includes("biyombo"));
});

test("sanitizeDailyTakePreviewPayload strips irrelevant player name (david jones)", () => {
  const payload = {
    ok: true,
    headline: "Normal headline",
    bodyChunk: "David Jones will start tonight",
    closing: "Good luck",
  };
  const result = sanitizeDailyTakePreviewPayload(payload);
  assert.ok(!result.bodyChunk.toLowerCase().includes("david jones"));
});

test("sanitizeDailyTakePreviewPayload preserves other payload fields", () => {
  const payload = {
    ok: true,
    headline: "Good headline",
    bodyChunk: "Good body",
    closing: "Good close",
    extra: "preserved",
  };
  const result = sanitizeDailyTakePreviewPayload(payload);
  assert.equal(result.extra, "preserved");
});
