/**
 * WC turn planner — HTTP delivery for lane-driven fast paths (Phase 2).
 */

import { sendUrTakeJson } from "./responseDelivery.js";
import { runUnderReviewPostProcess } from "../_urTakeOutputQA.js";
import { runWcUrTakeQA } from "../_wcUrTakeQA.js";
import {
  buildWcCompactStructured,
  formatWcCompactDisplayText,
  resolveWcQaStructured,
} from "../../shared/wcUrTakeCompactDelivery.js";
import { normalizeWcStructuredForDelivery } from "../../shared/wcUrTakeStructured.js";
import {
  buildWcStructuredForPlan,
  shouldSuppressWcPlanDeliveryDuplicate,
  wcTurnLaneToPassKind,
} from "../../shared/wcTurnDelivery.js";
import { WC_TURN_LANE } from "../../shared/wcTurnConstants.js";

/** @typedef {import("../../shared/wcTurnConstants.js").WcTurnPlan} WcTurnPlan */

/**
 * Lane-driven WC prebuilt delivery. Props fast path stays in wcPlayerPropsFastPath.js.
 * @param {WcTurnPlan} plan
 * @param {object} ctx
 * @returns {Promise<{ handled: boolean, passKind?: string | null }>}
 */
export async function deliverWcTurnByPlan(plan, ctx) {
  const {
    sportHint,
    res,
    requestId,
    requestStart,
    question,
    routingQuestion,
    wcIntent,
    wcRequiredEntities,
    wcForbiddenEntities,
    wcStrengthTags,
    wcRelevanceLog,
    wcContext,
    normalizedUrTakeHistoryForGate,
    intent,
    gateQuotaEmail,
    gateQuotaSessionId,
    setGateQuotaDelivered,
    extractTakeFromResponse,
    userEmail,
    appendTakeForUser,
    earlyPrebuilts,
    wcTurnPlannerEnabled = false,
  } = ctx;

  if (wcTurnPlannerEnabled) {
    console.log(
      `[WC Turn Plan] lane=${plan.lane} intent=${plan.intent} reason=${plan.reason} priorLean=${!!plan.priorLean}`,
    );
  }

  if (sportHint !== "worldcup" || !plan?.shouldUseFastPath) {
    return { handled: false };
  }
  if (plan.lane === WC_TURN_LANE.PROPS_FAST || plan.lane === WC_TURN_LANE.PROPS_CLAUDE) {
    return { handled: false, passKind: null };
  }

  const built = await buildWcStructuredForPlan(plan, {
    question,
    routingQuestion,
    history: normalizedUrTakeHistoryForGate,
    wcContext,
    matches: wcContext?.allMatches,
    earlyPrebuilts,
    nowMs: Date.now(),
  });
  if (!built?.structured) {
    console.log(
      JSON.stringify({
        event: "ur_take_wc_turn_plan_delivery_miss",
        lane: plan.lane,
        reason: plan.reason,
        pinnedEventId: plan.pinnedEventId,
      }),
    );
    return { handled: false, passKind: wcTurnLaneToPassKind(plan.lane) };
  }

  if (
    shouldSuppressWcPlanDeliveryDuplicate(
      plan,
      built.structured,
      normalizedUrTakeHistoryForGate || [],
    )
  ) {
    return { handled: false, passKind: built.passKind };
  }

  let structuredResponse = built.structured;
  let responseText =
    formatWcCompactDisplayText(structuredResponse, structuredResponse.lean) || "";
  const qaPostOpts = {
    sport: "worldcup",
    question: String(question || ""),
    intent,
    liveMode: false,
    structuredLean: String(structuredResponse.lean || ""),
  };
  const post = runUnderReviewPostProcess(responseText, qaPostOpts);
  responseText = post.text;

  const wcQa = runWcUrTakeQA({
    responseText,
    structured: resolveWcQaStructured({
      question: String(question || ""),
      wcIntent,
      summary: responseText,
      deep: null,
      playerMarketTier: wcRelevanceLog.playerMarketTier || wcContext?.playerMarketTier,
      structuredSeed: structuredResponse,
    }),
    question: String(question || ""),
    wcIntent,
    requiredEntities: wcRequiredEntities,
    forbiddenEntities: wcForbiddenEntities,
    strengthTags: wcStrengthTags,
    playerMarketKv: wcContext?.playerMarketKv,
    roundupPlayerKv: wcContext?.roundupPlayerKv,
    playerMarketTier: wcRelevanceLog.playerMarketTier,
    matchDetails: wcContext?.matchDetails,
    outrightsAvailable: Boolean(wcContext?.outrightsKv),
    teamStats: wcContext?.tournamentSimResults?.teamStats || null,
  });
  wcRelevanceLog.qaEntityMatch = wcQa.qaEntityMatch;
  wcRelevanceLog.qaIntentMatch = wcQa.qaIntentMatch;
  wcRelevanceLog.qaPlayerMatch = wcQa.qaPlayerMatch;
  wcRelevanceLog.wcTurnPlanDelivered = true;
  wcRelevanceLog.wcTurnPlanPassKind = built.passKind;

  const tier =
    wcContext?.playerMarketTier || wcRelevanceLog.playerMarketTier || null;
  structuredResponse = buildWcCompactStructured({
    question: String(question || ""),
    wcIntent,
    summary: responseText,
    deep: null,
    playerMarketTier: tier,
    structuredSeed: structuredResponse,
    history: normalizedUrTakeHistoryForGate,
  });
  if (structuredResponse && typeof structuredResponse === "object") {
    structuredResponse = normalizeWcStructuredForDelivery(
      structuredResponse,
      wcIntent,
      String(question || ""),
      wcRequiredEntities,
    );
  }
  responseText = formatWcCompactDisplayText(structuredResponse, responseText);

  const takeRecord = extractTakeFromResponse({
    responseText,
    sport: "worldcup",
    intent,
    question,
  });
  if (userEmail) {
    appendTakeForUser(userEmail, takeRecord).catch((e) => {
      console.warn("take logging failed:", e?.message || e);
    });
  }

  const liveMode =
    built.passKind === "live_in_play_bets" ||
    built.passKind === "live_match_winner" ||
    built.passKind === "live_bet_timing";

  const responseBody = {
    requestId,
    response: responseText,
    responseDeep: null,
    responseFormat: "structured",
    sport: "worldcup",
    intent,
    liveMode,
    take: {
      id: takeRecord.id,
      playLine: takeRecord.playLine,
      confidence: takeRecord.confidence,
      status: takeRecord.status,
    },
    structured: structuredResponse,
    wcIntent,
    userQuestion: String(question || "").trim(),
    qaSummary: {
      score: wcQa.score,
      issueCodes: wcQa.issueCodes,
      passedCriticalGates: wcQa.passed,
      regenerationAttempts: 0,
      qaFallbackApplied: false,
    },
    ...(wcContext?.dataConfidence ? { dataConfidence: wcContext.dataConfidence } : {}),
    ...(structuredResponse?.wcEventId
      ? { wcEventId: String(structuredResponse.wcEventId) }
      : wcRelevanceLog?.wcEventId
        ? { wcEventId: String(wcRelevanceLog.wcEventId) }
        : {}),
  };

  console.log(
    JSON.stringify({
      requestId,
      event: "ur_take_complete",
      sport: "worldcup",
      mode: "wc_turn_plan_delivery",
      lane: plan.lane,
      passKind: built.passKind,
      planReason: plan.reason,
      structuredInPayload: true,
      durationMs: Date.now() - requestStart,
      wcRelevance: wcRelevanceLog,
    }),
  );

  setGateQuotaDelivered(true);
  await sendUrTakeJson(res, responseBody, { gateQuotaEmail, gateQuotaSessionId });
  return { handled: true, passKind: built.passKind };
}
