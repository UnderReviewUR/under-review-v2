import { sendUrTakeJson } from "./responseDelivery.js";

/**
 * NBA availability / blocked shortcuts and empty-context fallbacks.
 * Returns { handled: true } when a response was sent; otherwise { handled: false }.
 */
export async function tryUrTakeEarlyPaths(
  ctx,
  { includeNbaShortcuts = true, includeEmptyFallbacks = true } = {},
) {
  const {
    res,
    sportHint,
    nbaDecisionMode,
    nbaInvalidation,
    nbaNewsImpact,
    nbaContext,
    nbaStatusShiftLine,
    question,
    intent,
    userEmail,
    requestId,
    derivedConfidence,
    nbaConfidenceModifier,
    nbaMatchupGroundingApplied,
    nbaDebugEnabled,
    gateQuotaEmail,
    gateQuotaSessionId,
    setGateQuotaDelivered,
    buildNbaAvailabilityResponse,
    ensureNbaTakeConfidenceConsistency,
    buildNbaOutStatusShiftPlan,
    buildNbaObservabilityMeta,
    logNbaObservability,
    extractTakeFromResponse,
    appendTakeForUser,
    takeClientPayload,
    hasNoChatHistory,
    golfContextEffective,
  } = ctx;

  if (
    includeNbaShortcuts &&
    sportHint === "nba" &&
    (nbaDecisionMode === "status_only" || nbaDecisionMode === "status_plus_consequence")
  ) {
    const availabilityPayload = buildNbaAvailabilityResponse({
      question,
      nbaContext,
      nbaInvalidation,
      derivedConfidence,
      nbaConfidenceModifier,
      decisionMode: nbaDecisionMode,
    });
    let takeRecord = extractTakeFromResponse({
      responseText: availabilityPayload.response,
      sport: "nba",
      intent,
      question,
    });
    takeRecord = ensureNbaTakeConfidenceConsistency({
      takeRecord,
      decisionMode: nbaDecisionMode,
      derivedConfidence,
      confidenceModifier: nbaConfidenceModifier,
    });
    if (userEmail) {
      appendTakeForUser(userEmail, takeRecord).catch((e) => {
        console.warn("take logging failed:", e?.message || e);
      });
    }
    const nbaMeta = buildNbaObservabilityMeta({
      decisionMode: nbaDecisionMode,
      sport: "nba",
      matchupGroundingApplied: nbaMatchupGroundingApplied,
      postValidationChecked: false,
      postValidationTriggered: false,
      fallbackOrRepairUsed: false,
    });
    logNbaObservability(nbaMeta);
    setGateQuotaDelivered(true);
    await sendUrTakeJson(
      res,
      {
        requestId,
        response: availabilityPayload.response,
        responseDeep: null,
        responseFormat: "plain",
        statusShift: availabilityPayload.statusShift,
        decisionMode: nbaDecisionMode,
        ...(nbaDebugEnabled ? { nbaDebug: nbaMeta } : {}),
        sport: "nba",
        intent,
        take: takeClientPayload(takeRecord),
      },
      { gateQuotaEmail, gateQuotaSessionId },
    );
    return { handled: true };
  }

  if (
    includeNbaShortcuts &&
    sportHint === "nba" &&
    nbaDecisionMode === "blocked_unavailable" &&
    nbaInvalidation.targetedPlayer
  ) {
    const affected = (nbaNewsImpact?.affectedTeams || []).find(
      (t) => String(t?.team || "").toUpperCase() === String(nbaInvalidation.team || "").toUpperCase(),
    );
    const outPlan = buildNbaOutStatusShiftPlan({
      targetedPlayer: nbaInvalidation.targetedPlayer,
      teamAbbr: nbaInvalidation.team,
      nbaContext,
      teamImpact: affected,
    });
    const blockedLead = `${nbaInvalidation.targetedPlayer} is ${nbaInvalidation.statusDisplay || "out"}. Direct prop projection is invalid.`;
    const watchBody = String(outPlan.liveTrigger || "").replace(/^Live trigger:\s*/i, "").trim();
    const blockedResponse = `How the board shifts
${blockedLead}

Replacement looks
${outPlan.replacementLines}

Prop reads
${outPlan.shiftLine}

Watch
${watchBody}

CONFIDENCE
${derivedConfidence}${nbaConfidenceModifier.reason ? ` — ${nbaConfidenceModifier.reason}` : ""}`;
    const blockedStatusShift = nbaStatusShiftLine || null;

    let takeRecord = extractTakeFromResponse({
      responseText: blockedResponse,
      sport: "nba",
      intent,
      question,
    });
    takeRecord = ensureNbaTakeConfidenceConsistency({
      takeRecord,
      decisionMode: nbaDecisionMode,
      derivedConfidence,
      confidenceModifier: nbaConfidenceModifier,
    });
    if (userEmail) {
      appendTakeForUser(userEmail, takeRecord).catch((e) => {
        console.warn("take logging failed:", e?.message || e);
      });
    }
    const nbaMeta = buildNbaObservabilityMeta({
      decisionMode: nbaDecisionMode,
      sport: "nba",
      matchupGroundingApplied: nbaMatchupGroundingApplied,
      postValidationChecked: false,
      postValidationTriggered: false,
      fallbackOrRepairUsed: false,
    });
    logNbaObservability(nbaMeta);
    setGateQuotaDelivered(true);
    await sendUrTakeJson(
      res,
      {
        requestId,
        response: blockedResponse,
        responseDeep: null,
        responseFormat: "plain",
        statusShift: blockedStatusShift,
        decisionMode: nbaDecisionMode,
        ...(nbaDebugEnabled ? { nbaDebug: nbaMeta } : {}),
        sport: "nba",
        intent,
        take: takeClientPayload(takeRecord),
      },
      { gateQuotaEmail, gateQuotaSessionId },
    );
    return { handled: true };
  }

  const nbaHasUsableContext =
    !!nbaContext &&
    (Array.isArray(nbaContext?.todaysGames) && nbaContext.todaysGames.length > 0 ||
      Array.isArray(nbaContext?.playerStats) && nbaContext.playerStats.length > 0 ||
      Array.isArray(nbaContext?.propLines) && nbaContext.propLines.length > 0 ||
      !!nbaContext?.liveBoxscore);

  if (includeEmptyFallbacks && sportHint === "nba" && hasNoChatHistory && !nbaHasUsableContext) {
    const response =
      "The NBA feed is loading — check back closer to tip-off or ask about a specific player or matchup and I'll work with what's available.";
    const fallbackTake = extractTakeFromResponse({
      responseText: response,
      sport: "nba",
      intent,
      question,
    });
    setGateQuotaDelivered(true);
    await sendUrTakeJson(
      res,
      {
        requestId,
        response,
        responseDeep: null,
        responseFormat: "plain",
        statusShift: null,
        decisionMode: nbaDecisionMode,
        sport: "nba",
        intent,
        take: takeClientPayload(fallbackTake),
        fallback: true,
        fallbackReason: "empty_nba_context",
      },
      { gateQuotaEmail, gateQuotaSessionId },
    );
    return { handled: true };
  }

  if (includeEmptyFallbacks && sportHint === "golf" && hasNoChatHistory && !golfContextEffective) {
    const response =
      "Golf context is still loading. Ask about a specific tournament, player, or matchup and I'll work with what's available.";
    const fallbackTake = extractTakeFromResponse({
      responseText: response,
      sport: "golf",
      intent,
      question,
    });
    setGateQuotaDelivered(true);
    await sendUrTakeJson(
      res,
      {
        requestId,
        response,
        responseDeep: null,
        responseFormat: "plain",
        statusShift: null,
        decisionMode: null,
        sport: "golf",
        intent,
        take: takeClientPayload(fallbackTake),
        fallback: true,
        fallbackReason: "empty_golf_context",
      },
      { gateQuotaEmail, gateQuotaSessionId },
    );
    return { handled: true };
  }

  return { handled: false };
}
