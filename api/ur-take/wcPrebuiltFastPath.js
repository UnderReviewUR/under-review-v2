import { sendUrTakeJson } from "./responseDelivery.js";
import { buildWcTomorrowSlatePrebuiltFromInputs } from "../_wcTomorrowSlatePrebuiltInputs.js";
import { runUnderReviewPostProcess } from "../_urTakeOutputQA.js";
import { runWcUrTakeQA } from "../_wcUrTakeQA.js";
import {
  buildWcGroupSlatePrebuiltStructured,
  buildWcRunnerUpFollowUpPrebuiltStructured,
  buildWcGroupValuePushBackPrebuiltStructured,
  buildWcCrossGroupValuePrebuiltStructured,
  buildWcGroupUpsetScanPrebuiltStructured,
  shouldUseWcCrossGroupValuePrebuilt,
  shouldUseWcGroupUpsetScanPrebuilt,
  shouldUseWcGroupSlatePrebuilt,
} from "../../shared/wcGroupComposition.js";
import {
  buildWcCompactStructured,
  formatWcCompactDisplayText,
  resolveWcQaStructured,
} from "../../shared/wcUrTakeCompactDelivery.js";
import { normalizeWcStructuredForDelivery } from "../../shared/wcUrTakeStructured.js";
import {
  extractWcRunnerUpFromHistory,
  isWcTomorrowOrSlateBetQuestion,
  shouldUseWcGroupValuePushBackPrebuilt,
} from "../../shared/wcTakeRetentionQA.js";
import {
  buildWcSlateDrilldownFollowUpStructured,
  extractLastAssistantSlateStructured,
  isWcSlateDrilldownFollowUp,
} from "../../shared/wcFollowUpExplain.js";
import {
  isGenericWcPlayerPropQuestion,
  isWcFixtureScopedPlayerMarketQuestion,
  isWcPlayerMarketIntent,
} from "../../shared/wcUrTakePlayerMarket.js";
import { detectParlayIntent } from "../../shared/detectParlayIntent.js";
import { WC_INTENT } from "../../shared/wcUrTakeIntent.js";
import { isDuplicateWcStructuredCard } from "../../shared/wcFixtureMatchupPrebuilt.js";

/**
 * Deliver World Cup prebuilt takes without building prompts or calling Anthropic.
 * Returns { handled: true } when a response was sent.
 */
export async function tryDeliverWcPrebuiltFastPath(ctx) {
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
    wcCrossGroupPrebuiltEarly,
    wcGroupUpsetScanPrebuiltEarly,
    wcTomorrowSlatePrebuiltEarly,
    wcFixtureMatchupPrebuiltEarly,
    wcFixtureAltFollowUpPrebuiltEarly,
    wcLiveBetTimingPrebuiltEarly,
    wcLiveInPlayBetsPrebuiltEarly,
    wcLiveMatchWinnerPrebuiltEarly,
    wcRunnerUpFollowUpQuestion,
    isConversationFollowUp,
    normalizedUrTakeHistoryForGate,
    intent,
    gateQuotaEmail,
    gateQuotaSessionId,
    setGateQuotaDelivered,
    extractTakeFromResponse,
    userEmail,
    appendTakeForUser,
  } = ctx;

  if (sportHint !== "worldcup") return { handled: false };

  /** @type {Record<string, unknown> | null} */
  let structuredResponse = null;
  let passKind = null;

  if (isConversationFollowUp && isWcSlateDrilldownFollowUp(routingQuestion, normalizedUrTakeHistoryForGate)) {
    const slatePrior = extractLastAssistantSlateStructured(normalizedUrTakeHistoryForGate);
    const rebuilt = buildWcSlateDrilldownFollowUpStructured(slatePrior);
    if (rebuilt) {
      structuredResponse = rebuilt;
      passKind = "slate_drilldown";
    }
  }

  if (
    !structuredResponse &&
    isConversationFollowUp &&
    shouldUseWcGroupValuePushBackPrebuilt(routingQuestion, normalizedUrTakeHistoryForGate, {
      isConversationFollowUp: true,
    })
  ) {
    const prebuilt = buildWcGroupValuePushBackPrebuiltStructured({
      question: String(question || ""),
      history: normalizedUrTakeHistoryForGate,
      teamStats: wcContext?.tournamentSimResults?.teamStats,
      bdlFutures: wcContext?.bdlFuturesPayload,
    });
    if (prebuilt) {
      structuredResponse = prebuilt;
      passKind = "group_value_pushback";
    }
  } else if (wcRunnerUpFollowUpQuestion) {
    const { group: runnerUpGroup, teamAbbr: runnerUpTeamAbbr } = extractWcRunnerUpFromHistory(
      normalizedUrTakeHistoryForGate,
    );
    if (runnerUpGroup) {
      const prebuilt = buildWcRunnerUpFollowUpPrebuiltStructured({
        groupLetter: runnerUpGroup,
        pickAbbr: runnerUpTeamAbbr,
        teamStats: wcContext?.tournamentSimResults?.teamStats,
        bdlFutures: wcContext?.bdlFuturesPayload,
        question: String(question || ""),
      });
      if (prebuilt) {
        structuredResponse = prebuilt;
        passKind = "runner_up_follow_up";
      }
    }
  } else if (
    !isConversationFollowUp &&
    (wcTomorrowSlatePrebuiltEarly || isWcTomorrowOrSlateBetQuestion(routingQuestion))
  ) {
    structuredResponse =
      wcTomorrowSlatePrebuiltEarly ||
      (await buildWcTomorrowSlatePrebuiltFromInputs({
        question: String(question || ""),
        nowMs: Date.now(),
      }).catch(() => null));
    passKind = "tomorrow_slate";
  } else if (
    !isConversationFollowUp &&
    (wcGroupUpsetScanPrebuiltEarly ||
      shouldUseWcGroupUpsetScanPrebuilt(routingQuestion, wcIntent))
  ) {
    structuredResponse =
      wcGroupUpsetScanPrebuiltEarly ||
      buildWcGroupUpsetScanPrebuiltStructured({
        teamStats: wcContext?.tournamentSimResults?.teamStats,
        bdlFutures: wcContext?.bdlFuturesPayload,
        question: String(question || ""),
        nowMs: Date.now(),
        simLastUpdated: wcContext?.tournamentSimResults?.lastUpdated ?? null,
      });
    passKind = "upset_scan";
  } else if (
    !isConversationFollowUp &&
    (wcCrossGroupPrebuiltEarly ||
      shouldUseWcCrossGroupValuePrebuilt(routingQuestion, wcIntent))
  ) {
    structuredResponse =
      wcCrossGroupPrebuiltEarly ||
      buildWcGroupSlatePrebuiltStructured({
        groupLetter: "D",
        pickAbbr: "PAR",
        pickMarket: "to advance",
      });
    passKind = "cross_group";
  } else if (
    !isConversationFollowUp &&
    shouldUseWcGroupSlatePrebuilt(routingQuestion, wcIntent)
  ) {
    const prebuilt = buildWcGroupSlatePrebuiltStructured({
      groupLetter: "D",
      pickAbbr: "PAR",
      pickMarket: "to advance",
    });
    if (prebuilt) {
      structuredResponse = prebuilt;
      passKind = "group_slate";
    }
  } else if (
    (wcFixtureMatchupPrebuiltEarly ||
      wcFixtureAltFollowUpPrebuiltEarly ||
      wcLiveBetTimingPrebuiltEarly ||
      wcLiveInPlayBetsPrebuiltEarly ||
      wcLiveMatchWinnerPrebuiltEarly) &&
    !isWcPlayerMarketIntent(wcIntent) &&
    wcIntent !== WC_INTENT.PLAYER_PROP &&
    !(isConversationFollowUp && isGenericWcPlayerPropQuestion(routingQuestion)) &&
    !isWcFixtureScopedPlayerMarketQuestion(routingQuestion) &&
    !(detectParlayIntent(routingQuestion) && /\bplayer\b/i.test(routingQuestion))
  ) {
    structuredResponse =
      wcFixtureMatchupPrebuiltEarly ||
      wcFixtureAltFollowUpPrebuiltEarly ||
      wcLiveBetTimingPrebuiltEarly ||
      wcLiveInPlayBetsPrebuiltEarly ||
      wcLiveMatchWinnerPrebuiltEarly;
    passKind = wcLiveBetTimingPrebuiltEarly
      ? "live_bet_timing"
      : wcLiveInPlayBetsPrebuiltEarly
        ? "live_in_play_bets"
        : wcLiveMatchWinnerPrebuiltEarly
          ? "live_match_winner"
          : wcFixtureAltFollowUpPrebuiltEarly
            ? "fixture_alt_follow_up"
            : "fixture_matchup";
  }

  if (!structuredResponse) return { handled: false };

  if (
    isConversationFollowUp &&
    isDuplicateWcStructuredCard(structuredResponse, normalizedUrTakeHistoryForGate)
  ) {
    return { handled: false };
  }

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
      normalizedUrTakeHistoryForGate,
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

  const responseBody = {
    requestId,
    response: responseText,
    responseDeep: null,
    responseFormat: "structured",
    sport: "worldcup",
    intent,
    liveMode:
      passKind === "live_in_play_bets" ||
      passKind === "live_match_winner" ||
      passKind === "live_bet_timing",
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
      mode: "wc_prebuilt_fast_path",
      passKind,
      structuredInPayload: true,
      durationMs: Date.now() - requestStart,
      wcRelevance: wcRelevanceLog,
    }),
  );

  setGateQuotaDelivered(true);
  await sendUrTakeJson(res, responseBody, { gateQuotaEmail, gateQuotaSessionId });
  return { handled: true };
}
