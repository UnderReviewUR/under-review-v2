import assert from "node:assert/strict";
import test from "node:test";
import {
  attachOutrightsFreshness,
  buildMatchOddsFreshness,
  buildMatchOddsFreshnessPromptBlock,
  buildWcOutrightsFreshnessPromptBlock,
  calculateOddsFreshness,
  formatMatchOddsForPrompt,
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

test("buildMatchOddsFreshness uses tighter max age when live", () => {
  const now = Date.parse("2026-06-03T12:00:00.000Z");
  const fresh = buildMatchOddsFreshness(
    {
      status: "live",
      odds: { home: { moneyline: "-110" } },
      oddsUpdatedAt: now - 4 * 60 * 1000,
    },
    null,
    now,
  );
  assert.equal(fresh?.isStale, false);
});

test("buildMatchOddsFreshnessPromptBlock formats 1X2 lines", () => {
  const now = Date.parse("2026-06-03T12:00:00.000Z");
  const block = buildMatchOddsFreshnessPromptBlock(
    {
      homeTeam: "NOR",
      awayTeam: "FRA",
      status: "NS",
      commenceTs: now + 2 * 60 * 60 * 1000,
      odds: {
        home: { moneyline: "+250" },
        draw: { moneyline: "+220" },
        away: { moneyline: "-110" },
      },
      oddsUpdatedAt: now - 5 * 60 * 1000,
    },
    now,
  );
  assert.ok(block);
  assert.match(block, /NOR \+250/);
  assert.match(block, /Draw \+220/);
  assert.match(block, /FRA -110/);
  assert.match(block, /When citing match moneylines/);
});

test("formatMatchOddsForPrompt returns null when empty", () => {
  assert.equal(formatMatchOddsForPrompt(null), null);
  assert.equal(formatMatchOddsForPrompt({}), null);
});

test("formatWcOutrightsStaleChipLabel returns user-facing markets chip", () => {
  const label = formatWcOutrightsStaleChipLabel({
    stale: true,
    ageMinutes: 120,
  });
  assert.match(label, /Tournament markets/i);
  assert.match(label, /120/);
});
