import assert from "node:assert/strict";
import test from "node:test";
import { classifyNbaQuestionIntent, NBA_INTENT } from "./nbaUrTakeIntent.js";
import { classifyGenericUrTakeIntent, GENERIC_INTENT } from "./urTakeIntentGeneric.js";
import {
  buildConversationTransitionBlock,
  buildUrTakeSessionMemoryPrompt,
  filterPriorTakesOnConversationPivot,
  urTakeConversationPivotMeta,
} from "./urTakeConversation.js";

test("classifyGenericUrTakeIntent — open golf question is GENERAL", () => {
  assert.equal(
    classifyGenericUrTakeIntent("What's the weather outlook for Sunday at Harbour Town?"),
    GENERIC_INTENT.GENERAL,
  );
});

test("urTakeConversationPivotMeta — NBA series to prop pivot", () => {
  const history = [
    { role: "user", content: "Who wins the Finals series?" },
    { role: "assistant", content: "Lean: Knicks +180", structured: { call: "NYK +180" } },
  ];
  const pivot = urTakeConversationPivotMeta(
    "nba",
    "Brunson over 28.5 points tonight?",
    history,
    NBA_INTENT.PROP_PLAYER,
  );
  assert.equal(pivot.pivoted, true);
  assert.equal(pivot.priorIntent, NBA_INTENT.SERIES_WINNER);
  assert.equal(pivot.currentIntent, NBA_INTENT.PROP_PLAYER);
});

test("filterPriorTakesOnConversationPivot — strips prior lean on NBA pivot", () => {
  const prior = `PRIOR TAKES THIS SESSION (most recent last)
1. NYK +180 (Medium)

When the current question relates to any of these — same player, same team,
same game, same market, or a correlated bet — reference the prior take
explicitly.`;
  const history = [
    { role: "user", content: "Who wins the Finals series?" },
    { role: "assistant", content: "NYK +180", structured: { call: "NYK +180" } },
  ];
  const filtered = filterPriorTakesOnConversationPivot(
    prior,
    "nba",
    "Brunson over 28.5 points tonight?",
    history,
    NBA_INTENT.PROP_PLAYER,
  );
  assert.ok(!/NYK \+180/.test(filtered));
  assert.match(filtered, /optional context/i);
});

test("buildConversationTransitionBlock — NBA prop after series", () => {
  const history = [
    { role: "user", content: "Who wins the Finals series?" },
    { role: "assistant", content: "NYK +180" },
  ];
  const block = buildConversationTransitionBlock(
    "nba",
    "Brunson over 28.5 points tonight?",
    history,
    NBA_INTENT.PROP_PLAYER,
  );
  assert.match(block, /CONVERSATION PIVOT/i);
  assert.match(block, /player-prop/i);
});

test("buildUrTakeSessionMemoryPrompt — golf pivot suppresses structural edge", () => {
  const history = [
    { role: "user", content: "Is Rahm value at +1200?" },
    {
      role: "assistant",
      content: "Lean: Rahm",
      sport: "golf",
      structured: {
        call: "Rahm +1200",
        confidence: "Medium",
        edge: "Structural edge at these prices.",
      },
    },
  ];
  const prior = `PRIOR TAKES THIS SESSION (most recent last)
1. Rahm +1200 (Medium)`;
  const followUp = "Who is on the leaderboard right now?";
  const mem = buildUrTakeSessionMemoryPrompt(prior, history, "golf", {
    question: followUp,
    intent: classifyGenericUrTakeIntent(followUp, history),
  });
  assert.equal(mem.structuralEdgeInjected, false);
  assert.match(mem.conversationTransitionBlock, /CONVERSATION PIVOT/i);
});

test("buildUrTakeSessionMemoryPrompt — NBA session memory on prop pivot", () => {
  const history = [
    { role: "user", content: "Who wins the Finals series?" },
    {
      role: "assistant",
      content: "NYK +180",
      sport: "nba",
      structured: { call: "NYK +180", confidence: "Medium" },
    },
  ];
  const prior = `PRIOR TAKES THIS SESSION (most recent last)
1. NYK +180 (Medium)`;
  const mem = buildUrTakeSessionMemoryPrompt(prior, history, "nba", {
    question: "Brunson over 28.5 points tonight?",
    intent: NBA_INTENT.PROP_PLAYER,
  });
  assert.ok(!/NYK \+180/.test(mem.summary));
  assert.match(mem.conversationTransitionBlock, /CONVERSATION PIVOT/i);
});
