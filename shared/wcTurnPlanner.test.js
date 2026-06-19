import assert from "node:assert/strict";
import test from "node:test";
import {
  WC_TURN_LANE,
  WC_DATA_PACKAGE,
  isWcTurnPlannerEnabled,
  isWcConditionalMatchupFollowUp,
  resolveWcTurnIntent,
  resolveWcTurnUseLiteContext,
  resolveWcTurnPlan,
  assertWcTurnPlanFastPathConsistency,
  extractWcPriorThreadLeanFromHistory,
} from "./wcTurnPlanner.js";
import {
  buildWcStructuredForPlan,
  shouldActivateWcPrebuiltLane,
  shouldActivateWcPropsFastPath,
  buildWcThreadAwarePassFallback,
  buildWcThreadAwareNoPropsFallback,
  buildWcGenericPropsFollowUpPromptBlock,
  applyWcLlmThreadPriorLeanToContext,
  applyWcLlmThreadPriorLeanToGroundingPacket,
  buildWcPriorLeanPromptBlock,
  WC_TURN_PASS_KIND,
} from "./wcTurnDelivery.js";
import { shouldRunWcPlayerPropsFastPath } from "../api/ur-take/wcPlayerPropsFastPath.js";
import { WC_INTENT } from "./wcUrTakeIntent.js";

const USA_AUS_MATCHES = [
  {
    id: "991",
    homeTeam: "USA",
    awayTeam: "AUS",
    status: "live",
    homeScore: 0,
    awayScore: 0,
    minute: "32",
    odds: {
      home: { moneyline: "+110" },
      away: { moneyline: "+285" },
      draw: { moneyline: "+240" },
      totalLine: "2.5",
      totalOver: { moneyline: "-105" },
      totalUnder: { moneyline: "-115" },
    },
  },
];

const USA_AUS_LIVE_PRIOR = {
  role: "assistant",
  structured: {
    sport: "worldcup",
    callType: "matchup",
    fixtureHome: "USA",
    fixtureAway: "AUS",
    wcEventId: "991",
    call: "United States +110 to win · Lean Under 2.5 goals",
    lean: "2 live leans at 0-0: United States +110 + Under 2.5 goals",
    whyNow: "USA controlling early volume.",
    confidence: "Medium",
  },
  wcEventId: "991",
  wcMatchTeams: { home: "USA", away: "AUS" },
};

test("isWcTurnPlannerEnabled — env and header overrides", () => {
  const prev = process.env.WC_TURN_PLANNER;
  delete process.env.WC_TURN_PLANNER;
  try {
    assert.equal(isWcTurnPlannerEnabled({}), false);
    assert.equal(isWcTurnPlannerEnabled({ plannerHeader: "1" }), true);
    assert.equal(isWcTurnPlannerEnabled({ plannerHeader: "0" }), false);
    process.env.WC_TURN_PLANNER = "1";
    assert.equal(isWcTurnPlannerEnabled({}), true);
  } finally {
    if (prev === undefined) delete process.env.WC_TURN_PLANNER;
    else process.env.WC_TURN_PLANNER = prev;
  }
});

test("resolveWcTurnPlan — live angle opening turn routes to live_in_play", () => {
  const plan = resolveWcTurnPlan({
    question: "Best live angle on USA vs AUS right now?",
    history: [],
    matches: USA_AUS_MATCHES,
    incomingWcEventId: "991",
    hasKvFixture: true,
  });
  assert.equal(plan.lane, WC_TURN_LANE.LIVE_IN_PLAY);
  assert.equal(plan.intent, WC_INTENT.MATCHUP);
  assert.equal(plan.pinnedEventId, "991");
  assert.equal(plan.pinnedHome, "USA");
  assert.equal(plan.pinnedAway, "AUS");
  assert.equal(plan.shouldUseFastPath, true);
  assert.equal(plan.useLiteContext, false);
  assert.ok(plan.dataPackages.includes(WC_DATA_PACKAGE.LIVE_INTEL));
  assert.ok(plan.dataPackages.includes(WC_DATA_PACKAGE.PLAYER_PROPS_KV));
});

test("buildWcStructuredForPlan — live angle delivers actionable live leans card", async () => {
  const plan = resolveWcTurnPlan({
    question: "Best live angle on USA vs AUS right now?",
    history: [],
    matches: USA_AUS_MATCHES,
    incomingWcEventId: "991",
    hasKvFixture: true,
  });
  const built = await buildWcStructuredForPlan(plan, {
    question: "Best live angle on USA vs AUS right now?",
    matches: USA_AUS_MATCHES,
  });
  assert.ok(built);
  assert.equal(built.passKind, WC_TURN_PASS_KIND.LIVE_IN_PLAY);
  assert.equal(built.structured.callType, "matchup");
  assert.match(String(built.structured.lean || ""), /live lean/i);
  assert.equal(built.structured.fixtureHome, "USA");
  assert.equal(built.structured.fixtureAway, "AUS");
});

test("resolveWcTurnPlan — other side conditional follow-up after live lean", () => {
  const history = [
    { role: "user", content: "Best live angle on USA vs AUS right now?" },
    USA_AUS_LIVE_PRIOR,
  ];
  const plan = resolveWcTurnPlan({
    question: "What's the other side if United States scores early?",
    history,
    matches: USA_AUS_MATCHES,
    incomingWcEventId: "991",
    isConversationFollowUp: true,
    hasKvFixture: true,
  });
  assert.equal(plan.lane, WC_TURN_LANE.MATCHUP_ALT_FOLLOWUP);
  assert.equal(plan.intent, WC_INTENT.MATCHUP);
  assert.equal(plan.pinnedEventId, "991");
  assert.ok(plan.priorLean);
  assert.equal(plan.useLiteContext, false);
  assert.equal(plan.shouldUseFastPath, true);
  assert.ok(plan.dataPackages.includes(WC_DATA_PACKAGE.PRIOR_STRUCTURED));
  assert.match(plan.reason, /conditional|alt/i);
});

test("buildWcStructuredForPlan — other side follow-up delivers alt-market card not PASS", async () => {
  const history = [
    { role: "user", content: "Best live angle on USA vs AUS right now?" },
    USA_AUS_LIVE_PRIOR,
  ];
  const plan = resolveWcTurnPlan({
    question: "What's the other side if United States scores early?",
    history,
    matches: USA_AUS_MATCHES,
    incomingWcEventId: "991",
    isConversationFollowUp: true,
    hasKvFixture: true,
  });
  const built = await buildWcStructuredForPlan(plan, {
    question: "What's the other side if United States scores early?",
    history,
    matches: USA_AUS_MATCHES,
  });
  assert.ok(built);
  assert.equal(built.passKind, WC_TURN_PASS_KIND.FIXTURE_ALT_FOLLOWUP);
  assert.equal(built.structured.callType, "matchup");
  const lean = String(built.structured.lean || "");
  assert.match(lean, /Australia|AUS|Under|Over/i);
  assert.doesNotMatch(lean, /^Pass on ML — Pass/i);
});

test("resolveWcTurnIntent — other side follow-up maps to MATCHUP not CONTINUATION", () => {
  const history = [
    { role: "user", content: "Best live angle on USA vs AUS?" },
    USA_AUS_LIVE_PRIOR,
  ];
  const intent = resolveWcTurnIntent(
    "What's the other side if United States scores early?",
    history,
    true,
    USA_AUS_LIVE_PRIOR.structured,
  );
  assert.equal(intent, WC_INTENT.MATCHUP);
});

test("resolveWcTurnUseLiteContext — disabled when prior structured lean exists", () => {
  assert.equal(
    resolveWcTurnUseLiteContext({
      lane: WC_TURN_LANE.LLM_LITE,
      intent: WC_INTENT.CONTINUATION,
      isFollowUp: true,
      priorLean: USA_AUS_LIVE_PRIOR.structured,
      pinnedEventId: "991",
    }),
    false,
  );
});

test("resolveWcTurnUseLiteContext — enabled for vague continuation without prior lean", () => {
  assert.equal(
    resolveWcTurnUseLiteContext({
      lane: WC_TURN_LANE.LLM_LITE,
      intent: WC_INTENT.CONTINUATION,
      isFollowUp: true,
      priorLean: null,
      pinnedEventId: null,
    }),
    true,
  );
});

test("resolveWcTurnPlan — who wins opening turn routes to matchup_prebuilt when eligible", () => {
  const plan = resolveWcTurnPlan({
    question: "Who wins USA vs AUS?",
    history: [],
    matches: USA_AUS_MATCHES,
    incomingWcEventId: "991",
    hasKvFixture: true,
  });
  assert.equal(plan.intent, WC_INTENT.MATCHUP);
  assert.ok(
    plan.lane === WC_TURN_LANE.MATCHUP_PREBUILT ||
      plan.lane === WC_TURN_LANE.LIVE_MATCH_WINNER,
  );
  assert.equal(plan.useLiteContext, false);
});

test("resolveWcTurnPlan — mispriced fixture question uses LLM full with pricing packages", () => {
  const plan = resolveWcTurnPlan({
    question: "What's mispriced on USA vs AUS?",
    history: [],
    matches: USA_AUS_MATCHES,
    incomingWcEventId: "991",
    hasKvFixture: true,
  });
  assert.equal(plan.intent, WC_INTENT.ENTITY_PRICING);
  assert.equal(plan.lane, WC_TURN_LANE.LLM_FULL);
  assert.equal(plan.shouldUseFastPath, false);
  assert.ok(plan.dataPackages.includes(WC_DATA_PACKAGE.GROUP_MISPRICE));
  assert.ok(plan.dataPackages.includes(WC_DATA_PACKAGE.TOURNAMENT_SIM));
});

test("buildWcStructuredForPlan — misprice on live fixture does not deliver live prebuilt", async () => {
  const plan = resolveWcTurnPlan({
    question: "What's mispriced on USA vs AUS?",
    history: [],
    matches: USA_AUS_MATCHES,
    incomingWcEventId: "991",
    hasKvFixture: true,
  });
  const built = await buildWcStructuredForPlan(plan, {
    question: "What's mispriced on USA vs AUS?",
    matches: USA_AUS_MATCHES,
  });
  assert.equal(built, null);
  assert.equal(
    shouldActivateWcPrebuiltLane(true, plan, WC_TURN_LANE.LIVE_IN_PLAY, () => true),
    false,
  );
});

test("resolveWcTurnPlan — player prop follow-up after matchup routes to player props lane", () => {
  const matchupPrior = {
    role: "assistant",
    structured: {
      callType: "matchup",
      fixtureHome: "USA",
      fixtureAway: "AUS",
      wcEventId: "991",
      lean: "United States +110 to win",
      call: "United States +110 to win",
    },
    wcEventId: "991",
  };
  const plan = resolveWcTurnPlan({
    question: "Best player props for USA vs AUS?",
    history: [{ role: "user", content: "Who wins USA vs AUS?" }, matchupPrior],
    matches: USA_AUS_MATCHES,
    incomingWcEventId: "991",
    isConversationFollowUp: true,
    hasKvFixture: true,
  });
  assert.equal(plan.intent, WC_INTENT.PLAYER_PROP);
  assert.ok(
    plan.lane === WC_TURN_LANE.PROPS_FAST || plan.lane === WC_TURN_LANE.PROPS_CLAUDE,
  );
  assert.equal(
    shouldActivateWcPrebuiltLane(true, plan, WC_TURN_LANE.MATCHUP_PREBUILT, () => true),
    false,
  );
  if (plan.lane === WC_TURN_LANE.PROPS_FAST) {
    assert.equal(plan.shouldUseFastPath, true);
    assert.equal(shouldActivateWcPropsFastPath(true, plan, () => false), true);
  }
});

test("resolveWcTurnPlan — generic props ask after live prebuilt routes to llm_thread not props_fast", () => {
  const scoMarLivePrior = {
    role: "assistant",
    structured: {
      sport: "worldcup",
      callType: "matchup",
      fixtureHome: "SCO",
      fixtureAway: "MAR",
      wcEventId: "1001",
      call: "Lean Under 3.5 goals",
      lean: "Lean Under 3.5 goals",
      whyNow: "Morocco leads 1-0 live; Scotland needs a goal to flip the script.",
      confidence: "Medium",
    },
    wcEventId: "1001",
  };
  const scoMarMatches = [
    {
      id: "1001",
      homeTeam: "SCO",
      awayTeam: "MAR",
      status: "live",
      homeScore: 0,
      awayScore: 1,
    },
  ];
  for (const question of [
    "any player props to consider?",
    "player props?",
    "any bets on players?",
    "props for this match?",
  ]) {
    const plan = resolveWcTurnPlan({
      question,
      history: [
        { role: "user", content: "Best live angle on SCO vs MAR right now?" },
        scoMarLivePrior,
      ],
      matches: scoMarMatches,
      incomingWcEventId: "1001",
      isConversationFollowUp: true,
      hasKvFixture: true,
    });
    assert.equal(plan.lane, WC_TURN_LANE.LLM_THREAD, question);
    assert.equal(plan.reason, "generic_props_followup_after_prebuilt", question);
    assert.equal(plan.intent, WC_INTENT.MATCHUP, question);
    assert.equal(plan.useLiteContext, false, question);
    assert.equal(plan.shouldUseFastPath, false, question);
    assert.equal(shouldActivateWcPropsFastPath(true, plan, () => true), false, question);
    assert.equal(
      shouldActivateWcPrebuiltLane(true, plan, WC_TURN_LANE.PROPS_FAST, () => true),
      false,
      question,
    );
  }
});

test("resolveWcTurnPlan — generic props follow-up without structured history still routes llm_thread", async () => {
  const scoMarMatches = [
    {
      id: "1001",
      homeTeam: "SCO",
      awayTeam: "MAR",
      status: "live",
      homeScore: 0,
      awayScore: 1,
      minute: "67",
      odds: {
        home: { moneyline: "+450" },
        away: { moneyline: "-120" },
        draw: { moneyline: "+280" },
        totalLine: "3.5",
        totalOver: { moneyline: "+105" },
        totalUnder: { moneyline: "-125" },
      },
    },
  ];
  const turn1Plan = resolveWcTurnPlan({
    question: "Best live angle on SCO vs MAR right now?",
    history: [],
    matches: scoMarMatches,
    incomingWcEventId: "1001",
    hasKvFixture: true,
  });
  const turn1Built = await buildWcStructuredForPlan(turn1Plan, {
    question: "Best live angle on SCO vs MAR right now?",
    matches: scoMarMatches,
  });
  const lean = String(turn1Built?.structured?.lean || "");
  assert.ok(lean, "expected live prebuilt lean");

  const historyNoStructured = [
    { role: "user", content: "Best live angle on SCO vs MAR right now?" },
    {
      role: "assistant",
      content: lean,
      wcEventId: "1001",
      wcMatchTeams: { home: "SCO", away: "MAR" },
    },
  ];

  const plan = resolveWcTurnPlan({
    question: "any player props to consider?",
    history: historyNoStructured,
    matches: scoMarMatches,
    incomingWcEventId: "1001",
    hasKvFixture: true,
    routeHeader: "1",
  });
  assert.equal(plan.lane, WC_TURN_LANE.LLM_THREAD);
  assert.equal(plan.reason, "generic_props_followup_after_prebuilt");
  assert.ok(plan.priorLean);
  assert.match(String(plan.priorLean?.lean || ""), /live lean|Under 3\.5/i);
  assert.equal(shouldActivateWcPropsFastPath(true, plan, () => true), false);
});

test("extractWcPriorThreadLeanFromHistory — lean prose + user fixture question in history", () => {
  const history = [
    { role: "user", content: "Best live angle on SCO vs MAR right now?" },
    {
      role: "assistant",
      content: "Lean Under 2.5 goals\nMorocco leads 1-0 live; Scotland needs a goal to flip the script.",
    },
  ];
  const prior = extractWcPriorThreadLeanFromHistory(history);
  assert.ok(prior);
  assert.equal(prior.fixtureHome, "SCO");
  assert.equal(prior.fixtureAway, "MAR");
  assert.match(String(prior.lean || ""), /Under 2\.5/i);
  const plan = resolveWcTurnPlan({
    question: "any player props to consider?",
    history,
    matches: [{ id: "1001", homeTeam: "SCO", awayTeam: "MAR", status: "live" }],
    incomingWcEventId: "1001",
    isConversationFollowUp: true,
    hasKvFixture: true,
    routeHeader: "1",
  });
  assert.equal(plan.lane, WC_TURN_LANE.LLM_THREAD);
  assert.equal(plan.reason, "generic_props_followup_after_prebuilt");
});

test("shouldRunWcPlayerPropsFastPath — blocks vague props follow-up after prebuilt lean", () => {
  const history = [
    { role: "user", content: "Best live angle on SCO vs MAR right now?" },
    { role: "assistant", content: "Lean Under 2.5 goals" },
  ];
  assert.equal(
    shouldRunWcPlayerPropsFastPath(
      WC_INTENT.PLAYER_PROP,
      "any player props to consider?",
      history,
      true,
    ),
    false,
  );
});

test("buildWcThreadAwareNoPropsFallback — references prior totals lean and live score", () => {
  const msg = buildWcThreadAwareNoPropsFallback(
    {
      lean: "Lean Under 3.5 goals",
      whyNow: "Morocco leads 1-0 live; Scotland needs a goal to flip the script.",
      fixtureHome: "SCO",
      fixtureAway: "MAR",
    },
    { homeName: "Scotland", awayName: "Morocco" },
  );
  assert.match(msg, /No player props posted yet for Scotland vs Morocco/i);
  assert.match(msg, /sticking with the Under 3\.5 lean while Morocco leads 1-0/i);
  assert.match(msg, /We'll update you as soon as lines drop/i);
});

test("buildWcGenericPropsFollowUpPromptBlock — binds target lean for llm_thread", () => {
  const plan = resolveWcTurnPlan({
    question: "any player props to consider?",
    history: [
      { role: "user", content: "Best live angle on SCO vs MAR right now?" },
      {
        role: "assistant",
        structured: {
          callType: "matchup",
          fixtureHome: "SCO",
          fixtureAway: "MAR",
          lean: "Lean Under 3.5 goals",
          whyNow: "Morocco leads 1-0 live",
        },
      },
    ],
    matches: [{ id: "1001", homeTeam: "SCO", awayTeam: "MAR", status: "live" }],
    isConversationFollowUp: true,
    incomingWcEventId: "1001",
    hasKvFixture: true,
  });
  const block = buildWcGenericPropsFollowUpPromptBlock(plan, {
    homeName: "Scotland",
    awayName: "Morocco",
  });
  assert.match(block, /WC GENERIC PROPS FOLLOW-UP/i);
  assert.match(block, /Morocco leads 1-0/i);
  assert.match(block, /Under 3\.5 lean/i);
  assert.match(block, /We'll update you as soon as lines drop/i);
});

test("resolveWcTurnPlan — vague continuation with prior lean uses llm_thread delivery mode", () => {
  const prior = {
    role: "assistant",
    structured: {
      callType: "matchup",
      fixtureHome: "USA",
      fixtureAway: "AUS",
      lean: "2 live leans at 0-0: United States +110 + Under 2.5 goals",
      call: "United States +110 to win · Lean Under 2.5 goals",
    },
  };
  const plan = resolveWcTurnPlan({
    question: "Tell me more",
    history: [{ role: "user", content: "Best live angle on USA vs AUS?" }, prior],
    matches: USA_AUS_MATCHES,
    isConversationFollowUp: true,
    hasKvFixture: true,
  });
  assert.equal(plan.lane, WC_TURN_LANE.LLM_THREAD);
  assert.equal(plan.useLiteContext, false);
  assert.equal(plan.shouldUseFastPath, false);
  assert.equal(
    shouldActivateWcPrebuiltLane(true, plan, WC_TURN_LANE.LIVE_IN_PLAY, () => true),
    false,
  );
});

test("applyWcLlmThreadPriorLeanToContext — injects prior lean block for LLM_THREAD", () => {
  const priorLean = USA_AUS_LIVE_PRIOR.structured;
  const plan = resolveWcTurnPlan({
    question: "Tell me more about that edge",
    history: [
      { role: "user", content: "Best live angle on USA vs AUS right now?" },
      USA_AUS_LIVE_PRIOR,
    ],
    matches: USA_AUS_MATCHES,
    isConversationFollowUp: true,
    hasKvFixture: true,
  });
  assert.equal(plan.lane, WC_TURN_LANE.LLM_THREAD);
  const ctx = { promptBlock: "WORLD CUP 2026 — VERIFIED CONTEXT" };
  applyWcLlmThreadPriorLeanToContext(ctx, plan);
  assert.ok(ctx.wcPriorLeanBlock);
  assert.match(ctx.promptBlock, /WC PRIOR TURN — STRUCTURED LEAN/);
  assert.match(ctx.promptBlock, /United States \+110/);
});

test("applyWcLlmThreadPriorLeanToGroundingPacket — attaches priorStructuredLean", () => {
  const plan = resolveWcTurnPlan({
    question: "Tell me more",
    history: [
      { role: "user", content: "Best live angle on USA vs AUS?" },
      USA_AUS_LIVE_PRIOR,
    ],
    matches: USA_AUS_MATCHES,
    isConversationFollowUp: true,
    hasKvFixture: true,
  });
  const packet = { views: { claude: { askShape: "follow_up_explain" } } };
  applyWcLlmThreadPriorLeanToGroundingPacket(packet, plan);
  assert.ok(packet.priorStructuredLean);
  assert.equal(packet.views.claude.priorStructuredLean, plan.priorLean);
  assert.match(String(packet.views.claude.instructions), /priorStructuredLean/i);
});

test("assertWcTurnPlanFastPathConsistency — rejects fast lane without shouldUseFastPath", () => {
  assert.throws(
    () =>
      assertWcTurnPlanFastPathConsistency({
        lane: WC_TURN_LANE.LIVE_IN_PLAY,
        shouldUseFastPath: false,
        reason: "test",
      }),
    /shouldUseFastPath=false/,
  );
});

test("buildWcThreadAwarePassFallback — references prior totals lean", () => {
  const msg = buildWcThreadAwarePassFallback({
    lean: "2 live leans at 0-0: United States +110 + Under 2.5 goals",
  });
  assert.match(msg, /building on the Under 2\.5 lean/i);
  assert.doesNotMatch(msg, /no actionable line yet; see Watch For/i);
});

test("resolveWcTurnPlan — rules question routes to rules_llm", () => {
  const plan = resolveWcTurnPlan({
    question: "What are the knockout rules for extra time and penalties?",
    history: [],
    matches: [],
  });
  assert.equal(plan.lane, WC_TURN_LANE.RULES_LLM);
  assert.equal(plan.intent, WC_INTENT.RULES);
  assert.ok(plan.dataPackages.includes(WC_DATA_PACKAGE.STATIC_RULES));
});

test("resolveWcTurnPlan — named player prop routes to props_fast", () => {
  const plan = resolveWcTurnPlan({
    question: "Best player props for USA vs AUS?",
    history: [],
    matches: USA_AUS_MATCHES,
    incomingWcEventId: "991",
    hasKvFixture: true,
  });
  assert.equal(plan.lane, WC_TURN_LANE.PROPS_FAST);
  assert.equal(plan.intent, WC_INTENT.PLAYER_PROP);
  assert.equal(plan.shouldUseFastPath, true);
  assert.ok(plan.dataPackages.includes(WC_DATA_PACKAGE.PLAYER_PROPS_KV));
});

test("isWcConditionalMatchupFollowUp — detects conditional after live card", () => {
  assert.equal(
    isWcConditionalMatchupFollowUp(
      "What happens if United States scores early?",
      USA_AUS_LIVE_PRIOR.structured,
    ),
    true,
  );
  assert.equal(
    isWcConditionalMatchupFollowUp("Who wins the World Cup?", USA_AUS_LIVE_PRIOR.structured),
    false,
  );
});

test("resolveWcTurnPlan — thread pins fixture from history when question omits teams", () => {
  const history = [
    { role: "user", content: "Best live angle on USA vs AUS right now?" },
    USA_AUS_LIVE_PRIOR,
  ];
  const plan = resolveWcTurnPlan({
    question: "What's the other side?",
    history,
    matches: USA_AUS_MATCHES,
    isConversationFollowUp: true,
    hasKvFixture: true,
  });
  assert.equal(plan.pinnedHome, "USA");
  assert.equal(plan.pinnedAway, "AUS");
  assert.equal(plan.pinnedEventId, "991");
  assert.equal(plan.lane, WC_TURN_LANE.MATCHUP_ALT_FOLLOWUP);
});

test("resolveWcTurnPlan — follow-up with prior lean uses llm_thread not llm_lite when no prebuilt", () => {
  const prior = {
    role: "assistant",
    structured: {
      callType: "advancement",
      call: "Pass at -130 — sim 15% vs market ~57%.",
      lean: "Pass at -130 on USA Round of 16.",
      fixtureHome: "USA",
      fixtureAway: "MEX",
    },
  };
  const plan = resolveWcTurnPlan({
    question: "Tell me more about that edge",
    history: [{ role: "user", content: "Is USA mispriced to reach the Round of 16?" }, prior],
    matches: [],
    isConversationFollowUp: true,
  });
  assert.equal(plan.lane, WC_TURN_LANE.LLM_THREAD);
  assert.equal(plan.useLiteContext, false);
  assert.ok(plan.dataPackages.includes(WC_DATA_PACKAGE.PRIOR_STRUCTURED));
});
