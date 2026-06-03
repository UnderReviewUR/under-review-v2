import assert from "node:assert/strict";
import test from "node:test";
import {
  detectRulesThreadBleed,
  stripRulesThreadBleed,
} from "./wcUrTakeRules.js";
import { classifyWcVerdictForUi } from "./wcUrTakeVerdict.js";

test("detectRulesThreadBleed — you asked about prior matchup", () => {
  const flagged = detectRulesThreadBleed(
    "You asked about Norway vs France advancement. Knockout rules use ET then pens.",
    "What are the knockout rules for extra time and penalties?",
    ["NOR", "FRA"],
  );
  assert.equal(flagged, true);
});

test("stripRulesThreadBleed — removes you asked about bridge", () => {
  const cleaned = stripRulesThreadBleed(
    "You asked about Norway vs France advancement. Extra time is two 15-minute periods.",
    ["NOR", "FRA"],
  );
  assert.match(cleaned, /Extra time/i);
  assert.doesNotMatch(cleaned, /You asked about/i);
  assert.doesNotMatch(cleaned, /Norway vs France/i);
});

test("classifyWcVerdictForUi — rules question wins over bleed body", () => {
  const verdict = classifyWcVerdictForUi(
    {
      sport: "worldcup",
      structured: {
        callType: "single",
        lean: "Lean: Extra time then penalties.",
        whyNow: "You asked about Norway vs France advancement.",
      },
    },
    "What are the knockout rules for extra time and penalties?",
  );
  assert.equal(verdict, "RULES_FACTUAL");
});
