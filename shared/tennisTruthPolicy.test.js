import test from "node:test";
import assert from "node:assert/strict";

import {
  TENNIS_TRUTH_LAYER,
  getTennisTruthLayer,
  isOddsMarketFallbackRow,
} from "./tennisTruthPolicy.js";

// --- TENNIS_TRUTH_LAYER ---

test("TENNIS_TRUTH_LAYER constants are frozen", () => {
  assert.equal(TENNIS_TRUTH_LAYER.BDL_FIXTURE, "bdl_fixture");
  assert.equal(TENNIS_TRUTH_LAYER.ODDS_MARKET_FALLBACK, "odds_market_fallback");
  assert.equal(TENNIS_TRUTH_LAYER.OTHER, "other");
  assert.throws(() => {
    TENNIS_TRUTH_LAYER.NEW_FIELD = "x";
  });
});

// --- getTennisTruthLayer ---

test("getTennisTruthLayer reads top-level truth_layer", () => {
  assert.equal(getTennisTruthLayer({ truth_layer: "bdl_fixture" }), "bdl_fixture");
});

test("getTennisTruthLayer reads from raw.truth_layer", () => {
  assert.equal(
    getTennisTruthLayer({ raw: { truth_layer: "odds_market_fallback" } }),
    "odds_market_fallback",
  );
});

test("getTennisTruthLayer reads from raw.raw.truth_layer", () => {
  assert.equal(
    getTennisTruthLayer({ raw: { raw: { truth_layer: "bdl_fixture" } } }),
    "bdl_fixture",
  );
});

test("getTennisTruthLayer returns OTHER for empty object", () => {
  assert.equal(getTennisTruthLayer({}), TENNIS_TRUTH_LAYER.OTHER);
});

test("getTennisTruthLayer returns OTHER for null", () => {
  assert.equal(getTennisTruthLayer(null), TENNIS_TRUTH_LAYER.OTHER);
});

test("getTennisTruthLayer returns OTHER for non-object", () => {
  assert.equal(getTennisTruthLayer("string"), TENNIS_TRUTH_LAYER.OTHER);
});

test("getTennisTruthLayer prefers top-level over nested", () => {
  assert.equal(
    getTennisTruthLayer({
      truth_layer: "bdl_fixture",
      raw: { truth_layer: "odds_market_fallback" },
    }),
    "bdl_fixture",
  );
});

// --- isOddsMarketFallbackRow ---

test("isOddsMarketFallbackRow returns true for odds fallback rows", () => {
  assert.equal(isOddsMarketFallbackRow({ truth_layer: "odds_market_fallback" }), true);
});

test("isOddsMarketFallbackRow returns false for bdl fixture rows", () => {
  assert.equal(isOddsMarketFallbackRow({ truth_layer: "bdl_fixture" }), false);
});

test("isOddsMarketFallbackRow returns false for null", () => {
  assert.equal(isOddsMarketFallbackRow(null), false);
});
