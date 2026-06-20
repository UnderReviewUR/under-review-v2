/**
 * SCO vs MAR — live angle → tactical follow-up / vague props follow-up.
 * Probes warm thread continuation vs cold generic PASS.
 */
import {
  resolveWcTurnPlan,
  extractWcPriorThreadLeanFromHistory,
} from "../shared/wcTurnPlanner.js";
import {
  buildWcStructuredForPlan,
  applyWcLlmThreadPriorLeanToContext,
  applyWcThreadPriorLeanPassRewrite,
  buildWcThreadContinuationFallback,
  buildWcThreadAwareNoPropsFallback,
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
    totalLine: "3.5",
    totalUnder: { moneyline: "-125" },
    totalOver: { moneyline: "+105" },
  },
};

const TURN1_HISTORY = [
  { role: "user", content: "Best live angle on SCO vs MAR right now?" },
  {
    role: "assistant",
    content: "2 live leans at 0-1: Morocco -120 + Under 3.5 goals",
    wcEventId: "1001",
    wcMatchTeams: { home: "SCO", away: "MAR" },
  },
];

function simulateTurn(question, history) {
  const plan = resolveWcTurnPlan({
    question,
    history,
    matches: [SCO_MAR_MATCH],
    incomingWcEventId: "1001",
    isConversationFollowUp: true,
    hasKvFixture: true,
  });
  const priorLean = extractWcPriorThreadLeanFromHistory(history);
  const ctx = {
    allMatches: [SCO_MAR_MATCH],
    routingQuestion: question,
  };
  applyWcLlmThreadPriorLeanToContext(ctx, plan);
  const continuation = buildWcThreadContinuationFallback(priorLean, {
    question,
    match: SCO_MAR_MATCH,
  });
  const passPolicy = buildWcThreadPassPolicyPromptBlock(plan, {
    question,
    match: SCO_MAR_MATCH,
  });

  const coldLlmLean = "Pass — no actionable line yet; see Watch For before locking a bet.";
  const rewritten = applyWcThreadPriorLeanPassRewrite(
    { lean: coldLlmLean, call: coldLlmLean },
    { wcTurnPlan: plan, question, match: SCO_MAR_MATCH, priorLean, history },
  );
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

  return {
    question,
    lane: plan.lane,
    reason: plan.reason,
    continuation,
    passPolicyPresent: Boolean(passPolicy),
    rewrittenLean: rewritten.lean,
    compactLean: compact?.lean,
    coldGenericBlocked:
      !isGenericWcPassLean(continuation) &&
      !isGenericWcPassLean(rewritten.lean) &&
      !isGenericWcPassLean(compact?.lean),
    passPolicyApplied: wcTurnUsesThreadPassPolicy(plan),
    wcPriorLeanBlock: ctx.wcPriorLeanBlock,
  };
}

console.log("SCO vs MAR PASS continuation probe\n");

const turn2 = simulateTurn("Does Morocco sitting deep flip this to Under?", TURN1_HISTORY);
console.log("=== TURN 2: Does Morocco sitting deep flip this to Under? ===");
console.log(JSON.stringify({ lane: turn2.lane, reason: turn2.reason }, null, 2));
console.log("\n[Target continuation lean]");
console.log(turn2.continuation);
console.log("\n[Rewritten if LLM cold-PASSed]");
console.log(turn2.rewrittenLean);
console.log("\n[Compact structured lean after rewrite]");
console.log(turn2.compactLean);
console.log("\n[PASS policy applied]");
console.log(turn2.passPolicyApplied ? "yes" : "no");

const turn3 = simulateTurn("any player props to consider?", TURN1_HISTORY);
console.log("\n=== TURN 3: any player props to consider? (vague follow-up) ===");
console.log(JSON.stringify({ lane: turn3.lane, reason: turn3.reason }, null, 2));
console.log("\n[Target continuation lean]");
console.log(turn3.continuation);
console.log("\n[Rewritten if LLM cold-PASSed]");
console.log(turn3.rewrittenLean);

const ok =
  (turn2.lane === "matchup_alt_followup" || turn2.lane === "llm_thread") &&
  turn2.passPolicyApplied &&
  !isGenericWcPassLean(turn2.rewrittenLean) &&
  turn3.coldGenericBlocked &&
  /Under 3\.5 still looks solid/i.test(String(turn2.continuation));
console.log(ok ? "\nVERDICT: PASS" : "\nVERDICT: FAIL");
process.exit(ok ? 0 : 1);
