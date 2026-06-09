import assert from "node:assert/strict";
import test from "node:test";
import { formatWcRulesOnlyPromptBlock } from "./_wcUrTakeContext.js";
import {
  runWcUrTakeQA,
  wcQaRequiresRegeneration,
} from "./_wcUrTakeQA.js";
import { WC_RELEVANCE_REGRESSION_TURNS } from "./wcUrTakeRelevance.fixture.js";
import { mockWcContextWithPlayerMarkets } from "./wcPlayerMarkets.fixture.js";
import { buildWcPlayerMarketPrebuiltStructured } from "../shared/wcPlayerMarketResolve.js";
import {
  classifyWcQuestionIntent,
  shouldInjectStaticRules,
  WC_INTENT,
  WC_STATIC_RULES_BLOCK,
} from "../shared/wcUrTakeIntent.js";
import { resolveWcPlayerMarketResponse } from "../shared/wcUrTakePlayerMarket.js";
import {
  buildEntityBindingPromptBlock,
  resolveRequiredEntities,
  textMentionsWcTeam,
} from "../shared/wcUrTakeEntityBinding.js";
import { buildWcSessionMemoryPrompt } from "../shared/wcUrTakeSessionMemory.js";
import { buildWcConversationTransitionBlock } from "../shared/wcUrTakeConversation.js";
import { buildWcTurnScopeBlock } from "../shared/wcUrTakeIntent.js";
import {
  classifyWcVerdictForUi,
  getVerdictFollowUpChips,
  getVerdictNextLine,
} from "../shared/wcUrTakeVerdict.js";

test("WC regression fixture has eight turns with expected metadata", () => {
  assert.equal(WC_RELEVANCE_REGRESSION_TURNS.length, 8);
  assert.equal(WC_RELEVANCE_REGRESSION_TURNS[1].expectedEntities[0], "BRA");
  assert.equal(WC_RELEVANCE_REGRESSION_TURNS[3].expectedIntent, "RULES");
  assert.equal(WC_RELEVANCE_REGRESSION_TURNS[4].expectedIntent, "TOP_SCORER");
  assert.equal(WC_RELEVANCE_REGRESSION_TURNS[5].expectedIntent, "PLAYER_PROP");
});

test("classifyWcQuestionIntent — regression thread intents", () => {
  const history = [];
  for (const turn of WC_RELEVANCE_REGRESSION_TURNS) {
    const intent = classifyWcQuestionIntent(turn.question, history);
    assert.equal(
      intent,
      turn.expectedIntent,
      `intent mismatch for: ${turn.question}`,
    );
    history.push({ role: "user", content: turn.question });
    history.push({
      role: "assistant",
      content: "Lean: placeholder.",
      sport: "worldcup",
    });
  }
});

test("resolveRequiredEntities — regression thread entities", () => {
  const history = [];
  for (const turn of WC_RELEVANCE_REGRESSION_TURNS) {
    const intent = classifyWcQuestionIntent(turn.question, history);
    const entities = resolveRequiredEntities(turn.question, history, intent);
    assert.deepEqual(
      entities.sort(),
      turn.expectedEntities.sort(),
      `entities mismatch for: ${turn.question}`,
    );
    history.push({ role: "user", content: turn.question });
  }
});

test("shouldInjectStaticRules — knockout rules turn", () => {
  const q = WC_RELEVANCE_REGRESSION_TURNS[3].question;
  assert.equal(classifyWcQuestionIntent(q), WC_INTENT.RULES);
  assert.equal(shouldInjectStaticRules(q, WC_INTENT.RULES), true);
});

test("formatWcRulesOnlyPromptBlock includes static rules regardless of phase", () => {
  const block = formatWcRulesOnlyPromptBlock({
    tournament: "2026 FIFA World Cup",
    hosts: ["USA"],
    dateRange: "June 11 — July 19, 2026",
    phase: "GROUP_STAGE",
    staticRulesBlock: WC_STATIC_RULES_BLOCK,
  });
  assert.match(block, /extra time/i);
  assert.match(block, /penalty shootout/i);
  assert.doesNotMatch(block, /GROUPS \(12 × 4 teams\)/);
});

test("buildEntityBindingPromptBlock — Brazil binding", () => {
  const block = buildEntityBindingPromptBlock(["BRA"]);
  assert.match(block, /REQUIRED ENTITY/);
  assert.match(block, /Brazil/);
  assert.match(block, /do not substitute another team/i);
});

test("runWcUrTakeQA — Brazil question with Norway answer fails", () => {
  const qa = runWcUrTakeQA({
    responseText: "Norway in Group I offers the cleanest longshot advancement path.",
    structured: {
      lean: "Lean: Norway advancement is the angle.",
      whyNow: "Norway is a Contender in Group I.",
    },
    question: WC_RELEVANCE_REGRESSION_TURNS[1].question,
    wcIntent: WC_INTENT.ENTITY_PRICING,
    requiredEntities: ["BRA"],
    forbiddenEntities: ["NOR"],
  });
  assert.equal(qa.passed, false);
  assert.equal(qa.qaEntityMatch, "fail");
  assert.ok(wcQaRequiresRegeneration(qa));
});

test("runWcUrTakeQA — rules question with betting lead fails", () => {
  const qa = runWcUrTakeQA({
    responseText: "France advances from Group I over Norway.",
    structured: {
      lean: "Lean: France advances from Group I over Norway.",
      whyNow: "France is the group favorite.",
    },
    question: WC_RELEVANCE_REGRESSION_TURNS[3].question,
    wcIntent: WC_INTENT.RULES,
    requiredEntities: [],
    forbiddenEntities: ["NOR", "FRA"],
  });
  assert.equal(qa.passed, false);
  assert.equal(qa.qaIntentMatch, "fail");
});

test("runWcUrTakeQA — rules answer passes", () => {
  const qa = runWcUrTakeQA({
    responseText:
      "Knockout ties go to extra time, then penalties. Away goals do not apply in 2026.",
    structured: {
      lean: "Lean: ET then pens.",
      whyNow: "Regulation draw in knockout leads to extra time and penalty shootout.",
    },
    question: WC_RELEVANCE_REGRESSION_TURNS[3].question,
    wcIntent: WC_INTENT.RULES,
    requiredEntities: [],
    forbiddenEntities: [],
  });
  assert.equal(qa.passed, true);
  assert.equal(qa.qaIntentMatch, "pass");
});

test("runWcUrTakeQA — Brazil answer passes entity check", () => {
  const qa = runWcUrTakeQA({
    responseText: "Brazil is not mispriced given Group C strength.",
    structured: {
      call: "Brazil is not mispriced given Group C strength.",
      line: "Market BRA +450 · UR agrees at +480.",
      lean: "Pass — fair price, no edge on the Brazil outright.",
      whyNow: "Brazil is the Group C favorite with a clean knockout path.",
      edge: "Watch for Vinícius injury news before the opener.",
      callType: "analysis",
    },
    question: WC_RELEVANCE_REGRESSION_TURNS[1].question,
    wcIntent: WC_INTENT.ENTITY_PRICING,
    requiredEntities: ["BRA"],
    forbiddenEntities: ["NOR"],
  });
  assert.equal(qa.passed, true);
  assert.equal(qa.qaEntityMatch, "pass");
});

test("runWcUrTakeQA — Brazil answer with Norway +2500 bleed fails", () => {
  const qa = runWcUrTakeQA({
    responseText: "Brazil at +2500 is not mispriced.",
    structured: {
      lean: "Lean: Brazil fairly priced at +2500.",
      whyNow: "Recycled Norway price.",
    },
    question: WC_RELEVANCE_REGRESSION_TURNS[1].question,
    wcIntent: WC_INTENT.ENTITY_PRICING,
    requiredEntities: ["BRA"],
    forbiddenEntities: ["NOR"],
  });
  assert.equal(qa.passed, false);
  assert.ok(qa.issueCodes.includes("wc_price_uncited_citation"));
  assert.equal(wcQaRequiresRegeneration(qa), true);
});

test("runWcUrTakeQA — rules answer with prior thread bleed fails", () => {
  const qa = runWcUrTakeQA({
    responseText:
      "You asked about Norway vs France advancement. Extra time is two 15-minute periods, then penalties.",
    structured: {
      lean: "Lean: Knockout rules apply after regulation.",
      whyNow: "You asked about Norway vs France advancement.",
    },
    question: WC_RELEVANCE_REGRESSION_TURNS[3].question,
    wcIntent: WC_INTENT.RULES,
    requiredEntities: [],
    forbiddenEntities: ["NOR", "FRA", "BRA"],
  });
  assert.equal(qa.passed, false);
  assert.ok(qa.issueCodes.includes("wc_rules_thread_bleed"));
  assert.equal(wcQaRequiresRegeneration(qa), true);
});

test("buildWcSessionMemoryPrompt — RULES intent skips prior takes", () => {
  const history = [
    { role: "user", content: "Norway at +2500 — mispriced?" },
    {
      role: "assistant",
      content: "Lean: Norway value.",
      structured: { call: "NOR advancement", confidence: "Medium" },
      sport: "worldcup",
    },
  ];
  const mem = buildWcSessionMemoryPrompt("PRIOR TAKES THIS SESSION\n1. NOR", history, "worldcup", {
    wcIntent: WC_INTENT.RULES,
    requiredEntities: [],
    question: WC_RELEVANCE_REGRESSION_TURNS[3].question,
  });
  assert.equal(mem.summary, "");
  assert.equal(mem.structuralEdgeInjected, false);
});

test("buildWcSessionMemoryPrompt — entity change suppresses structural edge", () => {
  const history = [
    { role: "user", content: "Norway at +2500 — mispriced?" },
    {
      role: "assistant",
      content: "Lean: Norway value.",
      structured: { call: "NOR +2500", confidence: "Medium" },
      sport: "worldcup",
    },
  ];
  const mem = buildWcSessionMemoryPrompt("PRIOR TAKES THIS SESSION\n1. NOR", history, "worldcup", {
    wcIntent: WC_INTENT.ENTITY_PRICING,
    requiredEntities: ["BRA"],
    question: WC_RELEVANCE_REGRESSION_TURNS[1].question,
  });
  assert.equal(mem.structuralEdgeInjected, false);
});

test("verdict-aware chips — fair price avoids edge killer", () => {
  const message = {
    sport: "worldcup",
    structured: {
      lean: "Lean: Norway at +2500 is not mispriced — fairly priced.",
      whyNow: "No edge at this price.",
    },
  };
  assert.equal(classifyWcVerdictForUi(message), "FAIR_PRICE");
  const chips = getVerdictFollowUpChips(classifyWcVerdictForUi(message));
  assert.ok(!chips.some((c) => /kills this edge/i.test(c)));
  assert.match(getVerdictNextLine("FAIR_PRICE"), /what would need to change/i);
});

test("player regression turns — market tier with KV (no default pass)", () => {
  for (const turn of WC_RELEVANCE_REGRESSION_TURNS.filter((t) => t.expectPlayerNames)) {
    const intent = classifyWcQuestionIntent(turn.question);
    assert.equal(intent, turn.expectedIntent, turn.question);
    const ctx = mockWcContextWithPlayerMarkets({
      wcIntent: intent,
      wcEventId: turn.wcEventId || null,
    });
    const resolved = resolveWcPlayerMarketResponse(turn.question, intent, ctx);
    assert.equal(resolved.forcePass, false, turn.question);
    assert.equal(resolved.playerMarketTier, turn.expectPlayerMarketTier, turn.question);
    assert.ok(resolved.promptAppendix?.includes("PLAYER MARKETS"), turn.question);
    if (turn.expectMatchPlayerProps) {
      assert.ok(resolved.promptAppendix?.includes("MATCH PLAYER PROPS"), turn.question);
    }
    const prebuilt = buildWcPlayerMarketPrebuiltStructured(
      turn.question,
      intent,
      resolved.playerMarketTier,
      ctx.playerMarketKv.goldenBoot,
      {
        matchPlayerProps: ctx.playerMarketKv.matchPlayerProps,
        wcEventId: ctx.wcEventId,
      },
    );
    assert.ok(prebuilt, turn.question);
    const qa = runWcUrTakeQA({
      responseText: `${prebuilt.lean}\n\n${prebuilt.whyNow}`,
      structured: prebuilt,
      question: turn.question,
      wcIntent: intent,
      playerMarketKv: ctx.playerMarketKv,
      playerMarketTier: resolved.playerMarketTier,
    });
    assert.equal(qa.qaPlayerMatch, "pass", turn.question);
    assert.equal(qa.passed, true, turn.question);
  }
});

test("runWcUrTakeQA — player turns reject France-as-scorer headline", () => {
  for (const turn of WC_RELEVANCE_REGRESSION_TURNS.filter((t) => t.expectPlayerNames)) {
    const intent = classifyWcQuestionIntent(turn.question);
    const qa = runWcUrTakeQA({
      responseText: "France will score the most goals in the tournament.",
      structured: {
        lean: "Lean: France will score the most goals in the tournament.",
        whyNow: "France is the structural favorite.",
      },
      question: turn.question,
      wcIntent: intent,
      requiredEntities: [],
      forbiddenEntities: [],
    });
    assert.equal(qa.passed, false, turn.question);
    assert.ok(qa.issueCodes.includes("wc_player_question_team_lead"), turn.question);
  }
});

test("matchup → tournament winner thread pivots intent and scope", () => {
  const history = [
    {
      role: "user",
      content: "South Africa or Mexico — Who will win Game 1?",
    },
    {
      role: "assistant",
      content: "Lean: Mexico -240 — home favorite at altitude.",
      sport: "worldcup",
    },
  ];
  const question = "who wins the world cup?";
  const intent = classifyWcQuestionIntent(question, history);
  assert.equal(intent, WC_INTENT.ENTITY_PRICING);
  assert.deepEqual(resolveRequiredEntities(question, history, intent), []);

  const transition = buildWcConversationTransitionBlock(question, history, intent);
  assert.match(transition, /tournament winner outright/i);
  assert.match(transition, /Game 1/i);

  const scope = buildWcTurnScopeBlock(question, intent);
  assert.match(scope, /TOURNAMENT outright/i);

  const memory = buildWcSessionMemoryPrompt(
    "PRIOR TAKES THIS SESSION\n1. Lean: Mexico -240 — Game 1 favorite.",
    history,
    "worldcup",
    { question, wcIntent: intent, requiredEntities: [] },
  );
  assert.equal(memory.structuralEdgeInjected, false);
});

test("instrumentation shape — Brazil question log fields", () => {
  const question = WC_RELEVANCE_REGRESSION_TURNS[1].question;
  const wcIntent = classifyWcQuestionIntent(question);
  const requiredEntities = resolveRequiredEntities(question, [], wcIntent);
  const logLine = {
    event: "ur_take_complete",
    sport: "worldcup",
    wcRelevance: {
      wcIntent,
      mentionedTeams: ["BRA"],
      requiredEntities,
      knockoutRulesInjected: shouldInjectStaticRules(question, wcIntent),
      structuralEdgeInjected: false,
      playerPropDetected: false,
      qaEntityMatch: null,
      qaIntentMatch: null,
      qaPlayerMatch: null,
    },
  };
  assert.equal(logLine.wcRelevance.wcIntent, "ENTITY_PRICING");
  assert.deepEqual(logLine.wcRelevance.requiredEntities, ["BRA"]);
  assert.equal(logLine.wcRelevance.qaEntityMatch, null);
});
