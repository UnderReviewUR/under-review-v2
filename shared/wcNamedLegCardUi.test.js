import test from "node:test";
import assert from "node:assert/strict";
import {
  isWcNamedLegPropsStructuredCard,
  isUrTakeLoadingPlaceholder,
  urTakeLoadingLabelForSport,
} from "./wcNamedLegCardUi.js";

test("isWcNamedLegPropsStructuredCard — playable count in call", () => {
  assert.equal(
    isWcNamedLegPropsStructuredCard({ call: "2 of 3 playable on named legs" }),
    true,
  );
  assert.equal(isWcNamedLegPropsStructuredCard({ call: "Ecuador vs Ivory Coast — top player props" }), false);
});

test("isWcNamedLegPropsStructuredCard — numbered lean with juice/skip", () => {
  const lean = [
    "1. Son Heung-min over 2.5 shots +105 — playable",
    "2. Jimenez over 2.5 shots -110 — playable",
    "3. Quinones over 2.5 shots -550 — juice, skip",
  ].join("\n");
  assert.equal(isWcNamedLegPropsStructuredCard({ lean }), true);
});

test("urTakeLoadingLabelForSport — world cup vs generic", () => {
  assert.equal(urTakeLoadingLabelForSport("worldcup"), "Pulling live lines…");
  assert.equal(urTakeLoadingLabelForSport("nba"), "Analyzing…");
});

test("isUrTakeLoadingPlaceholder — legacy and phase 3 copy", () => {
  assert.equal(isUrTakeLoadingPlaceholder("ANALYZING..."), true);
  assert.equal(isUrTakeLoadingPlaceholder("Pulling live lines…"), true);
  assert.equal(isUrTakeLoadingPlaceholder("Mexico +125 to win"), false);
});
