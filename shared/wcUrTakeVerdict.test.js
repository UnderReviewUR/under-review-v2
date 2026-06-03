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
    structured: { lean: "Lean: Norway mispriced at +2500.", edge: "Market edge here." },
  });
  assert.equal(verdict, "HAS_EDGE");
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
