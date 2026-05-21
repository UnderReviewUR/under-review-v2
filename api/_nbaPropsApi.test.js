import test from "node:test";
import assert from "node:assert/strict";
import { buildNbaPropsFreshness } from "../shared/nbaPropsCachePolicy.js";
import { buildNbaPropsFreshnessPromptBlock } from "./_nbaProps.js";

test("buildNbaPropsFreshnessPromptBlock — fresh cache cites propsOdds paths", () => {
  const fetchedAtMs = Date.now() - 5 * 60 * 1000;
  const freshness = buildNbaPropsFreshness(fetchedAtMs);
  const block = buildNbaPropsFreshnessPromptBlock({
    fetchedAt: freshness.fetchedAt,
    freshness,
  });
  assert.match(block, /propsOdds\.players/);
  assert.doesNotMatch(block, /mandatory/i);
});

test("buildNbaPropsFreshnessPromptBlock — >1h stale blocks live price cites", () => {
  const fetchedAtMs = Date.now() - 90 * 60 * 1000;
  const freshness = buildNbaPropsFreshness(fetchedAtMs);
  const block = buildNbaPropsFreshnessPromptBlock({
    fetchedAt: freshness.fetchedAt,
    freshness,
  });
  assert.match(block, /ODDS FRESHNESS \(mandatory\)/);
  assert.match(block, /do not cite specific American prices/i);
});
