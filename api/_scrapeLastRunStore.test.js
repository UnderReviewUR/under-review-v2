import test from "node:test";
import assert from "node:assert/strict";

import {
  loadScrapeLastRunBundle,
  persistScrapeLastRunBundle,
  readLastRunFromBundle,
  writeLastRunToBundle,
} from "./_scrapeLastRunStore.js";

test("scrape last-run bundle read/write round-trip", async () => {
  const bundle = await loadScrapeLastRunBundle();
  assert.equal(readLastRunFromBundle(bundle, "wc_data", "standings_fixtures"), null);

  writeLastRunToBundle(bundle, "wc_data", "standings_fixtures", 1_700_000_000_000);
  assert.equal(readLastRunFromBundle(bundle, "wc_data", "standings_fixtures"), 1_700_000_000_000);
  assert.equal(bundle.dirty, true);

  await persistScrapeLastRunBundle(bundle);
  assert.equal(bundle.dirty, false);

  const reloaded = await loadScrapeLastRunBundle();
  assert.equal(readLastRunFromBundle(reloaded, "wc_data", "standings_fixtures"), 1_700_000_000_000);
});
