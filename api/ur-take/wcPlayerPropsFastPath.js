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
import { matchPlayerPropRowsFromEvent } from "../../shared/wcMatchPlayerProps.js";
import {
  buildWcThreadParlayStructured,
  shouldBuildWcThreadParlay,
} from "../../shared/wcThreadParlayPrebuilt.js";
import { finalizeWcStructuredThreadState } from "../../shared/wcThreadState.js";

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
) {
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
      lean: "Posted anytime scorer lines are still syncing — tap again in a few seconds.",
      whyNow: `Fixture ${wcMatchupTeamDisplayName(home)} vs ${wcMatchupTeamDisplayName(away)} — waiting for books to publish player markets.`,
      edge: "Lines usually land within a minute after the first moneyline card posts.",
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
  } = ctx;

  if (sportHint !== "worldcup") return { handled: false };

  const history = normalizedUrTakeHistoryForGate || [];
  const routingQ = String(routingQuestion || question || "").trim();
  if (!shouldRunWcPlayerPropsFastPath(wcIntent, routingQ, history, isConversationFollowUp)) {
    return { handled: false };
  }

  const fixtureTeams = resolveWcPlayerPropFixtureTeams(routingQ, history, {
    requiredEntities: wcRequiredEntities,
    conversationHistory: history,
  });
  const historyPair = resolveWcFixturePairFromHistory(history);
  const namedPlayerPropsAsk = isWcNamedPlayerPropQuestion(routingQ);
  if (fixtureTeams.length < 2 && !historyPair?.home && !namedPlayerPropsAsk) {
    return { handled: false };
  }

  const matches = await resolveWcMatchesForPlayerProps(wcContext);
  let wcEventId =
    String(wcContext?.wcEventId || wcRelevanceLog?.wcEventId || historyPair?.eventId || "").trim() ||
    null;
  if (!wcEventId && fixtureTeams.length >= 2) {
    wcEventId = resolveWcEventIdForFixtureTeams(matches, fixtureTeams[0], fixtureTeams[1]);
  }

  const kvBlocks = await loadWcPlayerMarketKvBlocksWithRetry(
    Date.now(),
    {
      wcEventId,
      wcIntent: WC_INTENT.PLAYER_PROP,
      question: routingQ,
      matches,
      conversationHistory: history,
      requiredEntities: fixtureTeams.length >= 2 ? fixtureTeams : wcRequiredEntities,
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
  const pinned = {
    home: fixtureTeams[0] || historyPair?.home || "",
    away: fixtureTeams[1] || historyPair?.away || "",
    eventId: resolvedEventId,
  };

  const syntheticContext = {
    ...(wcContext || {}),
    wcEventId: resolvedEventId,
    conversationHistory: history,
    requiredEntities: fixtureTeams.length >= 2 ? fixtureTeams : wcRequiredEntities,
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
  const propRows = matchPlayerPropRowsFromEvent(kvBlocks.matchPlayerProps, "anytime_scorer", 6);
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
      isGenericWcPlayerPropQuestion(routingQ) ||
      isWcPerTeamPlayerPropsQuestion(routingQ);
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

  structuredResponse = buildWcCompactStructured({
    question: String(question || ""),
    wcIntent,
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
      wcIntent === WC_INTENT.PARLAY ? WC_INTENT.PARLAY : wcIntent,
    );
    structuredResponse = normalizeWcStructuredForDelivery(
      structuredResponse,
      wcIntent === WC_INTENT.PARLAY ? WC_INTENT.PARLAY : wcIntent,
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
