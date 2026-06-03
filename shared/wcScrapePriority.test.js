import assert from "node:assert/strict";
import test from "node:test";
import {
  WC_SCRAPE_PRIORITY,
  priorityForWcMatchBundleTarget,
  sortScrapeTargetsByPriority,
} from "./wcScrapePriority.js";

test("priorityForWcMatchBundleTarget ranks live highest", () => {
  const now = Date.parse("2026-06-10T18:00:00Z");
  assert.equal(
    priorityForWcMatchBundleTarget({ gameStartMs: now - 3600000, meta: { scrapeMode: "live" } }, now),
    WC_SCRAPE_PRIORITY.LIVE,
  );
});

test("priorityForWcMatchBundleTarget uses RAMP_T90 inside 90 minutes", () => {
  const now = Date.parse("2026-06-10T18:00:00Z");
  assert.equal(
    priorityForWcMatchBundleTarget({ gameStartMs: now + 45 * 60 * 1000, meta: { scrapeMode: "ramp" } }, now),
    WC_SCRAPE_PRIORITY.RAMP_T90,
  );
});

test("sortScrapeTargetsByPriority orders live before standings and respects cap simulation", () => {
  const now = Date.parse("2026-06-10T18:00:00Z");
  const targets = Array.from({ length: 15 }, (_, i) => ({
    sport: "wc_match_bundle",
    gameId: `u${i}`,
    gameStartMs: now + (i + 1) * 3600000,
    priority: WC_SCRAPE_PRIORITY.RAMP_PRE,
  }));
  targets.push({
    sport: "wc_match_bundle",
    gameId: "live1",
    gameStartMs: now - 1000,
    priority: WC_SCRAPE_PRIORITY.LIVE,
  });
  targets.push({
    sport: "wc_data",
    gameId: "standings",
    gameStartMs: now,
    priority: WC_SCRAPE_PRIORITY.STANDINGS,
  });

  const sorted = sortScrapeTargetsByPriority(targets);
  assert.equal(sorted[0].gameId, "live1");
  assert.ok(sorted[0].priority >= WC_SCRAPE_PRIORITY.RAMP_PRE);

  const capped = sorted.slice(0, 12);
  assert.equal(capped.length, 12);
  assert.equal(capped[0].gameId, "live1");
  assert.ok(!capped.some((t) => t.priority === WC_SCRAPE_PRIORITY.OUTRIGHTS));
});
