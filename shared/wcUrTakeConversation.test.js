import assert from "node:assert/strict";
import test from "node:test";
import {
  classifyWcQuestionIntent,
  isWcTopGoalscorersListQuestion,
  WC_INTENT,
} from "./wcUrTakeIntent.js";
import {
  buildWcConversationTransitionBlock,
  filterPriorTakesOnWcConversationPivot,
  wcConversationPivotMeta,
} from "./wcUrTakeConversation.js";
import { buildWcSessionMemoryPrompt } from "./wcUrTakeSessionMemory.js";

test("isWcTopGoalscorersListQuestion — goalscores and goalscorers", () => {
  assert.equal(isWcTopGoalscorersListQuestion("predict the top 5 goalscorers"), true);
  assert.equal(isWcTopGoalscorersListQuestion("predict the top 5 goalscores"), true);
  assert.equal(isWcTopGoalscorersListQuestion("who will score the most goals"), false);
});

test("classifyWcQuestionIntent — top 5 goalscorers after top scorer thread", () => {
  const history = [
    { role: "user", content: "who will score the most goals in the world cup" },
    {
      role: "assistant",
      content: "Mbappé +600",
      structured: { call: "Mbappé +600", confidence: "Medium" },
    },
  ];
  assert.equal(
    classifyWcQuestionIntent("predict the top 5 goalscorers", history),
    WC_INTENT.TOP_GOALSCORERS_LIST,
  );
});

test("wcConversationPivotMeta — single scorer to list", () => {
  const history = [
    { role: "user", content: "who will score the most goals" },
    { role: "assistant", content: "Mbappé +600" },
  ];
  const pivot = wcConversationPivotMeta("predict the top 5 goalscorers", history);
  assert.equal(pivot.pivoted, true);
  assert.equal(pivot.priorIntent, WC_INTENT.TOP_SCORER);
  assert.equal(pivot.currentIntent, WC_INTENT.TOP_GOALSCORERS_LIST);
});

test("filterPriorTakesOnWcConversationPivot — strips prior Mbappé lean on list pivot", () => {
  const prior = `PRIOR TAKES THIS SESSION (most recent last)
1. Mbappé +600 (Medium)

When the current question relates to any of these — same player, same team,
same game, same market, or a correlated bet — reference the prior take
explicitly.`;
  const history = [
    { role: "user", content: "who will score the most goals" },
    { role: "assistant", content: "Mbappé +600", structured: { call: "Mbappé +600" } },
  ];
  const filtered = filterPriorTakesOnWcConversationPivot(
    prior,
    "predict the top 5 goalscorers",
    history,
    WC_INTENT.TOP_GOALSCORERS_LIST,
  );
  assert.ok(!/Mbapp/i.test(filtered));
  assert.ok(/PRIOR TAKES THIS SESSION/i.test(filtered));
});

test("buildWcConversationTransitionBlock — injects list guidance", () => {
  const history = [
    { role: "user", content: "who will score the most goals" },
    { role: "assistant", content: "Mbappé +600" },
  ];
  const block = buildWcConversationTransitionBlock(
    "predict the top 5 goalscorers",
    history,
    WC_INTENT.TOP_GOALSCORERS_LIST,
  );
  assert.ok(/CONVERSATION PIVOT/i.test(block));
  assert.ok(/ranked list/i.test(block));
});

test("buildWcSessionMemoryPrompt — pivot from top scorer to goalscorers list", () => {
  const history = [
    { role: "user", content: "who will score the most goals" },
    {
      role: "assistant",
      content: "Mbappé +600",
      structured: { call: "Mbappé +600", confidence: "Medium" },
    },
  ];
  const prior = `PRIOR TAKES THIS SESSION (most recent last)
1. Mbappé +600 (Medium)

SESSION STRUCTURAL EDGE (established earlier in this chat — maintain unless explicitly flipped)
- Structural play: Mbappé`;

  const mem = buildWcSessionMemoryPrompt(prior, history, "worldcup", {
    wcIntent: WC_INTENT.TOP_GOALSCORERS_LIST,
    requiredEntities: [],
    question: "predict the top 5 goalscorers",
  });

  assert.equal(mem.structuralEdgeInjected, false);
  assert.ok(!/Mbapp/i.test(mem.summary));
  assert.ok(/CONVERSATION PIVOT/i.test(mem.conversationTransitionBlock));
});
