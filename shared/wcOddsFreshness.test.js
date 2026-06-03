import assert from "node:assert/strict";
import test from "node:test";
import {
  attachOutrightsFreshness,
  buildMatchOddsFreshness,
  buildWcOutrightsFreshnessPromptBlock,
  calculateOddsFreshness,
  formatWcOutrightsStaleChipLabel,
  WC_OUTRIGHTS_MAX_AGE_MS,
} from "./wcOddsFreshness.js";

test("calculateOddsFreshness marks fresh within max age", () => {
  const now = Date.parse("2026-06-03T12:00:00.000Z");
  const fresh = calculateOddsFreshness(now - 60 * 60 * 1000, WC_OUTRIGHTS_MAX_AGE_MS, now);
  assert.equal(fresh.isStale, false);
  assert.equal(fresh.ageMinutes, 60);
  assert.equal(fresh.staleWarning, null);
});

test("calculateOddsFreshness marks stale after max age", () => {
  const now = Date.parse("2026-06-03T12:00:00.000Z");
  const stale = calculateOddsFreshness(now - WC_OUTRIGHTS_MAX_AGE_MS - 1, WC_OUTRIGHTS_MAX_AGE_MS, now);
  assert.equal(stale.isStale, true);
  assert.match(String(stale.staleWarning), /mispriced/i);
});

test("buildWcOutrightsFreshnessPromptBlock includes NOR and blocks mispriced when stale", () => {
  const now = Date.parse("2026-06-03T12:00:00.000Z");
  const kv = attachOutrightsFreshness(
    {
      outrights: { NOR: "+2500", ESP: "+650" },
      lastUpdated: now - WC_OUTRIGHTS_MAX_AGE_MS - 60_000,
      source: "espn",
    },
    now,
  );
  const block = buildWcOutrightsFreshnessPromptBlock(kv, now);
  assert.ok(block);
  assert.match(block, /NOR: \+2500/);
  assert.match(block, /ODDS FRESHNESS \(mandatory\)/);
  assert.match(block, /never use the word "mispriced"/i);
  assert.doesNotMatch(block, /When claiming a team is "mispriced", you MUST cite/i);
});

test("buildWcOutrightsFreshnessPromptBlock allows mispriced citation when fresh", () => {
  const now = Date.parse("2026-06-03T12:00:00.000Z");
  const kv = attachOutrightsFreshness(
    {
      outrights: { NOR: "+2500" },
      lastUpdated: now - 30 * 60 * 1000,
      source: "espn",
    },
    now,
  );
  const block = buildWcOutrightsFreshnessPromptBlock(kv, now);
  assert.match(block, /When claiming a team is "mispriced"/);
  assert.doesNotMatch(block, /ODDS FRESHNESS \(mandatory\)/);
});

test("buildMatchOddsFreshness uses oddsUpdatedAt when present", () => {
  const now = Date.parse("2026-06-03T12:00:00.000Z");
  const fresh = buildMatchOddsFreshness(
    {
      odds: { home: { moneyline: "-110" } },
      oddsUpdatedAt: now - 10 * 60 * 1000,
    },
    now - 60 * 60 * 1000,
    now,
  );
  assert.equal(fresh?.isStale, false);
  assert.equal(fresh?.ageMinutes, 10);
});

test("formatWcOutrightsStaleChipLabel returns label for stale meta", () => {
  const label = formatWcOutrightsStaleChipLabel({
    stale: true,
    ageMinutes: 420,
  });
  assert.match(label, /stale/i);
  assert.match(label, /420/);
});
