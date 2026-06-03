import assert from "node:assert/strict";
import test from "node:test";
import {
  classifyWcVerdictForUi,
  getVerdictFollowUpChips,
  getVerdictNextLine,
} from "./wcUrTakeVerdict.js";

test("classifyWcVerdictForUi — HAS_EDGE", () => {
  const verdict = classifyWcVerdictForUi({
    sport: "worldcup",
    wcIntent: "ENTITY_PRICING",
    structured: { lean: "Lean: Norway mispriced at +2500.", edge: "Market edge here." },
  });
  assert.equal(verdict, "HAS_EDGE");
});

test("classifyWcVerdictForUi — FAIR_PRICE via wcIntent", () => {
  const verdict = classifyWcVerdictForUi({
    sport: "worldcup",
    wcIntent: "ENTITY_PRICING",
    structured: {
      lean: "Lean: Not mispriced — fairly priced.",
      whyNow: "Longshot value is thin but no edge.",
    },
  });
  assert.equal(verdict, "FAIR_PRICE");
});

test("classifyWcVerdictForUi — RULES_FACTUAL via wcIntent", () => {
  const verdict = classifyWcVerdictForUi({
    sport: "worldcup",
    wcIntent: "RULES",
    structured: { callType: "rules", lean: "Extra time then penalties if still tied." },
  });
  assert.equal(verdict, "RULES_FACTUAL");
});

test("classifyWcVerdictForUi — MATCHUP via wcIntent", () => {
  const verdict = classifyWcVerdictForUi({
    sport: "worldcup",
    wcIntent: "MATCHUP",
    structured: { callType: "matchup", lean: "Norway and France both have paths." },
  });
  assert.equal(verdict, "MATCHUP");
});

test("classifyWcVerdictForUi — FAIR_PRICE", () => {
  const verdict = classifyWcVerdictForUi({
    sport: "worldcup",
    structured: { lean: "Lean: Not mispriced — fairly priced.", whyNow: "No edge." },
  });
  assert.equal(verdict, "FAIR_PRICE");
});

test("getVerdictFollowUpChips — RULES_FACTUAL", () => {
  const chips = getVerdictFollowUpChips("RULES_FACTUAL");
  assert.ok(chips.some((c) => /betting/i.test(c)));
  assert.ok(!chips.some((c) => /kills this edge/i.test(c)));
});

test("getVerdictNextLine — differs by verdict", () => {
  assert.notEqual(getVerdictNextLine("HAS_EDGE"), getVerdictNextLine("FAIR_PRICE"));
  assert.match(getVerdictNextLine("RULES_FACTUAL"), /knockout bet/i);
});
