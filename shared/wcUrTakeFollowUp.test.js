import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { classifyWcQuestionIntent, isWcGroupSlateQuestion, isWcGroupStructureQuestion, WC_INTENT } from "./wcUrTakeIntent.js";
import { isWcCrossGroupMispriceQuestion } from "./wcTakeRetentionQA.js";
import { shouldUseWcCrossGroupValuePrebuilt } from "./wcGroupComposition.js";
import { runWcUrTakeQA } from "../api/_wcUrTakeQA.js";

const Q1 = "What's the best group-stage value bet right now — one pick, direct answer?";
const Q2 = "Who will win the Golden Glove at the 2026 World Cup?";

function contextualFollowUp(priorUser, followUp) {
  return `User: ${priorUser}\n\nFollow-up:\n${followUp}`;
}

describe("WC follow-up intent pivot", () => {
  it("classifies Golden Glove follow-up as GOLDEN_GLOVE, not STRUCTURAL", () => {
    const contextual = contextualFollowUp(Q1, Q2);
    assert.equal(classifyWcQuestionIntent(contextual), WC_INTENT.GOLDEN_GLOVE);
    assert.equal(classifyWcQuestionIntent(contextual, [{ role: "user" }, { role: "assistant" }]), WC_INTENT.GOLDEN_GLOVE);
  });

  it("does not treat contextual blob as group-slate for the latest turn", () => {
    const contextual = contextualFollowUp(Q1, Q2);
    assert.equal(isWcGroupSlateQuestion(contextual), false);
    assert.equal(isWcGroupStructureQuestion(contextual, WC_INTENT.GOLDEN_GLOVE), false);
    assert.equal(isWcCrossGroupMispriceQuestion(contextual), false);
    assert.equal(shouldUseWcCrossGroupValuePrebuilt(contextual, WC_INTENT.GOLDEN_GLOVE), false);
  });

  it("does not flag group math QA on Golden Glove answers after group-stage chat", () => {
    const contextual = contextualFollowUp(Q1, Q2);
    const qa = runWcUrTakeQA({
      responseText: "Lean: Emiliano Martínez at +450 — best listed goalkeeper price on the board.",
      structured: {
        call: "Martínez leads Golden Glove market",
        lean: "Lean: Emiliano Martínez at +450.",
        whyNow: "Argentina's shot-stopping profile and knockout path support the price.",
      },
      question: contextual,
      wcIntent: WC_INTENT.GOLDEN_GLOVE,
    });
    assert.equal(qa.issueCodes.includes("wc_group_math_mismatch"), false);
    assert.equal(qa.issueCodes.includes("wc_group_roster_mismatch"), false);
  });
});
