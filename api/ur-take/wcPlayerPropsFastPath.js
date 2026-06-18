import { sendUrTakeJson } from "./responseDelivery.js";
import { runUnderReviewPostProcess } from "../_urTakeOutputQA.js";
import { runWcUrTakeQA } from "../_wcUrTakeQA.js";
import { getMatchesPayload } from "../world-cup.js";
import { loadWcPlayerMarketKvBlocksWithRetry } from "../_wcPlayerUrTakeContext.js";
import {
  buildWcCompactStructured,
  formatWcCompactDisplayText,
  resolveWcQaStructured,
} from "../../shared/wcUrTakeCompactDelivery.js";
import { normalizeWcStructuredForDelivery } from "../../shared/wcUrTakeStructured.js";
import {
  buildWcFixturePlayerParlayStructured,
  buildWcFixturePlayerPropsListStructured,
  buildWcFixtureScorerIntelStructured,
  buildWcNamedPlayerPropsStructured,
  resolveWcPlayerMarketTier,
  tierMetaFor,
  WC_PLAYER_MARKET_TIER,
} from "../../shared/wcPlayerMarketResolve.js";
import {
  finalizeWcPlayerPropStructured,
  isGenericWcPlayerPropQuestion,
  isWcFixtureScopedPlayerMarketQuestion,
  isWcGoalkeeperPropsQuestion,
  isWcNamedPlayerPropQuestion,
  isWcPerTeamPlayerPropsQuestion,
  prefersWcFixtureScorerIntelFallback,
} from "../../shared/wcUrTakePlayerMarket.js";
import { resolveWcFixturePairFromHistory } from "../../shared/wcFixtureMatchupPrebuilt.js";
import {
  resolveWcEventIdForFixtureTeams,
  resolveWcPlayerPropFixtureTeams,
} from "../../shared/wcPlayerPropFixture.js";
import { wcMatchupTeamDisplayName } from "../../shared/wcMatchupWinnerLine.js";
import { detectParlayIntent } from "../../shared/detectParlayIntent.js";
import { detectWcSgpComboIntent } from "../../shared/wcUrTakePhilosophy.js";
import { WC_INTENT, isWcMatchTotalsQuestion } from "../../shared/wcUrTakeIntent.js";
import {
  buildWcPlayerPropExplainStructured,
  isWcPlayerPropFollowUpExplain,
  resolveWcFollowUpSubject,
} from "../../shared/wcFollowUpExplain.js";
import { matchPlayerPropRowsFromEvent, pickFixturePropBoardFromEvent } from "../../shared/wcMatchPlayerProps.js";
import {
  buildWcThreadParlayStructured,
  shouldBuildWcThreadParlay,
} from "../../shared/wcThreadParlayPrebuilt.js";
import { finalizeWcStructuredThreadState } from "../../shared/wcThreadState.js";
import {
  applyWcGroundingCardToStructured,
  buildWcGroundingPacketForUrTake,
} from "../_wcGroundingUrTake.js";
import { countWcMatchPlayerPropMarkets } from "../../shared/wcPropsRouteTurn.js";

/**
 * @param {string} wcIntent
 * @param {string} routingQuestion
 * @param {object[]} history
 * @param {boolean} isConversationFollowUp
 */
export function shouldRunWcPlayerPropsFastPath(
  wcIntent,
  routingQuestion,
  history,
  isConversationFollowUp,
  hasImage = false,
) {
  if (hasImage) return false;
  const q = String(routingQuestion || "").trim();
  if (isWcPlayerPropFollowUpExplain(q, history)) return true;
  if (wcIntent === WC_INTENT.PARLAY) return true;
  if (isWcMatchTotalsQuestion(q)) {
    if (!(detectParlayIntent(q) || detectWcSgpComboIntent(q))) return false;
  }
  if (detectParlayIntent(q) || detectWcSgpComboIntent(q)) {
    const pair = resolveWcFixturePairFromHistory(history);
    if (pair?.home && pair?.away) return true;
    const teams = resolveWcPlayerPropFixtureTeams(q, history, { conversationHistory: history });
    if (teams.length >= 2) return true;
  }
  if (wcIntent === WC_INTENT.PLAYER_PROP) return true;
  if (isWcNamedPlayerPropQuestion(q)) return true;
  if (detectParlayIntent(q) && /\bplayer\b/i.test(q)) return true;
  if (isWcFixtureScopedPlayerMarketQuestion(q)) {
    const teams = resolveWcPlayerPropFixtureTeams(q, history, { conversationHistory: history });
    if (teams.length >= 2) return true;
    const pair = resolveWcFixturePairFromHistory(history);
    return Boolean(pair?.home && pair?.away);
  }
  return false;
}

/**
 * @param {object | null | undefined} wcContext
 */
async function resolveWcMatchesForPlayerProps(wcContext) {
  if (Array.isArray(wcContext?.allMatches) && wcContext.allMatches.length) {
    return wcContext.allMatches;
  }
  try {
    const payload = await getMatchesPayload();
    return payload?.matches || [];
  } catch {
    return [];
  }
}

/**
 * @param {string} question
 * @param {{ home: string, away: string, eventId?: string | null }} pinned
 * @param {string | null | undefined} wcEventId
 */
function buildWcPlayerPropsLoadingStructured(question, pinned, wcEventId) {
  const home = String(pinned.home || "").toUpperCase();
  const away = String(pinned.away || "").toUpperCase();
  return finalizeWcPlayerPropStructured(
    {
      sport: "worldcup",
      callType: "player_market_odds",
      playerMarketTier: WC_PLAYER_MARKET_TIER.MARKET_ONLY,
      wcEventId: wcEventId || undefined,
      fixtureHome: home,
      fixtureAway: away,
      call: "Match player props — lines loading",
      lean: "Player lines are still syncing — tap again in a few seconds or check back closer to kickoff.",
      whyNow: `Fixture ${wcMatchupTeamDisplayName(home)} vs ${wcMatchupTeamDisplayName(away)} — waiting for books to publish player markets.`,
      edge: "Books usually post 30–60 minutes before kickoff. Try a team or group angle while you wait.",
      confidence: "Speculative",
      analysis: String(question || "").trim(),
    },
    question,
  );
}

/**
 * Highest-priority World Cup player-prop delivery — retries KV on cold starts and never
 * falls through to fixture totals prebuilt (Under 2.5 repeat).
 * Returns { handled: true } when a response was sent.
 */
export async function tryDeliverWcPlayerPropsFastPath(ctx) {
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
    isConversationFollowUp,
    normalizedUrTakeHistoryForGate,
    intent,
    gateQuotaEmail,
    gateQuotaSessionId,
    setGateQuotaDelivered,
    extractTakeFromResponse,
    userEmail,
    appendTakeForUser,
    hasImage = false,
  } = ctx;

  if (sportHint !== "worldcup") return { handled: false };

  const history = normalizedUrTakeHistoryForGate || [];
  const routingQ = String(routingQuestion || question || "").trim();
  const wcPropsRoute = wcContext?.wcPropsRoute || null;

  if (wcPropsRoute?.applyRoute) {
    // V2 unified route — proceed even when legacy fixture resolvers return [].
  } else if (
    !shouldRunWcPlayerPropsFastPath(wcIntent, routingQ, history, isConversationFollowUp, hasImage)
  ) {
    return { handled: false };
  }

  const fixtureTeams = resolveWcPlayerPropFixtureTeams(routingQ, history, {
    requiredEntities: wcRequiredEntities,
    conversationHistory: history,
  });
  const historyPair = resolveWcFixturePairFromHistory(history);
  const namedPlayerPropsAsk = isWcNamedPlayerPropQuestion(routingQ);
  if (
    !wcPropsRoute?.applyRoute &&
    fixtureTeams.length < 2 &&
    !historyPair?.home &&
    !namedPlayerPropsAsk
  ) {
    return { handled: false };
  }

  const matches = await resolveWcMatchesForPlayerProps(wcContext);
  let wcEventId =
    String(
      wcPropsRoute?.wcEventId ||
        wcContext?.wcEventId ||
        wcRelevanceLog?.wcEventId ||
        historyPair?.eventId ||
        "",
    ).trim() || null;
  if (!wcEventId && fixtureTeams.length >= 2) {
    wcEventId = resolveWcEventIdForFixtureTeams(matches, fixtureTeams[0], fixtureTeams[1]);
  }
  if (!wcEventId && historyPair?.home && historyPair?.away) {
    wcEventId = resolveWcEventIdForFixtureTeams(matches, historyPair.home, historyPair.away);
  }

  wcRelevanceLog.wcPropsLoadMatchProps = Boolean(wcPropsRoute?.loadMatchProps);
  if (wcPropsRoute?.applyRoute) {
    wcRelevanceLog.wcPropsKvLoadAttempted = true;
  }

  const kvRequiredEntities = wcPropsRoute?.applyRoute
    ? [wcPropsRoute.fixtureHome, wcPropsRoute.fixtureAway].filter(Boolean)
    : fixtureTeams.length >= 2
      ? fixtureTeams
      : wcRequiredEntities;

  const kvBlocks = await loadWcPlayerMarketKvBlocksWithRetry(
    Date.now(),
    {
      wcEventId,
      wcIntent: WC_INTENT.PLAYER_PROP,
      question: routingQ,
      matches,
      conversationHistory: history,
      requiredEntities: kvRequiredEntities,
    },
    { maxRetries: 2, backoffMs: 400 },
  );

  const loadMeta = kvBlocks.loadMeta || {
    attempts: 1,
    coldStart: false,
    fromCache: false,
    loadMs: 0,
    failed: false,
  };
  const resolvedEventId = String(kvBlocks.wcEventId || wcEventId || "").trim() || null;
  wcRelevanceLog.wcPropsMarketTypesLoaded = countWcMatchPlayerPropMarkets(
    kvBlocks.matchPlayerProps,
  );
  const pinned = {
    home:
      wcPropsRoute?.fixtureHome ||
      fixtureTeams[0] ||
      historyPair?.home ||
      "",
    away:
      wcPropsRoute?.fixtureAway ||
      fixtureTeams[1] ||
      historyPair?.away ||
      "",
    eventId: resolvedEventId,
  };

  const wcGroundingPacket = buildWcGroundingPacketForUrTake({
    requestId,
    question: String(question || ""),
    routingQuestion: routingQ,
    history,
    matches,
    fixtureTeams: [pinned.home, pinned.away].filter(Boolean),
    resolvedEventId,
    matchPlayerProps: kvBlocks.matchPlayerProps,
    loadMeta,
    hasImage,
  });

  const routePinnedTeams =
    wcPropsRoute?.applyRoute && wcPropsRoute.fixtureHome && wcPropsRoute.fixtureAway
      ? [String(wcPropsRoute.fixtureHome).toUpperCase(), String(wcPropsRoute.fixtureAway).toUpperCase()]
      : [];

  const syntheticContext = {
    ...(wcContext || {}),
    wcEventId: resolvedEventId,
    conversationHistory: history,
    requiredEntities:
      routePinnedTeams.length >= 2
        ? routePinnedTeams
        : fixtureTeams.length >= 2
          ? fixtureTeams
          : wcRequiredEntities,
    playerMarketKv: kvBlocks,
  };

  const tier = resolveWcPlayerMarketTier({
    goldenBoot: kvBlocks.goldenBoot,
    players: kvBlocks.players,
    injuries: kvBlocks.injuries,
    matchPlayerProps: kvBlocks.matchPlayerProps,
    wcEventId: resolvedEventId,
    wcContext: syntheticContext,
    wcIntent: WC_INTENT.PLAYER_PROP,
  });

  const gkPropsAsk = isWcGoalkeeperPropsQuestion(routingQ);
  const propBoard = pickFixturePropBoardFromEvent(kvBlocks.matchPlayerProps, 24);
  const propRows = propBoard?.rows || [];
  let structuredResponse = null;
  let passKind = "player_props_loading";

  if (isWcPlayerPropFollowUpExplain(routingQ, history)) {
    const subject = resolveWcFollowUpSubject(history, routingQ);
    structuredResponse = buildWcPlayerPropExplainStructured({
      question: routingQ,
      history,
      subject,
      tier,
      kvBlocks,
      wcContext: syntheticContext,
    });
    if (structuredResponse) {
      passKind = "player_prop_explain";
    }
  }

  if (!structuredResponse && (propRows.length >= 2 || gkPropsAsk)) {
    if (shouldBuildWcThreadParlay(routingQ, history, wcIntent)) {
      structuredResponse = buildWcThreadParlayStructured(
        String(question || ""),
        history,
        tier,
        kvBlocks,
        syntheticContext,
      );
      passKind = "thread_parlay";
    } else if (detectParlayIntent(routingQ) || detectWcSgpComboIntent(routingQ)) {
      structuredResponse = buildWcFixturePlayerParlayStructured(
        String(question || ""),
        tier,
        kvBlocks,
        syntheticContext,
      );
      passKind = "player_props_parlay";
    } else {
      structuredResponse = buildWcFixturePlayerPropsListStructured(
        String(question || ""),
        tier,
        kvBlocks,
        syntheticContext,
      );
      passKind = "player_props_list";
    }
  }

  if (!structuredResponse && prefersWcFixtureScorerIntelFallback(routingQ)) {
    structuredResponse = buildWcFixtureScorerIntelStructured(
      String(question || ""),
      tier,
      kvBlocks,
      syntheticContext,
    );
    if (structuredResponse) {
      passKind = "player_props_intel";
    }
  }

  if (!structuredResponse && namedPlayerPropsAsk) {
    structuredResponse = buildWcNamedPlayerPropsStructured(
      String(question || ""),
      tier,
      kvBlocks,
      syntheticContext,
    );
    if (structuredResponse) {
      passKind = "named_player_props";
    }
  }

  if (!structuredResponse) {
    const hasEvent = Boolean(resolvedEventId);
    const genericPropsAsk =
      wcPropsRoute?.applyRoute ||
      isGenericWcPlayerPropQuestion(routingQ) ||
      isWcPerTeamPlayerPropsQuestion(routingQ) ||
      (detectParlayIntent(routingQ) && /\bplayers?\s+props?\b/i.test(routingQ));
    if (hasEvent && (genericPropsAsk || namedPlayerPropsAsk || !loadMeta.failed)) {
      structuredResponse = buildWcPlayerPropsLoadingStructured(
        String(question || ""),
        pinned,
        resolvedEventId,
      );
      passKind = "player_props_loading";
    } else if ((!hasEvent && !namedPlayerPropsAsk) || (loadMeta.failed && !namedPlayerPropsAsk)) {
      return { handled: false };
    }
  }

  structuredResponse = finalizeWcPlayerPropStructured(structuredResponse, String(question || ""));

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
      playerMarketTier: tier,
      structuredSeed: structuredResponse,
    }),
    question: String(question || ""),
    wcIntent,
    requiredEntities: wcRequiredEntities,
    forbiddenEntities: wcForbiddenEntities,
    strengthTags: wcStrengthTags,
    playerMarketKv: kvBlocks,
    roundupPlayerKv: wcContext?.roundupPlayerKv,
    playerMarketTier: tier,
    matchDetails: wcContext?.matchDetails,
    outrightsAvailable: Boolean(wcContext?.outrightsKv),
    teamStats: wcContext?.tournamentSimResults?.teamStats || null,
  });
  wcRelevanceLog.qaEntityMatch = wcQa.qaEntityMatch;
  wcRelevanceLog.qaIntentMatch = wcQa.qaIntentMatch;
  wcRelevanceLog.qaPlayerMatch = wcQa.qaPlayerMatch;
  wcRelevanceLog.playerMarketTier = tier;
  wcRelevanceLog.wcEventId = resolvedEventId;

  const v2PlayerPropsDelivered =
    wcPropsRoute?.applyRoute &&
    passKind !== "player_props_loading" &&
    passKind !== "player_prop_explain";
  const deliveryIntent = v2PlayerPropsDelivered ? WC_INTENT.PLAYER_PROP : wcIntent;

  structuredResponse = buildWcCompactStructured({
    question: String(question || ""),
    wcIntent: deliveryIntent,
    summary: responseText,
    deep: null,
    playerMarketTier: tier,
    structuredSeed: structuredResponse,
    history,
  });
  if (passKind === "player_prop_explain" && structuredResponse && typeof structuredResponse === "object") {
    structuredResponse.breakdownDefaultExpanded = true;
    structuredResponse.breakdownAvailable = true;
  }
  if (structuredResponse && typeof structuredResponse === "object") {
    structuredResponse = finalizeWcStructuredThreadState(
      structuredResponse,
      history,
      deliveryIntent,
    );
    structuredResponse = normalizeWcStructuredForDelivery(
      structuredResponse,
      deliveryIntent,
      String(question || ""),
      routePinnedTeams.length >= 2 ? routePinnedTeams : wcRequiredEntities,
    );
    structuredResponse = applyWcGroundingCardToStructured(
      structuredResponse,
      wcGroundingPacket,
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
    liveMode: false,
    take: {
      id: takeRecord.id,
      playLine: takeRecord.playLine,
      confidence: takeRecord.confidence,
      status: takeRecord.status,
    },
    structured: structuredResponse,
    wcIntent,
    userQuestion: String(question || "").trim(),
    wcEventId: resolvedEventId,
    callType: structuredResponse?.callType || tierMetaFor(tier).callType,
    coldStart: Boolean(loadMeta.coldStart),
    playerPropsLoadMeta: loadMeta,
    qaSummary: {
      score: wcQa.score,
      issueCodes: wcQa.issueCodes,
      passedCriticalGates: wcQa.passed,
      regenerationAttempts: 0,
      qaFallbackApplied: false,
    },
    ...(wcContext?.dataConfidence ? { dataConfidence: wcContext.dataConfidence } : {}),
    playerMarketTier: tier,
    wcGroundingPacketVersion: wcGroundingPacket?.version || null,
    ...(wcPropsRoute?.applyRoute ? { wcRelevance: wcRelevanceLog } : {}),
  };

  console.log(
    JSON.stringify({
      requestId,
      event: "ur_take_complete",
      sport: "worldcup",
      mode: "wc_player_props_fast_path",
      passKind,
      wcEventId: resolvedEventId,
      coldStart: loadMeta.coldStart,
      attempts: loadMeta.attempts,
      loadMs: loadMeta.loadMs,
      propRows: propRows.length,
      structuredInPayload: true,
      durationMs: Date.now() - requestStart,
      wcRelevance: wcRelevanceLog,
    }),
  );

  setGateQuotaDelivered(true);
  await sendUrTakeJson(res, responseBody, { gateQuotaEmail, gateQuotaSessionId });
  return { handled: true };
}
