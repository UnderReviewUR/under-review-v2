import assert from "node:assert/strict";
import test from "node:test";

import { condensedPreviewFromUrTakeResponse } from "./_dailyTakeCondensed.js";

test("condensed preview extracts headline, first chunk, closing", () => {
  const raw = [
    "Live · Q3",
    "",
    "**Lakers moneyline is mispriced** against the spread trap.",
    "",
    "The market is overweight on LeBron narrative while ignoring defensive matchup data from the last five games.",
    "",
    "Fade the public — take the under on inflated totals.",
    "",
    "Confidence: high",
  ].join("\n");

  const out = condensedPreviewFromUrTakeResponse(raw);
  assert.match(out.headline, /Lakers moneyline/i);
  assert.match(out.bodyChunk, /market is overweight/i);
  assert.ok(out.closing.length > 0);
});

test("condensed preview handles empty input", () => {
  const out = condensedPreviewFromUrTakeResponse("");
  assert.equal(out.headline, "");
  assert.equal(out.bodyChunk, "");
  assert.equal(out.closing, "");
});
