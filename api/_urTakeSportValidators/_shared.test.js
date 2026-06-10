import assert from "node:assert/strict";
import test from "node:test";
import {
  lintCrossSportOutput,
  sentenceHasOverconfidenceHype,
  sentenceNegatesOverconfidenceHype,
} from "./_shared.js";

test("sentenceNegatesOverconfidenceHype — not a lock", () => {
  assert.equal(sentenceNegatesOverconfidenceHype("Medium-confidence lean, not a lock."), true);
  assert.equal(sentenceNegatesOverconfidenceHype("This is the lock."), false);
});

test("sentenceHasOverconfidenceHype — lineup lock is not betting hype", () => {
  assert.equal(sentenceHasOverconfidenceHype("Watch for Spain lineup lock before kickoff."), false);
  assert.equal(sentenceHasOverconfidenceHype("Brunson over 25.5 is the lock."), true);
});

test("lintCrossSportOutput — allows not a lock with prop context", () => {
  const text =
    "Scoring prop: Jalen Brunson over 25.5 points — playoff pace ~26.4 PPG; medium-confidence lean, not a lock.";
  const { issues, criticalCodes } = (() => {
    const issues = lintCrossSportOutput(text);
    return {
      issues,
      criticalCodes: issues.filter((i) => i.requiresRegeneration).map((i) => i.code),
    };
  })();
  assert.equal(criticalCodes.includes("cross_sport_overconfidence"), false, issues.map((i) => i.code).join(", "));
});

test("lintCrossSportOutput — flags actual lock framing", () => {
  const text = "Scoring prop: Brunson over 25.5 points — this is the lock tonight.";
  const critical = lintCrossSportOutput(text).filter((i) => i.requiresRegeneration).map((i) => i.code);
  assert.ok(critical.includes("cross_sport_overconfidence"));
});
