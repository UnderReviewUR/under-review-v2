import assert from "node:assert/strict";
import test from "node:test";
import { classifyWcQuestionIntent, isWcGroupSlateQuestion, WC_INTENT } from "./wcUrTakeIntent.js";
import { buildWcSessionMemoryPrompt } from "./wcUrTakeSessionMemory.js";

test("isWcGroupSlateQuestion detects group-stage asks", () => {
  assert.equal(isWcGroupSlateQuestion("Best group stage bet?"), true);
  assert.equal(classifyWcQuestionIntent("Best group stage bet?"), WC_INTENT.STRUCTURAL);
});

test("buildWcSessionMemoryPrompt — no structural edge after Golden Boot pivot", () => {
  const history = [
    { role: "user", content: "Golden Boot value on Mbappé?" },
    {
      role: "assistant",
      content: "PASS — Mbappé +600",
      sport: "worldcup",
      structured: { call: "PASS — Mbappé +600", confidence: "Speculative" },
    },
  ];
  const prior = `PRIOR TAKES THIS SESSION (most recent last)
1. PASS — Mbappé +600 (Speculative)

SESSION STRUCTURAL EDGE (established earlier in this chat — maintain unless explicitly flipped)
- Structural play: Mbappé`;

  const mem = buildWcSessionMemoryPrompt(prior, history, "worldcup", {
    wcIntent: WC_INTENT.STRUCTURAL,
    requiredEntities: [],
    question: "Best group stage bet?",
  });

  assert.equal(mem.structuralEdgeInjected, false);
  assert.ok(!/SESSION STRUCTURAL EDGE/i.test(mem.summary));
  assert.ok(!/Mbapp/i.test(mem.summary));
});
