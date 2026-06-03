import assert from "node:assert/strict";
import test from "node:test";
import {
  buildPriceBindingPromptBlock,
  detectUncitedAmericanOdds,
  extractAmericanOddsFromQuestion,
} from "./wcUrTakePricing.js";
import { WC_INTENT } from "./wcUrTakeIntent.js";

test("extractAmericanOddsFromQuestion — single price", () => {
  assert.deepEqual(extractAmericanOddsFromQuestion("Norway at +2500 — mispriced?"), ["+2500"]);
});

test("buildPriceBindingPromptBlock — no price in question", () => {
  const block = buildPriceBindingPromptBlock("Is Brazil mispriced?", ["BRA"], WC_INTENT.ENTITY_PRICING);
  assert.match(block, /did NOT cite/i);
  assert.match(block, /recycle/i);
});

test("detectUncitedAmericanOdds — bleeds prior turn price", () => {
  const flagged = detectUncitedAmericanOdds(
    "Brazil looks fair at +2500 given their group.",
    "Is Brazil mispriced?",
    WC_INTENT.ENTITY_PRICING,
  );
  assert.equal(flagged, true);
});

test("detectUncitedAmericanOdds — cited price ok", () => {
  const ok = detectUncitedAmericanOdds(
    "Norway at +2500 is fairly priced.",
    "Norway at +2500 — mispriced?",
    WC_INTENT.ENTITY_PRICING,
  );
  assert.equal(ok, false);
});
