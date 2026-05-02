import test from "node:test";
import assert from "node:assert/strict";

import { resolveSportHint } from "./ur-take.js";
import { lintF1WrongSportCrossContamination } from "./_urTakeSportValidators/f1.js";

test("Miami Grand Prix + generic tab resolves to F1 (not blocked by generic)", () => {
  const h = resolveSportHint({
    incomingSportHint: "generic",
    question: "For Miami Grand Prix on Sunday, what is the best race-only betting angle?",
    matchupContext: null,
    hasImage: false,
    golfContext: null,
  });
  assert.equal(h, "f1");
});

test("Explicit F1 tab is preserved when question also matches F1", () => {
  const h = resolveSportHint({
    incomingSportHint: "f1",
    question: "Miami Grand Prix race-only angles",
    matchupContext: null,
    hasImage: false,
    golfContext: null,
  });
  assert.equal(h, "f1");
});

test("F1 primary context path: sport hint must not stay generic for Grand Prix wording", () => {
  const h = resolveSportHint({
    incomingSportHint: "generic",
    question: "Best race-only bet for the Saudi Arabian Grand Prix?",
    matchupContext: null,
    hasImage: false,
    golfContext: null,
  });
  assert.equal(h, "f1");
});

test("Points finish + Grand Prix does not route to NBA via bare 'points'", () => {
  const h = resolveSportHint({
    incomingSportHint: "generic",
    question: "Points finish prop for Miami Grand Prix — who makes top 6?",
    matchupContext: null,
    hasImage: false,
    golfContext: null,
  });
  assert.equal(h, "f1");
});

/** Regression: “points” must not re-route to NBA when the market is F1 points finish. */
test("Best points finish bet for Miami GP resolves to F1 (not NBA)", () => {
  const h = resolveSportHint({
    incomingSportHint: "generic",
    question: "Best points finish bet for Miami GP?",
    matchupContext: null,
    hasImage: false,
    golfContext: null,
  });
  assert.equal(h, "f1");
});

test("F1 answer mentioning NBA playoffs triggers wrong_sport_context_payload", () => {
  const bad =
    "The context shows NBA playoff games like BOS-PHI — I cannot price F1 until you paste odds.";
  const issues = lintF1WrongSportCrossContamination(bad);
  assert.equal(issues.length, 1);
  assert.equal(issues[0].code, "wrong_sport_context_payload");
  assert.equal(issues[0].requiresRegeneration, true);
});

test("Clean F1 copy does not trigger cross-sport contamination", () => {
  const ok =
    "Podium lean using qualifying pace and tyre degradation at Miami — monitor pit windows for fastest lap volatility.";
  assert.equal(lintF1WrongSportCrossContamination(ok).length, 0);
});
