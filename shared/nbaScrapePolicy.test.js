import assert from "node:assert/strict";
import test from "node:test";

import { shouldCollectNbaScrapeTargets } from "./nbaScrapePolicy.js";

test("nba scrape off during wc tournament when nba nav hidden", () => {
  const prevForce = process.env.NBA_SCRAPE_FORCE;
  const prevDisable = process.env.NBA_SCRAPE_DISABLE;
  delete process.env.NBA_SCRAPE_FORCE;
  delete process.env.NBA_SCRAPE_DISABLE;
  assert.equal(shouldCollectNbaScrapeTargets(Date.parse("2026-06-28T18:00:00Z")), false);
  if (prevForce) process.env.NBA_SCRAPE_FORCE = prevForce;
  if (prevDisable) process.env.NBA_SCRAPE_DISABLE = prevDisable;
});

test("nba scrape force env overrides", () => {
  const prev = process.env.NBA_SCRAPE_FORCE;
  process.env.NBA_SCRAPE_FORCE = "1";
  assert.equal(shouldCollectNbaScrapeTargets(Date.parse("2026-06-28T18:00:00Z")), true);
  if (prev) process.env.NBA_SCRAPE_FORCE = prev;
  else delete process.env.NBA_SCRAPE_FORCE;
});
