/**
 * SCO vs MAR — live angle → tactical follow-up → vague props follow-up.
 * Probes warm thread continuation vs cold generic PASS (WC_TURN_PLANNER=1).
 */
import {
  resolveWcTurnPlan,
  extractWcPriorThreadLeanFromHistory,
} from "../shared/wcTurnPlanner.js";
import {
  applyWcLlmThreadPriorLeanToContext,
  applyWcThreadPriorLeanPassRewrite,
  buildWcThreadContinuationFallback,
  buildWcThreadAwareNoPropsFallback,
  buildWcThreadPassPolicyPromptBlock,
  isGenericWcPassLean,
  wcTurnUsesThreadPassPolicy,
} from "../shared/wcTurnDelivery.js";
import { wcMatchupTeamDisplayName } from "../shared/wcMatchupWinnerLine.js";
import { buildWcCompactStructured } from "../shared/wcUrTakeCompactDelivery.js";

process.env.WC_TURN_PLANNER = "1";

const SCO_MAR_MATCH = {
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
    totalUnder: { moneyline: "-125" },
    totalOver: { moneyline: "+105" },
  },
};

const TURN1_STRUCTURED = {
  sport: "worldcup",
  callType: "matchup",
  fixtureHome: "SCO",
  fixtureAway: "MAR",
  wcEventId: "1001",
  call: "Lean Under 3.5 goals",
  lean: "Lean Under 3.5 goals",
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

function deliveredLean(plan, question, history, priorLean) {
  const coldLlmLean = "Pass — no actionable line yet; see Watch For before locking a bet.";
  const continuation = buildWcThreadContinuationFallback(priorLean, {
    question,
    match: SCO_MAR_MATCH,
  });

  if (plan.reason === "generic_props_followup_after_prebuilt") {
    const homeName = wcMatchupTeamDisplayName("SCO");
    const awayName = wcMatchupTeamDisplayName("MAR");
    return (
      buildWcThreadAwareNoPropsFallback(priorLean, { homeName, awayName }) ||
      continuation
    );
  }

  const rewritten = applyWcThreadPriorLeanPassRewrite(
    { lean: coldLlmLean, call: coldLlmLean },
    { wcTurnPlan: plan, question, match: SCO_MAR_MATCH, priorLean, history },
  );
  if (!isGenericWcPassLean(rewritten.lean)) return rewritten.lean;

  const compact = buildWcCompactStructured({
    question,
    wcIntent: "MATCHUP",
    summary: coldLlmLean,
    deep: "Morocco has sat in a low block since taking the lead.",
    history,
    wcTurnPlan: plan,
    priorLean,
    match: SCO_MAR_MATCH,
  });
  if (compact?.lean && !isGenericWcPassLean(compact.lean)) return compact.lean;

  return continuation;
}

function simulateTurn(question, history) {
  const plan = resolveWcTurnPlan({
    question,
    history,
    matches: [SCO_MAR_MATCH],
    incomingWcEventId: "1001",
    isConversationFollowUp: history.length > 0,
    hasKvFixture: true,
  });
  const priorLean = extractWcPriorThreadLeanFromHistory(history);
  const ctx = { allMatches: [SCO_MAR_MATCH], routingQuestion: question };
  applyWcLlmThreadPriorLeanToContext(ctx, plan);
  const passPolicy = buildWcThreadPassPolicyPromptBlock(plan, {
    question,
    match: SCO_MAR_MATCH,
  });
  const finalLean = deliveredLean(plan, question, history, priorLean);

  return {
    question,
    lane: plan.lane,
    reason: plan.reason,
    finalLean,
    coldPassGone: !isGenericWcPassLean(finalLean),
    passPolicyApplied: wcTurnUsesThreadPassPolicy(plan),
    passPolicyPresent: Boolean(passPolicy),
  };
}

console.log("SCO vs MAR full thread probe (WC_TURN_PLANNER=1)\n");

console.log("=== TURN 1: Best live angle on SCO vs MAR right now? ===");
console.log("(Opening turn — live_in_play prebuilt; prior lean seeds turn 2)\n");
console.log("[Turn 1 card lean from live prebuilt]");
console.log(TURN1_STRUCTURED.lean);

const turn2 = simulateTurn("Does Morocco sitting deep flip this to Under?", TURN1_HISTORY);
console.log("\n=== TURN 2: Does Morocco sitting deep flip this to Under? ===");
console.log(JSON.stringify({ lane: turn2.lane, reason: turn2.reason }, null, 2));
console.log("\n[Delivered lean]");
console.log(turn2.finalLean);
console.log(`\nCold PASS gone: ${turn2.coldPassGone ? "yes" : "NO"}`);
console.log(`PASS policy applied: ${turn2.passPolicyApplied ? "yes" : "no"}`);

const historyAfterTurn2 = [
  ...TURN1_HISTORY,
  { role: "user", content: "Does Morocco sitting deep flip this to Under?" },
  {
    role: "assistant",
    content: turn2.finalLean,
    structured: {
      ...TURN1_STRUCTURED,
      lean: turn2.finalLean,
      call: turn2.finalLean,
    },
    wcEventId: "1001",
    wcMatchTeams: { home: "SCO", away: "MAR" },
  },
];

const turn3 = simulateTurn("any player props to consider?", historyAfterTurn2);
console.log("\n=== TURN 3: any player props to consider? ===");
console.log(JSON.stringify({ lane: turn3.lane, reason: turn3.reason }, null, 2));
console.log("\n[Delivered lean]");
console.log(turn3.finalLean);
console.log(`\nCold PASS gone: ${turn3.coldPassGone ? "yes" : "NO"}`);

const ok =
  (turn2.lane === "matchup_alt_followup" || turn2.lane === "llm_thread") &&
  turn2.passPolicyApplied &&
  turn2.coldPassGone &&
  turn3.coldPassGone &&
  /Under 3\.5 still looks solid/i.test(String(turn2.finalLean));
console.log(ok ? "\nVERDICT: PASS" : "\nVERDICT: FAIL");
process.exit(ok ? 0 : 1);
