/**
 * End-to-end probe: SCO vs MAR live angle → generic player props follow-up.
 * Simulates WC_TURN_PLANNER=1 without calling Anthropic.
 */
import {
  WC_TURN_LANE,
  isWcTurnPlannerEnabled,
  resolveWcTurnPlan,
  isWcGenericPlayerPropsThreadFollowUp,
  isWcThreadAnchoredFollowUp,
  isWcPriorPrebuiltThreadLean,
  extractWcPriorThreadLeanFromHistory,
} from "../shared/wcTurnPlanner.js";
import {
  buildWcStructuredForPlan,
  shouldActivateWcPropsFastPath,
  buildWcPriorLeanPromptBlock,
  buildWcGenericPropsFollowUpPromptBlock,
  buildWcThreadAwareNoPropsFallback,
  applyWcLlmThreadPriorLeanToContext,
} from "../shared/wcTurnDelivery.js";
import { buildWcPropsBoardTargetLeanPreview } from "../shared/wcLivePropsBoardPrompt.js";
import { wcMatchupTeamDisplayName } from "../shared/wcMatchupWinnerLine.js";

process.env.WC_TURN_PLANNER = "1";

const SCO_MAR_PROPS_POSTED = {
  eventId: "1001",
  homeTeam: "SCO",
  awayTeam: "MAR",
  source: "balldontlie",
  lastUpdated: Date.now() - 45_000,
  markets: {
    player_shots_ou: [
      { name: "Scott McTominay", americanOdds: "-317", line: "0.5", side: "over", nationAbbr: "SCO" },
      { name: "Che Adams", americanOdds: "-203", line: "0.5", side: "over", nationAbbr: "SCO" },
      { name: "Ryan Christie", americanOdds: "+108", line: "0.5", side: "over", nationAbbr: "SCO" },
      { name: "Lewis Ferguson", americanOdds: "+194", line: "0.5", side: "over", nationAbbr: "SCO" },
      { name: "Azzedine Ounahi", americanOdds: "-233", line: "0.5", side: "over", nationAbbr: "MAR" },
      { name: "Chadi Riad", americanOdds: "+257", line: "0.5", side: "over", nationAbbr: "MAR" },
    ],
  },
};
const SCO_MAR_MATCHES = [
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

/** Turn 1 card as delivered in staging (live_in_play prebuilt shape). */
const TURN1_STRUCTURED = {
  sport: "worldcup",
  callType: "matchup",
  fixtureHome: "SCO",
  fixtureAway: "MAR",
  wcEventId: "1001",
  call: "Lean Under 3.5 goals",
  lean: "Lean Under 3.5 goals",
  line: "Morocco leads 1-0 live; Scotland needs a goal to flip the script.",
  whyNow: "Morocco leads 1-0 live; Scotland needs a goal to flip the script.",
  edge: "Watch for Scotland pushing if they trail late.",
  confidence: "Medium",
};

const TURN1_HISTORY = [
  { role: "user", content: "Best live angle on SCO vs MAR right now?" },
  {
    role: "assistant",
    content: "Lean Under 3.5 goals",
    structured: TURN1_STRUCTURED,
    wcEventId: "1001",
    wcMatchTeams: { home: "SCO", away: "MAR" },
  },
];

function logTurnPlan(label, plan) {
  console.log(`\n${"=".repeat(72)}`);
  console.log(label);
  console.log("=".repeat(72));
  console.log(JSON.stringify(
    {
      lane: plan.lane,
      reason: plan.reason,
      intent: plan.intent,
      shouldUseFastPath: plan.shouldUseFastPath,
      useLiteContext: plan.useLiteContext,
      priorLeanPresent: Boolean(plan.priorLean),
      priorLean: plan.priorLean
        ? {
            callType: plan.priorLean.callType,
            lean: plan.priorLean.lean,
            call: plan.priorLean.call,
            fixtureHome: plan.priorLean.fixtureHome,
            fixtureAway: plan.priorLean.fixtureAway,
          }
        : null,
      pinnedEventId: plan.pinnedEventId,
      pinnedHome: plan.pinnedHome,
      pinnedAway: plan.pinnedAway,
      priorLaneHint: plan.priorLaneHint,
    },
    null,
    2,
  ));
}

function simulateWcTurnPlanLog(plan) {
  const line = `[WC Turn Plan] lane=${plan.lane} intent=${plan.intent} reason=${plan.reason} priorLean=${!!plan.priorLean}`;
  console.log("\n--- Simulated deliverWcTurnByPlan / handler log ---");
  console.log(line);
  console.log(JSON.stringify({
    event: "ur_take_wc_turn_plan",
    lane: plan.lane,
    intent: plan.intent,
    reason: plan.reason,
    shouldUseFastPath: plan.shouldUseFastPath,
    useLiteContext: plan.useLiteContext,
    priorLaneHint: plan.priorLaneHint,
  }));
  return line;
}

function buildTurn2CardPreview(plan) {
  const homeName = wcMatchupTeamDisplayName(String(plan.pinnedHome || "SCO"));
  const awayName = wcMatchupTeamDisplayName(String(plan.pinnedAway || "MAR"));
  const lean = buildWcThreadAwareNoPropsFallback(plan.priorLean, { homeName, awayName });
  return {
    sport: "worldcup",
    callType: "matchup",
    fixtureHome: plan.pinnedHome,
    fixtureAway: plan.pinnedAway,
    wcEventId: plan.pinnedEventId,
    call: `No player props posted yet for ${homeName} vs ${awayName}.`,
    lean,
    whyNow: String(plan.priorLean?.whyNow || "").trim(),
    edge: "Recheck player markets after lineup lock; match lean unchanged until then.",
    confidence: "Medium",
  };
}

function simulateTurn2Delivery(plan, question, opts = {}) {
  const propsPayload = opts.propsPayload || null;
  console.log("\n--- Turn 2 delivery simulation ---");
  console.log(`plannerEnabled: ${isWcTurnPlannerEnabled({})}`);
  console.log(`propsFastWouldActivate: ${shouldActivateWcPropsFastPath(true, plan, () => true)}`);
  console.log(`propsPosted: ${Boolean(propsPayload?.markets)}`);

  const homeName = wcMatchupTeamDisplayName(String(plan.pinnedHome || "SCO"));
  const awayName = wcMatchupTeamDisplayName(String(plan.pinnedAway || "MAR"));
  const match = SCO_MAR_MATCHES[0];

  if (plan.lane === WC_TURN_LANE.LLM_THREAD) {
    const ctx = {
      promptBlock: "WORLD CUP 2026 — VERIFIED CONTEXT (fixture pinned SCO-MAR)",
      allMatches: SCO_MAR_MATCHES,
      routingQuestion: question,
      ...(propsPayload
        ? { playerMarketKv: { matchPlayerProps: propsPayload, wcEventId: "1001" } }
        : {}),
    };
    applyWcLlmThreadPriorLeanToContext(ctx, plan);
    console.log("\n[Full wcPriorLeanBlock injected into LLM user prompt]");
    console.log(ctx.wcPriorLeanBlock);
    console.log("\n[LLM path — Claude follows binding above; target lean below]");
  }

  const noPropsFallback = buildWcThreadAwareNoPropsFallback(plan.priorLean, {
    homeName,
    awayName,
  });
  const postedLeanPreview = propsPayload
    ? buildWcPropsBoardTargetLeanPreview({
        match,
        propsPayload,
        priorLean: plan.priorLean,
        question,
        homeName,
        awayName,
        homeAbbr: String(plan.pinnedHome || "SCO"),
        awayAbbr: String(plan.pinnedAway || "MAR"),
      })
    : null;
  const targetLeanText = postedLeanPreview || noPropsFallback;

  const card = buildTurn2CardPreview(plan);
  console.log("\n[Expected structured card face (no-props fallback shape):]");
  console.log(JSON.stringify(card, null, 2));
  console.log("\n[TURN 2 TARGET LEAN TEXT]");
  console.log(targetLeanText);

  return {
    noPropsFallback,
    targetLeanText,
    card,
    propsFastBlocked: !shouldActivateWcPropsFastPath(true, plan, () => true),
  };
}

function logStep4dDiagnostics(label, question, history, plan) {
  const priorLean = extractWcPriorThreadLeanFromHistory(history);
  const diag = {
    threadAnchored: isWcThreadAnchoredFollowUp({
      isConversationFollowUp: plan.isConversationFollowUp,
      priorLean,
      pinnedEventId: plan.pinnedEventId,
      pinnedHome: plan.pinnedHome,
      pinnedAway: plan.pinnedAway,
      history,
    }),
    priorLeanPresent: Boolean(priorLean),
    priorPrebuilt: isWcPriorPrebuiltThreadLean(priorLean),
    genericPropsFollowUp: isWcGenericPlayerPropsThreadFollowUp(question, history, priorLean),
    step4dWouldFire:
      Boolean(priorLean) &&
      isWcGenericPlayerPropsThreadFollowUp(question, history, priorLean),
  };
  console.log(`\n--- Step 4d diagnostics — ${label} ---`);
  console.log(JSON.stringify(diag, null, 2));
  return diag;
}

async function main() {
  console.log("SCO vs MAR props follow-up probe (WC_TURN_PLANNER=1)\n");

  // Turn 1
  const turn1Plan = resolveWcTurnPlan({
    question: "Best live angle on SCO vs MAR right now?",
    history: [],
    matches: SCO_MAR_MATCHES,
    incomingWcEventId: "1001",
    hasKvFixture: true,
  });
  logTurnPlan("TURN 1 — resolveWcTurnPlan()", turn1Plan);

  let turn1Built = null;
  try {
    turn1Built = await buildWcStructuredForPlan(turn1Plan, {
      question: "Best live angle on SCO vs MAR right now?",
      matches: SCO_MAR_MATCHES,
      history: [],
    });
  } catch (err) {
    console.log("\nTurn 1 buildWcStructuredForPlan skipped:", err?.message);
  }
  if (turn1Built?.structured) {
    console.log("\nTurn 1 prebuilt lean (from buildWcStructuredForPlan):");
    console.log(JSON.stringify({ lean: turn1Built.structured.lean, call: turn1Built.structured.call }, null, 2));
  }

  const turn1Lean =
    String(turn1Built?.structured?.lean || "") ||
    "2 live leans at 0-1: Morocco -120 + Under 3.5 goals";

  const TURN2_HISTORY_NO_STRUCTURED = [
    { role: "user", content: "Best live angle on SCO vs MAR right now?" },
    {
      role: "assistant",
      content: turn1Lean,
      wcEventId: "1001",
      wcMatchTeams: { home: "SCO", away: "MAR" },
    },
  ];

  const turn2NoStructPlan = resolveWcTurnPlan({
    question: "any player props to consider?",
    history: TURN2_HISTORY_NO_STRUCTURED,
    matches: SCO_MAR_MATCHES,
    incomingWcEventId: "1001",
    hasKvFixture: true,
    routeHeader: "1",
  });
  logTurnPlan('TURN 2 (prod-like: no structured on history) — "any player props to consider?"', turn2NoStructPlan);
  logStep4dDiagnostics("no structured history", "any player props to consider?", TURN2_HISTORY_NO_STRUCTURED, turn2NoStructPlan);
  simulateWcTurnPlanLog(turn2NoStructPlan);

  console.log(`\n${"=".repeat(72)}`);
  console.log("FINAL PROD-LIKE PROBE — lean text only, no structured object");
  console.log("=".repeat(72));
  const prodLikeNoProps = simulateTurn2Delivery(
    turn2NoStructPlan,
    "any player props to consider?",
  );
  console.log("\n=== FINAL TURN 2 RESPONSE TEXT (no props posted) ===");
  console.log(prodLikeNoProps.targetLeanText);

  console.log(`\n${"=".repeat(72)}`);
  console.log("FINAL PROD-LIKE PROBE — lean text only + BDL GOAT props posted");
  console.log("=".repeat(72));
  const prodLikePosted = simulateTurn2Delivery(
    turn2NoStructPlan,
    "any player props to consider?",
    { propsPayload: SCO_MAR_PROPS_POSTED },
  );
  console.log("\n=== FINAL TURN 2 RESPONSE TEXT (posted props — target binding) ===");
  console.log(prodLikePosted.targetLeanText);

  const shotsQuestion = "Player to Have 1 or More Shots — who should I take?";
  const shotsPlan = resolveWcTurnPlan({
    question: shotsQuestion,
    history: TURN2_HISTORY_NO_STRUCTURED,
    matches: SCO_MAR_MATCHES,
    incomingWcEventId: "1001",
    isConversationFollowUp: true,
    hasKvFixture: true,
  });
  logTurnPlan(`SHOTS MARKET — "${shotsQuestion}"`, shotsPlan);
  const shotsLean = buildWcPropsBoardTargetLeanPreview({
    match: SCO_MAR_MATCHES[0],
    propsPayload: SCO_MAR_PROPS_POSTED,
    priorLean: turn2NoStructPlan.priorLean,
    question: shotsQuestion,
    homeName: wcMatchupTeamDisplayName("SCO"),
    awayName: wcMatchupTeamDisplayName("MAR"),
    homeAbbr: "SCO",
    awayAbbr: "MAR",
  });
  console.log("\n=== SHOTS MARKET TARGET LEAN ===");
  console.log(shotsLean);

  const variants = [
    "any player props to consider?",
    "player props?",
    "any bets on players?",
    "props for this match?",
  ];

  const results = [];

  for (const question of variants) {
    const plan = resolveWcTurnPlan({
      question,
      history: TURN1_HISTORY,
      matches: SCO_MAR_MATCHES,
      incomingWcEventId: "1001",
      isConversationFollowUp: true,
      hasKvFixture: true,
    });
    logTurnPlan(`TURN 2 — resolveWcTurnPlan() — "${question}"`, plan);
    logStep4dDiagnostics(`structured history — "${question}"`, question, TURN1_HISTORY, plan);
    const logLine = simulateWcTurnPlanLog(plan);
    const delivery = simulateTurn2Delivery(plan, question);

    const threadAware =
      delivery.noPropsFallback.includes("Under 3.5") &&
      delivery.noPropsFallback.includes("Morocco leads 1-0") &&
      delivery.noPropsFallback.includes("We'll update you");

    results.push({
      question,
      lane: plan.lane,
      reason: plan.reason,
      useLiteContext: plan.useLiteContext,
      priorLeanPresent: Boolean(plan.priorLean),
      logLine,
      propsFastBlocked: delivery.propsFastBlocked,
      noPropsFallbackLean: delivery.noPropsFallback,
      threadAwareFallback: threadAware,
      llmThread: plan.lane === WC_TURN_LANE.LLM_THREAD,
      correctReason: plan.reason === "generic_props_followup_after_prebuilt",
    });
  }

  console.log(`\n${"=".repeat(72)}`);
  console.log("SUMMARY");
  console.log("=".repeat(72));
  console.table(results);

  const allPass =
    turn2NoStructPlan.lane === WC_TURN_LANE.LLM_THREAD &&
    turn2NoStructPlan.reason === "generic_props_followup_after_prebuilt" &&
    results.every(
      (r) =>
        r.llmThread &&
        r.correctReason &&
        !r.useLiteContext &&
        r.priorLeanPresent &&
        r.propsFastBlocked &&
        r.threadAwareFallback,
    );
  console.log(allPass ? "\nVERDICT: PASS — routing and fallback copy look correct." : "\nVERDICT: FAIL — see table.");
  process.exit(allPass ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
