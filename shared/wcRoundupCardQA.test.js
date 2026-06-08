import assert from "node:assert/strict";
import test from "node:test";
import {
  detectWcDarkHorseWeakThesis,
  detectWcRoundupFairPriceContradiction,
  detectWcWatchForOrphanPronoun,
} from "./wcRoundupCardQA.js";

test("detectWcRoundupFairPriceContradiction — fair summary + Lean play", () => {
  const hit = detectWcRoundupFairPriceContradiction(
    "Spain and France are fairly priced at the top.",
    "Lean: Spain outright +450 — path edge.",
    "",
  );
  assert.ok(hit);
});

test("detectWcDarkHorseWeakThesis — low title % without structural case", () => {
  const hit = detectWcDarkHorseWeakThesis(
    "Dark horse: Colombia — 2.45% sims but 43.32% QF rate means they survive.",
  );
  assert.ok(hit);
});

test("detectWcWatchForOrphanPronoun — him without name", () => {
  const hit = detectWcWatchForOrphanPronoun(
    "Watch for injury or tactical shift that benches him.",
    [{ key: "breakout", value: "Breakout player: Lamine Yamal — creator." }],
  );
  assert.ok(hit);
});
