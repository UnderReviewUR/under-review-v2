/**
 * WC UR Take — unified turn planner (single source of truth for routing).
 *
 * All new WC routing decisions should be expressed here via lanes + dataPackages.
 * Legacy classifiers remain the implementation detail; this module orchestrates them
 * in a fixed priority order and returns one definitive plan per turn.
 *
 * Decision order (high → low priority):
 *   1. Normalize question + detect follow-up + extract prior structured lean
 *   2. Pin fixture (explicit event id → question teams → thread stack)
 *   3. Resolve intent (follow-up overrides → planner MATCHUP fixes → legacy classifier)
 *   4. Early exits: RULES, entity-pricing/structural LLM, group-slate prebuilts, runner-up follow-up
 *   5. Player props lane (V2 route + shape → fast vs Claude)
 *   6. Live prebuilt lanes (in-play bets → bet timing → live match winner)
 *   7. Matchup prebuilt lanes (alt follow-up → ML repeat → opening fixture)
 *   8. Player-market structured pass/build (deterministic, no Claude)
 *   9. LLM fallback (thread-aware full context vs legacy lite)
 */

import { extractLatestUserTurnForRouting } from "./urTakeSportRouting.js";
import { resolveUrTakeConversationFollowUp } from "./urTakeFollowUpDetection.js";
import {
  classifyWcQuestionIntent,
  isWcMatchTotalsQuestion,
  isWcPlayerMarketIntent,
  WC_INTENT,
} from "./wcUrTakeIntent.js";
import { classifyWcFollowUpIntent } from "./wcFollowUpExplain.js";
import {
  isWcFixtureScopedPlayerMarketQuestion,
  isWcNamedPlayerPropQuestion,
} from "./wcUrTakePlayerMarket.js";
import { detectParlayIntent } from "./detectParlayIntent.js";
import { detectWcSgpComboIntent } from "./wcUrTakePhilosophy.js";
import {
  isWcMatchupAltMarketFollowUp,
  isWcMatchupOtherSideFollowUp,
  isWcTotalsExplainFollowUp,
} from "./wcMatchBettingPrompt.js";
import {
  isWcPlayerPropFollowUpExplain,
  resolveWcFollowUpSubject,
  shouldBlockMatchupAltPrebuiltAfterPlayerPivot,
} from "./wcFollowUpExplain.js";
import {
  isWcLiveBetsQuestion,
  isWcLiveBetTimingQuestion,
  isWcLiveDominanceQuestion,
  WC_LIVE_ANGLE_ASK_RE,
} from "./wcLiveMatchQuestion.js";
import { isWcMatchProbabilityQuestion } from "./wcMatchProbabilityQuestion.js";
import {
  isWcRunnerUpValueFollowUp,
  isWcTomorrowOrSlateBetQuestion,
} from "./wcTakeRetentionQA.js";
import {
  shouldUseWcCrossGroupValuePrebuilt,
  shouldUseWcGroupUpsetScanPrebuilt,
  shouldUseWcGroupSlatePrebuilt,
} from "./wcGroupComposition.js";
import {
  shouldUseWcFixtureMatchupAltFollowUpPrebuilt,
  shouldUseWcFixtureMatchupMoneylineRepeatPrebuilt,
  shouldUseWcFixtureMatchupPrebuilt,
  shouldUseWcLiveBetTimingPrebuilt,
  shouldUseWcLiveInPlayBetsPrebuilt,
  shouldUseWcLiveMatchWinnerPrebuilt,
  resolveWcFixturePairFromHistory,
} from "./wcFixtureMatchupPrebuilt.js";
import { previewWcPropsRoute, needsWcPropsRouting } from "./wcPropsRoutePreview.js";
import { isWcPropsRouteV2Enabled } from "./wcPropsRouteTurn.js";
import {
  shouldSkipWcPlayerPropsFastPathForShape,
  isWcPropsShapeRoutedAsk,
} from "./wcGroundingShapeRoute.js";
import { resolveWcThreadFixtureContext } from "./wcThreadFixtureContext.js";
import { extractMentionedWcTeams } from "./wcUrTakeKeywords.js";
import { isWcGoatPrimaryEnabled } from "./wcBdlPolicy.js";
import { WC_TURN_LANE, WC_DATA_PACKAGE, WC_TURN_FAST_PATH_LANES } from "./wcTurnConstants.js";
import {
  isWcConditionalMatchupFollowUp,
  priorLaneHintFromStructured,
  isWcGenericPlayerPropsThreadFollowUp,
  extractWcPriorThreadLeanFromHistory,
  isWcThreadAnchoredFollowUp,
  resolveWcTurnIntent,
  resolveWcTurnUseLiteContext,
} from "./wcTurnIntent.js";

export { WC_TURN_LANE, WC_DATA_PACKAGE } from "./wcTurnConstants.js";
export {
  isWcConditionalMatchupFollowUp,
  isWcGenericPlayerPropsThreadFollowUp,
  isWcPriorPrebuiltThreadLean,
  isWcPrebuiltLeanProse,
  isWcThreadAnchoredFollowUp,
  isWcVaguePlayerPropsThreadAsk,
  extractWcPriorThreadLeanFromHistory,
  priorLaneHintFromStructured,
  resolveWcTurnIntent,
  resolveWcTurnUseLiteContext,
} from "./wcTurnIntent.js";
export {
  buildWcStructuredForPlan,
  shouldActivateWcPrebuiltLane,
  shouldActivateWcFixturePrebuiltBlock,
  shouldActivateWcPropsFastPath,
  shouldRunLegacyWcPrebuiltGuards,
  isWcPlannerDrivingDelivery,
  wcPlannerDeliveryLane,
  buildWcThreadAwarePassFallback,
  buildWcThreadAwareNoPropsFallback,
  buildWcThreadContinuationFallback,
  buildWcThreadPassPolicyPromptBlock,
  isGenericWcPassLean,
  applyWcThreadPriorLeanPassRewrite,
  wcTurnUsesThreadPassPolicy,
  buildWcGenericPropsFollowUpPromptBlock,
  extractWcPriorLiveScoreSnippet,
  applyWcLlmThreadPriorLeanToContext,
  applyWcLlmThreadPriorLeanToGroundingPacket,
  buildWcPriorLeanPromptBlock,
  wcTurnLaneToPassKind,
} from "./wcTurnDelivery.js";

/** @typedef {import("./wcTurnConstants.js").WcTurnPlan} WcTurnPlan */
/** @typedef {import("./wcUrTakeIntent.js").WcUrTakeIntent} WcUrTakeIntent */

const FAST_PATH_LANES = WC_TURN_FAST_PATH_LANES;

/**
 * Feature flag — default OFF. Enable with WC_TURN_PLANNER=1 or header x-wc-turn-planner: 1.
 * @param {{ plannerHeader?: string }} [opts]
 */
export function isWcTurnPlannerEnabled(opts = {}) {
  const header = String(opts.plannerHeader ?? "").trim();
  if (header === "0") return false;
  if (header === "1") return true;
  const envFlag = String(process.env.WC_TURN_PLANNER ?? "").trim().toLowerCase();
  if (envFlag === "0" || envFlag === "false" || envFlag === "no") return false;
  if (envFlag === "1" || envFlag === "true" || envFlag === "yes") return true;
  return false;
}

/**
 * @param {object} params
 */
function buildBaseDataPackages(params) {
  /** @type {string[]} */
  const packs = [WC_DATA_PACKAGE.MATCHES];
  if (params.priorLean) packs.push(WC_DATA_PACKAGE.PRIOR_STRUCTURED);
  if (params.pinnedEventId) {
    packs.push(WC_DATA_PACKAGE.MATCH_DETAIL, WC_DATA_PACKAGE.FIXTURE_ODDS);
  }
  if (params.intent === WC_INTENT.RULES) {
    packs.push(WC_DATA_PACKAGE.STATIC_RULES);
    return packs;
  }
  if (isWcPlayerMarketIntent(params.intent) || params.needsPropsKv) {
    packs.push(WC_DATA_PACKAGE.PLAYER_PROPS_KV);
  }
  if (params.lane === WC_TURN_LANE.PROPS_CLAUDE || params.propsShapeRouted) {
    packs.push(WC_DATA_PACKAGE.GROUNDING_PACKET);
  }
  if (
    params.lane === WC_TURN_LANE.LIVE_IN_PLAY ||
    params.lane === WC_TURN_LANE.LIVE_BET_TIMING ||
    params.lane === WC_TURN_LANE.LIVE_MATCH_WINNER
  ) {
    packs.push(WC_DATA_PACKAGE.LIVE_INTEL, WC_DATA_PACKAGE.PLAYER_PROPS_KV);
  }
  if (
    params.lane === WC_TURN_LANE.MATCHUP_PREBUILT ||
    params.lane === WC_TURN_LANE.MATCHUP_ALT_FOLLOWUP ||
    params.lane === WC_TURN_LANE.MATCHUP_ML_REPEAT
  ) {
    packs.push(WC_DATA_PACKAGE.TOURNAMENT_SIM);
  }
  if (params.intent === WC_INTENT.ENTITY_PRICING || params.intent === WC_INTENT.STRUCTURAL) {
    packs.push(WC_DATA_PACKAGE.TOURNAMENT_SIM, WC_DATA_PACKAGE.GROUP_MISPRICE, WC_DATA_PACKAGE.BDL_FUTURES);
  }
  if (
    params.intent === WC_INTENT.GOLDEN_BOOT ||
    params.intent === WC_INTENT.TOP_SCORER ||
    params.intent === WC_INTENT.TOP_GOALSCORERS_LIST
  ) {
    packs.push(WC_DATA_PACKAGE.GOLDEN_BOOT);
  }
  if (params.lane === WC_TURN_LANE.LLM_FULL || params.lane === WC_TURN_LANE.LLM_THREAD) {
    if (!packs.includes(WC_DATA_PACKAGE.TOURNAMENT_SIM)) {
      packs.push(WC_DATA_PACKAGE.TOURNAMENT_SIM);
    }
  }
  return [...new Set(packs)];
}

/**
 * @param {string} lane
 * @param {WcUrTakeIntent} intent
 * @param {boolean} hasKvFixture
 */
function resolveTurnConfidence(lane, intent, hasKvFixture) {
  if (intent === WC_INTENT.RULES) return /** @type {const} */ ("High");
  if (FAST_PATH_LANES.has(lane) && hasKvFixture) return /** @type {const} */ ("Medium");
  if (lane === WC_TURN_LANE.LLM_LITE) return /** @type {const} */ ("Speculative");
  if (isWcPlayerMarketIntent(intent)) return /** @type {const} */ ("Speculative");
  return /** @type {const} */ ("Medium");
}

/** Lanes that must never set shouldUseFastPath=true. */
const WC_LLM_LANES = new Set([
  WC_TURN_LANE.RULES_LLM,
  WC_TURN_LANE.LLM_FULL,
  WC_TURN_LANE.LLM_THREAD,
  WC_TURN_LANE.LLM_LITE,
  WC_TURN_LANE.PROPS_CLAUDE,
]);

/**
 * Dev-only guard — catches planner regressions where lane and shouldUseFastPath disagree.
 * @param {import("./wcTurnConstants.js").WcTurnPlan} plan
 */
export function assertWcTurnPlanFastPathConsistency(plan) {
  if (process.env.NODE_ENV === "production") return;
  const lane = String(plan?.lane || "");
  const fast = Boolean(plan?.shouldUseFastPath);
  if (WC_TURN_FAST_PATH_LANES.has(lane) && !fast) {
    throw new Error(
      `[wcTurnPlanner] lane "${lane}" is a fast-path lane but shouldUseFastPath=false (reason=${plan?.reason})`,
    );
  }
  if (WC_LLM_LANES.has(lane) && fast) {
    throw new Error(
      `[wcTurnPlanner] lane "${lane}" is an LLM lane but shouldUseFastPath=true (reason=${plan?.reason})`,
    );
  }
}

/**
 * @param {import("./wcTurnConstants.js").WcTurnPlan} plan
 * @returns {import("./wcTurnConstants.js").WcTurnPlan}
 */
function finalizeWcTurnPlan(plan) {
  assertWcTurnPlanFastPathConsistency(plan);
  return plan;
}

/**
 * @param {object} params
 * @returns {WcTurnPlan}
 */
export function resolveWcTurnPlan(params = {}) {
  /*
   * LANE PRIORITY (first match wins — high → low):
   *
   *  1. rules_llm              — knockout / tournament rules (LLM, no fast path)
   *  2. entity_pricing exit    — misprice/structural → llm_full (never prebuilt)
   *  3. group_slate            — tomorrow / upset scan / cross-group prebuilts
   *  4. runner_up_followup     — pushback on runner-up value card
   *  4d. generic_props_after_prebuilt — vague props ask on prebuilt thread → llm_thread
   *  5. props_claude | props_fast — player props (Claude when shape-routed)
   *  6. live_in_play           — live angle / in-play bets prebuilt
   *  7. live_bet_timing        — when-to-bet live follow-up
   *  8. live_match_winner      — live who-wins prebuilt
   *  9. matchup_alt_followup   — other side / totals / conditional alt markets
   * 10. matchup_ml_repeat      — repeat ML ask on same fixture thread
   * 11. matchup_prebuilt       — opening fixture ML / totals prebuilt
   * 12. llm_thread | llm_lite | llm_full — Claude fallback (thread when prior lean)
   *
   * Fast-path lanes (shouldUseFastPath=true): group_slate, runner_up_followup,
   *   props_fast, live_*, matchup_* , player_market_structured.
   * LLM lanes (shouldUseFastPath=false): rules_llm, llm_*, props_claude.
   */
  const questionRaw = String(params.fullQuestion || params.question || "").trim();
  const question = extractLatestUserTurnForRouting(String(params.question || questionRaw));
  const history = Array.isArray(params.history) ? params.history : [];
  const matches = Array.isArray(params.matches) ? params.matches : [];
  const hasImage = Boolean(params.hasImage);
  const incomingWcEventId =
    params.incomingWcEventId != null && String(params.incomingWcEventId).trim()
      ? String(params.incomingWcEventId).trim()
      : null;
  const match =
    params.match && typeof params.match === "object" ? params.match : null;
  const hasKvFixture = Boolean(params.hasKvFixture || match || incomingWcEventId);
  const mentionedTeams = Array.isArray(params.mentionedTeams)
    ? params.mentionedTeams.map((t) => String(t).toUpperCase())
    : extractMentionedWcTeams(question);
  const wcRunnerUpFollowUpQuestion = Boolean(
    params.wcRunnerUpFollowUpQuestion ??
      (isWcRunnerUpValueFollowUp(question) ||
        isWcRunnerUpValueFollowUp(questionRaw)),
  );

  const followUpMeta = params.isConversationFollowUp != null
    ? { isFollowUp: Boolean(params.isConversationFollowUp), reason: "caller" }
    : resolveUrTakeConversationFollowUp(questionRaw || question, history);
  const isConversationFollowUp = followUpMeta.isFollowUp;

  const priorLean = extractWcPriorThreadLeanFromHistory(history);
  const priorLaneHint = priorLaneHintFromStructured(priorLean);
  const historyPair = resolveWcFixturePairFromHistory(history);

  const threadFixture = resolveWcThreadFixtureContext({
    question,
    history,
    matches,
    incomingWcEventId,
  });

  const pinnedEventId =
    threadFixture.pinned?.eventId ||
    incomingWcEventId ||
    historyPair?.eventId ||
    null;
  const pinnedHome = threadFixture.pinned?.home || historyPair?.home || null;
  const pinnedAway = threadFixture.pinned?.away || historyPair?.away || null;
  const pinMethod = threadFixture.pinned?.pinMethod || (historyPair ? "history_pair" : "unresolved");

  const threadAnchoredFollowUp = isWcThreadAnchoredFollowUp({
    isConversationFollowUp,
    priorLean,
    pinnedEventId,
    pinnedHome,
    pinnedAway,
    history,
  });

  const intent = resolveWcTurnIntent(question, history, isConversationFollowUp, priorLean);

  const propsPreview = previewWcPropsRoute({
    question,
    history,
    matches,
    hasImage,
    incomingWcEventId: pinnedEventId,
  });
  const propsRouteV2Apply =
    isWcPropsRouteV2Enabled({ routeHeader: params.routeHeader }) &&
    propsPreview.needsRouting &&
    propsPreview.fetchAttempted &&
    Boolean(propsPreview.pinnedEventId) &&
    !propsPreview.fetchBlockedAmbiguous;

  const prebuiltCommon = {
    isConversationFollowUp,
    wcRunnerUpFollowUpQuestion,
    mentionedTeams,
    wcEventId: pinnedEventId,
    hasKvFixture,
    history,
    match,
  };

  /** @type {WcTurnPlan} */
  let plan = {
    lane: WC_TURN_LANE.LLM_FULL,
    intent,
    pinnedEventId,
    pinnedHome,
    pinnedAway,
    pinMethod,
    priorLean,
    dataPackages: [],
    shouldUseFastPath: false,
    useLiteContext: false,
    confidence: "Medium",
    reason: "default_llm_full",
    isConversationFollowUp,
    propsAskShape: propsPreview.askShape,
    propsRouteV2Apply,
    priorLaneHint,
  };

  // ── Step 4: RULES ─────────────────────────────────────────────────────────
  if (intent === WC_INTENT.RULES) {
    plan.lane = WC_TURN_LANE.RULES_LLM;
    plan.reason = "rules_intent";
    plan.dataPackages = buildBaseDataPackages({ ...plan, lane: plan.lane, intent });
    plan.useLiteContext = resolveWcTurnUseLiteContext(plan);
    plan.confidence = resolveTurnConfidence(plan.lane, intent, hasKvFixture);
    return finalizeWcTurnPlan(plan);
  }

  // ── Step 4a: Entity pricing / structural — always LLM, never live/matchup prebuilts ──
  // Misprice asks on a live fixture must not fall through to live_match_winner prebuilt.
  // Thread totals/tactical follow-ups stay on matchup routing — not entity-pricing LLM.
  const threadTotalsFollowUp =
    isConversationFollowUp &&
    priorLean &&
    (isWcMatchupAltMarketFollowUp(question) || isWcTotalsExplainFollowUp(question));
  if (
    (intent === WC_INTENT.ENTITY_PRICING || intent === WC_INTENT.STRUCTURAL) &&
    !threadTotalsFollowUp
  ) {
    plan.lane = WC_TURN_LANE.LLM_FULL;
    plan.reason =
      intent === WC_INTENT.ENTITY_PRICING ? "entity_pricing_llm" : "structural_llm";
    plan.shouldUseFastPath = false;
    plan.useLiteContext = false;
    plan.dataPackages = buildBaseDataPackages({ ...plan, lane: plan.lane, intent });
    plan.confidence = resolveTurnConfidence(plan.lane, intent, hasKvFixture);
    return finalizeWcTurnPlan(plan);
  }

  // ── Step 4b: Group slate prebuilts (opening turns) ───────────────────────
  if (
    !wcRunnerUpFollowUpQuestion &&
    !isConversationFollowUp &&
    !isWcPlayerMarketIntent(intent) &&
    (isWcTomorrowOrSlateBetQuestion(question) ||
      shouldUseWcGroupUpsetScanPrebuilt(question, intent) ||
      shouldUseWcCrossGroupValuePrebuilt(question, intent) ||
      shouldUseWcGroupSlatePrebuilt(question, intent))
  ) {
    plan.lane = WC_TURN_LANE.GROUP_SLATE;
    plan.reason = isWcTomorrowOrSlateBetQuestion(question)
      ? "tomorrow_slate_question"
      : shouldUseWcGroupUpsetScanPrebuilt(question, intent)
        ? "group_upset_scan"
        : "group_slate_prebuilt";
    plan.shouldUseFastPath = true;
    plan.dataPackages = buildBaseDataPackages({
      ...plan,
      lane: plan.lane,
      intent,
      needsPropsKv: false,
    });
    plan.useLiteContext = false;
    plan.confidence = resolveTurnConfidence(plan.lane, intent, hasKvFixture);
    return finalizeWcTurnPlan(plan);
  }

  // ── Step 4c: Runner-up pushback follow-up ────────────────────────────────
  if (wcRunnerUpFollowUpQuestion && isConversationFollowUp) {
    plan.lane = WC_TURN_LANE.RUNNER_UP_FOLLOWUP;
    plan.reason = "runner_up_value_follow_up";
    plan.shouldUseFastPath = true;
    plan.dataPackages = buildBaseDataPackages({
      ...plan,
      lane: plan.lane,
      intent,
      needsPropsKv: false,
    });
    plan.useLiteContext = false;
    plan.confidence = resolveTurnConfidence(plan.lane, intent, hasKvFixture);
    return finalizeWcTurnPlan(plan);
  }

  // ── Step 4d: Generic props follow-up after prebuilt lean — thread continuity ──
  // "any player props?" on a live/matchup card thread should not cold-start props_fast
  // when books have no lines; defer to LLM with priorLean injected.
  if (
    threadAnchoredFollowUp &&
    priorLean &&
    isWcGenericPlayerPropsThreadFollowUp(question, history, priorLean)
  ) {
    plan.lane = WC_TURN_LANE.LLM_THREAD;
    plan.reason = "generic_props_followup_after_prebuilt";
    plan.intent = WC_INTENT.MATCHUP;
    plan.shouldUseFastPath = false;
    plan.useLiteContext = false;
    plan.dataPackages = buildBaseDataPackages({ ...plan, lane: plan.lane, intent: plan.intent });
    plan.confidence = resolveTurnConfidence(plan.lane, plan.intent, hasKvFixture);
    return finalizeWcTurnPlan(plan);
  }

  // ── Step 5: Player props ──────────────────────────────────────────────────
  const propsShapeRouted = isWcPropsShapeRoutedAsk({
    sportHint: "worldcup",
    wcIntent: intent,
    routingQuestion: question,
    hasImage,
    history,
  });
  let skipPropsFastForShape = shouldSkipWcPlayerPropsFastPathForShape(propsPreview.askShape);
  // Pinned fixture + fixture_board is still deterministic props KV — not Claude-only.
  if (skipPropsFastForShape && propsPreview.askShape === "fixture_board" && pinnedEventId) {
    skipPropsFastForShape = false;
  }
  const genericPropsThreadFollowUp =
    priorLean && isWcGenericPlayerPropsThreadFollowUp(question, history, priorLean);
  const playerPropsEligible =
    !genericPropsThreadFollowUp &&
    (isWcPlayerMarketIntent(intent) ||
      isWcFixtureScopedPlayerMarketQuestion(question) ||
      (detectParlayIntent(question) && /\bplayer\b/i.test(question)) ||
      isWcNamedPlayerPropQuestion(question) ||
      isWcPlayerPropFollowUpExplain(question, history) ||
      propsRouteV2Apply);

  if (playerPropsEligible) {
    if (skipPropsFastForShape) {
      plan.lane = WC_TURN_LANE.PROPS_CLAUDE;
      plan.reason = `props_shape_${propsPreview.askShape}_claude`;
    } else {
      plan.lane = WC_TURN_LANE.PROPS_FAST;
      plan.reason = propsRouteV2Apply ? "props_route_v2_fast" : "player_market_fast_path";
      plan.shouldUseFastPath = true;
    }
    plan.dataPackages = buildBaseDataPackages({
      ...plan,
      lane: plan.lane,
      intent: WC_INTENT.PLAYER_PROP,
      needsPropsKv: true,
      propsShapeRouted,
    });
    plan.intent = detectParlayIntent(question) ? WC_INTENT.PARLAY : WC_INTENT.PLAYER_PROP;
    plan.useLiteContext = false;
    plan.confidence = resolveTurnConfidence(plan.lane, plan.intent, hasKvFixture);
    return finalizeWcTurnPlan(plan);
  }

  // ── Step 6: Live prebuilt lanes ───────────────────────────────────────────
  if (
    !detectParlayIntent(question) &&
    !isWcMatchProbabilityQuestion(question) &&
    shouldUseWcLiveInPlayBetsPrebuilt(question, prebuiltCommon)
  ) {
    plan.lane = WC_TURN_LANE.LIVE_IN_PLAY;
    plan.reason = "live_in_play_bets_prebuilt";
    plan.shouldUseFastPath = true;
    plan.intent = WC_INTENT.MATCHUP;
    plan.dataPackages = buildBaseDataPackages({ ...plan, lane: plan.lane, intent: plan.intent });
    plan.useLiteContext = false;
    plan.confidence = resolveTurnConfidence(plan.lane, plan.intent, hasKvFixture);
    return finalizeWcTurnPlan(plan);
  }

  if (shouldUseWcLiveBetTimingPrebuilt(question, prebuiltCommon)) {
    plan.lane = WC_TURN_LANE.LIVE_BET_TIMING;
    plan.reason = "live_bet_timing_prebuilt";
    plan.shouldUseFastPath = true;
    plan.intent = WC_INTENT.MATCHUP;
    plan.dataPackages = buildBaseDataPackages({ ...plan, lane: plan.lane, intent: plan.intent });
    plan.useLiteContext = false;
    plan.confidence = resolveTurnConfidence(plan.lane, plan.intent, hasKvFixture);
    return finalizeWcTurnPlan(plan);
  }

  if (
    !detectParlayIntent(question) &&
    !isWcMatchProbabilityQuestion(question) &&
    shouldUseWcLiveMatchWinnerPrebuilt(question, intent, prebuiltCommon)
  ) {
    plan.lane = WC_TURN_LANE.LIVE_MATCH_WINNER;
    plan.reason = "live_match_winner_prebuilt";
    plan.shouldUseFastPath = true;
    plan.intent = WC_INTENT.MATCHUP;
    plan.dataPackages = buildBaseDataPackages({ ...plan, lane: plan.lane, intent: plan.intent });
    plan.useLiteContext = false;
    plan.confidence = resolveTurnConfidence(plan.lane, plan.intent, hasKvFixture);
    return finalizeWcTurnPlan(plan);
  }

  // ── Step 7: Matchup prebuilt lanes ────────────────────────────────────────
  const blockAltAfterPlayerPivot = shouldBlockMatchupAltPrebuiltAfterPlayerPivot(question, history);

  if (
    isConversationFollowUp &&
    !wcRunnerUpFollowUpQuestion &&
    !detectParlayIntent(question) &&
    !isWcMatchProbabilityQuestion(question) &&
    !blockAltAfterPlayerPivot &&
    (isWcConditionalMatchupFollowUp(question, priorLean) ||
      shouldUseWcFixtureMatchupAltFollowUpPrebuilt(question, intent, prebuiltCommon))
  ) {
    plan.lane = WC_TURN_LANE.MATCHUP_ALT_FOLLOWUP;
    plan.reason = isWcConditionalMatchupFollowUp(question, priorLean)
      ? "conditional_matchup_alt_followup"
      : "matchup_alt_market_followup";
    plan.shouldUseFastPath = true;
    plan.intent = WC_INTENT.MATCHUP;
    plan.dataPackages = buildBaseDataPackages({ ...plan, lane: plan.lane, intent: plan.intent });
    plan.useLiteContext = false;
    plan.confidence = resolveTurnConfidence(plan.lane, plan.intent, hasKvFixture);
    return finalizeWcTurnPlan(plan);
  }

  if (
    isConversationFollowUp &&
    shouldUseWcFixtureMatchupMoneylineRepeatPrebuilt(question, intent, prebuiltCommon)
  ) {
    plan.lane = WC_TURN_LANE.MATCHUP_ML_REPEAT;
    plan.reason = "matchup_ml_repeat_prebuilt";
    plan.shouldUseFastPath = true;
    plan.intent = WC_INTENT.MATCHUP;
    plan.dataPackages = buildBaseDataPackages({ ...plan, lane: plan.lane, intent: plan.intent });
    plan.useLiteContext = false;
    plan.confidence = resolveTurnConfidence(plan.lane, plan.intent, hasKvFixture);
    return finalizeWcTurnPlan(plan);
  }

  if (
    !isConversationFollowUp &&
    !wcRunnerUpFollowUpQuestion &&
    !detectParlayIntent(question) &&
    !isWcMatchProbabilityQuestion(question) &&
    shouldUseWcFixtureMatchupPrebuilt(question, intent, prebuiltCommon)
  ) {
    plan.lane = WC_TURN_LANE.MATCHUP_PREBUILT;
    plan.reason = "fixture_matchup_prebuilt";
    plan.shouldUseFastPath = true;
    plan.intent = WC_INTENT.MATCHUP;
    plan.dataPackages = buildBaseDataPackages({ ...plan, lane: plan.lane, intent: plan.intent });
    plan.useLiteContext = false;
    plan.confidence = resolveTurnConfidence(plan.lane, plan.intent, hasKvFixture);
    return finalizeWcTurnPlan(plan);
  }

  // ── Step 9: LLM fallback ──────────────────────────────────────────────────
  const useLite = resolveWcTurnUseLiteContext({
    lane: WC_TURN_LANE.LLM_LITE,
    intent,
    isFollowUp: isConversationFollowUp,
    priorLean,
    pinnedEventId,
  });

  if (isConversationFollowUp && (priorLean || pinnedEventId)) {
    plan.lane = WC_TURN_LANE.LLM_THREAD;
    plan.reason = priorLean ? "llm_thread_with_prior_lean" : "llm_thread_pinned_fixture";
  } else if (useLite) {
    plan.lane = WC_TURN_LANE.LLM_LITE;
    plan.reason = "llm_lite_legacy_continuation";
  } else {
    plan.lane = WC_TURN_LANE.LLM_FULL;
    plan.reason = "llm_full_context";
  }

  plan.useLiteContext = useLite;
  plan.dataPackages = buildBaseDataPackages({ ...plan, lane: plan.lane, intent, propsShapeRouted });
  plan.confidence = resolveTurnConfidence(plan.lane, intent, hasKvFixture);
  return finalizeWcTurnPlan(plan);
}

/** Exported for tests — re-export live angle pattern used in lane 6. */
export { WC_LIVE_ANGLE_ASK_RE, isWcLiveDominanceQuestion, isWcGoatPrimaryEnabled, needsWcPropsRouting };
