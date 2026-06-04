import assert from "node:assert/strict";
import test from "node:test";
import {
  isWcBookRegionEnabled,
  isWcGoldenBootBookEnabled,
  wcBookScrapeFlagsSnapshot,
} from "./wcBookScrapePolicy.js";

test("UK and aggregator regions default off without env", () => {
  const prevUk = process.env.WC_SCRAPE_UK;
  const prevAgg = process.env.WC_SCRAPE_AGG;
  delete process.env.WC_SCRAPE_UK;
  delete process.env.WC_SCRAPE_AGG;
  try {
    assert.equal(isWcBookRegionEnabled("uk"), false);
    assert.equal(isWcBookRegionEnabled("agg"), false);
    assert.equal(isWcGoldenBootBookEnabled("paddypower"), false);
    assert.equal(isWcGoldenBootBookEnabled("oddschecker"), false);
  } finally {
    if (prevUk !== undefined) process.env.WC_SCRAPE_UK = prevUk;
    if (prevAgg !== undefined) process.env.WC_SCRAPE_AGG = prevAgg;
  }
});

test("wcBookScrapeFlagsSnapshot includes alert-friendly structure", () => {
  const snap = wcBookScrapeFlagsSnapshot();
  assert.ok(snap.us);
  assert.ok(snap.uk);
  assert.ok(snap.agg);
  assert.ok("draftkings" in snap.us);
});
