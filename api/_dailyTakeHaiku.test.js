import assert from "node:assert/strict";
import test from "node:test";

import { parseDailyTakeHaikuJson } from "./_dailyTakeHaiku.js";

test("parseDailyTakeHaikuJson accepts raw JSON", () => {
  const out = parseDailyTakeHaikuJson(
    JSON.stringify({
      headline: "USA-Mexico is a coin flip with juice.",
      bodyChunk: "Both sides advance at high rates in sims.",
      closing: "Pass ML — wait for a live edge.",
      confidence: "Medium",
    }),
  );
  assert.ok(out);
  assert.equal(out.headline.includes("coin flip"), true);
  assert.equal(out.confidence, "Medium");
});

test("parseDailyTakeHaikuJson rejects missing headline", () => {
  assert.equal(parseDailyTakeHaikuJson(JSON.stringify({ bodyChunk: "x" })), null);
});
