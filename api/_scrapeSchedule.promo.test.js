import assert from "node:assert/strict";
import test from "node:test";
import { collectWcScrapeTargets } from "./_scrapeSchedule.js";

test("collectWcScrapeTargets runs during home promo window before tournament start", async () => {
  const nowMs = Date.parse("2026-06-06T18:00:00Z");
  const targets = await collectWcScrapeTargets(nowMs);
  const sports = new Set(targets.map((t) => t.sport));
  assert.ok(sports.has("wc_data"));
  assert.ok(sports.has("wc_golden_boot"));
  assert.ok(sports.has("wc_sim"));
});
