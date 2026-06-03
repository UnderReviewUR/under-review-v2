import assert from "node:assert/strict";
import test from "node:test";
import {
  buildPriceBindingPromptBlock,
  detectUncitedAmericanOdds,
  extractAmericanOddsFromQuestion,
  stripSessionBleedPrices,
  stripWcStructuredSessionPrices,
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

test("stripSessionBleedPrices — removes prior-turn +2500 on Brazil question", () => {
  const stripped = stripSessionBleedPrices(
    "Brazil at +2500 to win the World Cup is fairly valued, not mispriced.",
    "Is Brazil mispriced to win the tournament?",
    ["+2500"],
  );
  assert.doesNotMatch(stripped, /\+2500/);
  assert.match(stripped, /Brazil/i);
});

test("stripWcStructuredSessionPrices — structured fields", () => {
  const out = stripWcStructuredSessionPrices(
    { lean: "Brazil at +2500 is fair.", whyNow: "Still +2500 in copy." },
    "Is Brazil mispriced?",
    ["+2500"],
  );
  assert.doesNotMatch(out.lean, /\+2500/);
  assert.doesNotMatch(out.whyNow, /\+2500/);
});
