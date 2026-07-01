import test from "node:test";
import assert from "node:assert/strict";
import { resolveWcGoatMatchPlayerPropsCache } from "./_wcMatchPlayerProps.js";

const BDL_PROPS = {
  source: "balldontlie",
  markets: { anytime_scorer: [{ name: "Erling Haaland", americanOdds: "+180" }] },
};

const ESPN_PROPS = {
  source: "espn_scrape",
  markets: { anytime_scorer: [{ name: "Erling Haaland", americanOdds: "+200" }] },
};

test("resolveWcGoatMatchPlayerPropsCache — prefers fresh BDL result", () => {
  assert.equal(resolveWcGoatMatchPlayerPropsCache(BDL_PROPS, ESPN_PROPS), BDL_PROPS);
});

test("resolveWcGoatMatchPlayerPropsCache — keeps stale BDL cache when refresh misses", () => {
  assert.equal(resolveWcGoatMatchPlayerPropsCache(null, BDL_PROPS), BDL_PROPS);
});

test("resolveWcGoatMatchPlayerPropsCache — drops non-BDL cache when refresh misses", () => {
  assert.equal(resolveWcGoatMatchPlayerPropsCache(null, ESPN_PROPS), null);
});
