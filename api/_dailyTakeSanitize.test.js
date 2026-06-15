import assert from "node:assert/strict";
import test from "node:test";

import {
  isDailyTakePreviewRefusalText,
  sanitizeDailyTakePreviewPayload,
} from "./_dailyTakeSanitize.js";

test("isDailyTakePreviewRefusalText detects model meta-refusal copy", () => {
  const s =
    "I appreciate the detailed setup, but I need to be direct: the context shows no active game between Miami and Philadelphia today.";
  assert.equal(isDailyTakePreviewRefusalText(s), true);
});

test("sanitizeDailyTakePreviewPayload blocks meta-refusal previews", () => {
  const out = sanitizeDailyTakePreviewPayload({
    ok: true,
    headline:
      "I appreciate the detailed setup, but I need to be direct: the context shows no active game.",
    bodyChunk: "NBA Context Issue: todaysGames is empty.",
    closing: "The context payload is NBA-rooted.",
  });
  assert.equal(out.ok, false);
  assert.equal(out.error, "preview_blocked_meta_refusal");
});
