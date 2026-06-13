import { applyCors } from "../_cors.js";
import { detectIntent, resolveSportHint } from "./intentRouting.js";
import { sendUrTakeJson } from "./responseDelivery.js";
import { releaseUrTakeGateQuotaIfNeeded } from "./gateQuotaLifecycle.js";
import { tryUrTakeEarlyPaths } from "./earlyPaths.js";
import { tryDeliverWcPrebuiltFastPath } from "./wcPrebuiltFastPath.js";
import { resolveMlbDecisionMode } from "./mlb/decisionMode.js";
import { contextJsonForModel } from "./prompt/contextJson.js";
import { extractAnthropicText } from "./prompt/anthropicText.js";
import { getTodayStr } from "./prompt/today.js";
import { tryParseJsonObject } from "./prompt/jsonParse.js";
import { normalizeText, escapeRegExp } from "./prompt/normalize.js";
import {
  buildJsonOutputContract,
  isSettledFactQuestion,
  isSpreadOrGameSideQuestion,
  NO_MARKET_VERIFIED_PLAYER_STEP_2,
  PROP_PROJECTION_MODE_BLOCK,
  resolveOutputJsonMode,
  SPREAD_AND_GAME_SIDE_BLOCK,
  buildNbaRosterProminentInjection,
  ROSTER_ENFORCEMENT_NBA,
} from "./prompt/outputMode.js";
import { buildUrTakeFollowUpCoreSystemPrompt } from "./prompt/followUpCore.js";
import {
  coerceWcRulesModelText,
  finalizeWcRulesDelivery,
  formatStructuredResponseAsUrTakeProse,
} from "./wc/rulesDelivery.js";
import {
  applyNbaConfidenceModifiers,
  applyNbaMarketInvalidation,
  buildAllowedMatchupPlayerPool,
  buildNbaAvailabilityResponse,
  buildNbaConditionalPayload,
  buildNbaContextForModel,
  buildNbaGameTotalsPromptBlock,
  buildNbaKeyPropsLinesPromptBlock,
  buildNbaOutStatusShiftPlan,
  buildNbaPlayerResolutionBlock,
  buildNbaStatusShiftSection,
  buildOffMatchupPromptAcknowledgement,
  detectNbaAvailabilityIntent,
  extractMentionedPlayersFromOutput,
  injectMatchupGroundingBlock,
  normalizeConfidenceVocabularyInText,
  normalizeNbaMarketPlayerKey,
  repairOrRegenerateInvalidMatchupOutput,
  resolveNbaDecisionMode,
  resolveNbaMatchupFromQuestion,
  resolveNbaPropsOddsForPrompt,
  resolveQuestionNbaPlayers,
  sanitizeNbaQuestionForGeneration,
  stripNbaLeadInDisclosure,
  summarizeNbaNewsImpact,
  validatePlayersAgainstMatchup,
  isDirectNbaPropAsk,
} from "./nba/index.js";
import {
  buildNbaGameStateAuthorityBlock,
  buildNbaGameStateGateSnapshot,
  buildNbaLiveNoPropSystemPromptBlock,
  buildNbaNoMarketHardFallback,
  buildNbaObservabilityMeta,
  buildNbaPostGameUserPromptBlock,
  computeIsBoardLive,
  ensureNbaTakeConfidenceConsistency,
  formatNbaGameStateBlocksForUserPrompt,
  formatNbaLiveScoreSignature,
  hasNbaNoMarketHardFail,
  isNbaNoMarketUpcomingSlate,
  logNbaObservability,
  stripNbaInternalControlLabels,
} from "./nba/handlerRuntime.js";

export {
  applyNbaConfidenceModifiers,
  applyNbaMarketInvalidation,
  buildAllowedMatchupPlayerPool,
  buildNbaConditionalPayload,
  buildNbaContextForModel,
  buildNbaStatusShiftSection,
  extractMentionedPlayersFromOutput,
  normalizeConfidenceVocabularyInText,
  normalizeNbaMarketPlayerKey,
  resolveNbaDecisionMode,
  resolveNbaMatchupFromQuestion,
  resolveQuestionNbaPlayers,
  stripNbaLeadInDisclosure,
  summarizeNbaNewsImpact,
  validatePlayersAgainstMatchup,
} from "./nba/index.js";
export { resolveMlbDecisionMode } from "./mlb/decisionMode.js";
import { getDurableJson } from "../_durableStore.js";
import { getEnv } from "../_env.js";
import { shouldRequireUrTakeAuth, verifyBearerForUrTake } from "../_urTakeAuth.js";
import { sanitizeUrTakeBody } from "../_sanitizeUrTakeBody.js";
import {
  BRO_TONE_REGENERATION_SUFFIX,
  QA_REGENERATION_SYSTEM_SUFFIX,
  logLeanContractIfMissing,
  qaRequiresRegeneration,
  runUnderReviewPostProcess,
} from "../_urTakeOutputQA.js";
import {
  generateLiveFollowUpsWithHaiku,
  shouldAttachLiveFollowUps,
} from "../_urTakeLiveFollowUps.js";
import {
  allowRateLimit,
  emailLimit,
  getClientIp,
  ipLimit,
} from "../_rateLimitUrTake.js";
import {
  attachFreeQuotaMirrorToUrTakeResponse,
  reserveUrTakeGateQuota,
} from "../_gateQuota.js";
import { buildDerbyContext, isDerbyActive } from "../_derby2026.js";
import { buildWorldCupUrTakeContext } from "../_wcUrTakeContext.js";
import { readWcTournamentSimFromKv } from "../_wcTournamentSimData.js";
import { readBdlLiveFuturesFromKv } from "../_wcBdlData.js";
import { resolveWcCrossGroupPrebuiltInputs } from "../_wcCrossGroupPrebuiltInputs.js";
import {
  buildWcFixtureMatchupPrebuiltFromInputs,
  resolveWcFixtureMatchupPrebuiltInputs,
} from "../_wcFixtureMatchupPrebuiltInputs.js";
import { buildWcTomorrowSlatePrebuiltFromInputs } from "../_wcTomorrowSlatePrebuiltInputs.js";
import { isWcTomorrowOrSlateBetQuestion } from "../../shared/wcTakeRetentionQA.js";
import {
  buildWcFixtureMatchupPrebuiltStructured,
  shouldUseWcFixtureMatchupAltFollowUpPrebuilt,
  shouldUseWcFixtureMatchupPrebuilt,
} from "../../shared/wcFixtureMatchupPrebuilt.js";
import {
  isGoldenEvalMode,
  resolveGoldenEvalAnthropicResponse,
  setActiveGoldenEvalCase,
} from "../_urTakeGoldenEval.js";
import { getGoldenEvalFixtureById } from "../../shared/wcGoldenEval.fixtures.js";
import {
  runWcUrTakeQA,
  wcQaRequiresRegeneration,
  WC_GROUP_MATH_QA_SUFFIX,
  WC_GROUP_ROSTER_QA_SUFFIX,
  WC_GROUP_WINNER_QA_SUFFIX,
  WC_PLAYER_MARKET_QA_SUFFIX,
  WC_QA_REGENERATION_SUFFIX,
  WC_PREDICTIONS_ROUNDUP_QA_SUFFIX,
  WC_GROUNDING_REGEN_SUFFIX,
  WC_ROUNDUP_CROSS_MARKET_BLEED_QA_SUFFIX,
  WC_ROUNDUP_SCORER_LEAN_CONTRADICTION_QA_SUFFIX,
  WC_ROUNDUP_UNNAMED_MARKET_ODDS_QA_SUFFIX,
  WC_NEEDS_ATTRIBUTION_QA_SUFFIX,
  WC_NEEDS_COMPARATIVE_QA_SUFFIX,
  WC_NEEDS_DEDUP_QA_SUFFIX,
  WC_NEEDS_NUMERIC_WHY_QA_SUFFIX,
  WC_NEEDS_LEAN_DIRECTION_QA_SUFFIX,
  WC_PUSHBACK_VOICE_QA_SUFFIX,
  WC_MATCH_PASS_ONLY_QA_SUFFIX,
  WC_MATCH_MISSING_WINNER_QA_SUFFIX,
  WC_MATCH_ALT_FOLLOWUP_QA_SUFFIX,
} from "../_wcUrTakeQA.js";
import { WC_PREDICTIONS_ROUNDUP_PROMPT } from "../../shared/wcPredictionsRoundup.js";
import {
  buildWcTurnScopeBlock,
  classifyWcQuestionIntent,
  isWcGroupSlateQuestion,
  isWcGroupStructureQuestion,
  shouldInjectStaticRules,
  WC_FOLLOW_UP_SYSTEM_APPENDIX,
  WC_INTENT,
} from "../../shared/wcUrTakeIntent.js";
import {
  classifyWcAdvancementMarket,
  isWcAdvancementMarketQuestion,
  WC_ADVANCEMENT_MARKET,
} from "../../shared/wcAdvancementMarket.js";
import { isTournamentWinnerQuestion } from "../../shared/wcPhaseUtils.js";
import { WC_CARD_CONTRACT_VOICE_PROMPT } from "../../shared/wcCardContractVoice.js";
import { buildNbaRelevanceLog } from "../../shared/nbaUrTakeRelevance.js";
import { nbaRequiresLiveUrTakeBoardRefresh } from "../../shared/nbaLiveBoardRefresh.js";
import {
  classifyNbaQuestionIntent,
  NBA_INTENT,
  resolveRequiredNbaEntities,
} from "../../shared/nbaUrTakeIntent.js";
import { NBA_PREDICTIONS_ROUNDUP_PROMPT } from "../../shared/nbaPredictionsRoundup.js";
import {
  nbaPredictionsRoundupQaRequiresRegeneration,
  NBA_PREDICTIONS_ROUNDUP_QA_SUFFIX,
  runNbaPredictionsRoundupQA,
} from "../_nbaPredictionsRoundupQA.js";
import {
  formatNbaOutrightsForPrompt,
  nbaOutrightsInjectedForContext,
} from "../../shared/nbaOutrightsFreshness.js";
import { resolveNbaFinalsUrTakeContext } from "../../shared/nbaFinalsUtils.js";
import { applyFinalsRosterFiltersToNbaContext } from "../../shared/nbaFinalsRoster.js";
import {
  buildNbaFinalsStructuredForDelivery,
  formatNbaFinalsStructuredDisplayText,
  isNbaFinalsStructured,
  NBA_FINALS_STRUCTURED_REGENERATION_SUFFIX,
  normalizeNbaFinalsStructuredFields,
  validateNbaFinalsStructuredResponse,
} from "../../shared/nbaFinalsStructured.js";
import {
  readNbaFinalsMvpFromKv,
  readNbaFinalsSeriesFromKv,
} from "../_nbaOutrightsData.js";
import { readGoalEditorialFromKv } from "../_goalBettingData.js";
import { buildGoalNbaFinalsEditorialPromptBlock } from "../../shared/goalEditorialPrompt.js";
import {
  buildEntityBindingPromptBlock,
  resolveRequiredEntities,
} from "../../shared/wcUrTakeEntityBinding.js";
import { extractMentionedWcTeams } from "../../shared/wcUrTakeKeywords.js";
import {
  isWcPlayerMarketIntent,
  resolveWcPlayerMarketResponse,
} from "../../shared/wcUrTakePlayerMarket.js";
import { buildWcPlayerMarketPrebuiltStructured } from "../../shared/wcPlayerMarketResolve.js";
import {
  buildWcGroupSlatePrebuiltStructured,
  buildWcGroupBindingPromptBlocks,
  buildWcCrossGroupValuePrebuiltStructured,
  buildWcRunnerUpFollowUpPrebuiltStructured,
  buildWcGroupValuePushBackPrebuiltStructured,
  resolveWcRunnerUpFollowUpDelivery,
  extractGroupLetterFromQuestion,
  getWcGroupComposition,
  resolveWcGroupLettersForPrompt,
  shouldUseWcCrossGroupValuePrebuilt,
  shouldUseWcGroupSlatePrebuilt,
} from "../../shared/wcGroupComposition.js";
import {
  buildWcCompactStructured,
  formatWcCompactDisplayText,
  resolveWcQaStructured,
} from "../../shared/wcUrTakeCompactDelivery.js";
import {
  buildWcPushBackBindingBlock,
  buildWcGroupValuePushBackBindingBlock,
  warnWcThinFollowUpWhy,
  isWcRunnerUpValueFollowUp,
  extractWcRunnerUpFromHistory,
  shouldUseWcGroupValuePushBackPrebuilt,
  WC_PUSHBACK_VOICE_PROMPT,
} from "../../shared/wcTakeRetentionQA.js";
import {
  sliceChatHistoryStructured,
  chatHistoryContentFromMessage,
  compactHistoryContentForAnthropic,
} from "../../shared/urChatHistoryForApi.js";
import {
  buildWcSessionMemoryPrompt,
  extractSessionWcEntities,
} from "../../shared/wcUrTakeSessionMemory.js";
import {
  buildUrTakeSessionMemoryPrompt,
  UR_TAKE_CONVERSATION_FOLLOW_UP_APPENDIX,
} from "../../shared/urTakeConversation.js";
import { resolveUrTakeConversationFollowUp, countUrTakeClientRecapUserLines } from "../../shared/urTakeFollowUpDetection.js";
import {
  buildWcMatchupIntentRules,
  getWcTeamStrengthTags,
} from "../../shared/wcUrTakeMatchup.js";
import {
  buildPriceBindingPromptBlock,
  extractSessionAmericanOdds,
  stripSessionBleedPrices,
  stripWcStructuredSessionPrices,
} from "../../shared/wcUrTakePricing.js";
import { normalizeWcStructuredForDelivery } from "../../shared/wcUrTakeStructured.js";
import {
  buildWcRulesStructuredFromProse,
  formatWcRulesResponseAsProse,
} from "../../shared/wcUrTakeStructured.js";
import { stripRulesThreadBleed, WC_RULES_TURN_APPENDIX } from "../../shared/wcUrTakeRules.js";
import { questionReferencesDerby } from "../../shared/derbyIntent.js";
import { hasMatchPlayerPropRows } from "../../shared/wcMatchPlayerProps.js";
import {
  buildWcScriptPriceUserAppendix,
  buildWcTeamMarketOpenerPromptBlock,
  detectWcSgpComboIntent,
  shouldRunNbaFirstSessionGuarantee,
} from "../../shared/wcUrTakePhilosophy.js";
import {
  buildUrTakeSportTurnScopeRules,
  extractLatestUserTurnForRouting,
  questionMentionsWorldCup,
  sportsContextSwitched,
  stripUrTakeDeadEndCopy,
} from "../../shared/urTakeSportRouting.js";
import { autocorrectUrTakeQuestion } from "../../shared/urTakeQuestionAutocorrect.js";
import { fetchAnthropicMessages } from "../_anthropicRetry.js";
import { appendTakeForUser, extractTakeFromResponse } from "../_takeLedger.js";
import { buildCanonicalNflContext } from "../_nflContext.js";
import { formatPropContextForPlayers } from "../_nflPropLineContext.js";
import {
  extractMentionedPersonFromQuestion,
  F1_ALWAYS_INCLUDE,
  isNameInMergedList,
  mergeVerifiedNamesWithFallback,
  MLB_ALWAYS_INCLUDE,
  NFL_ALWAYS_INCLUDE,
  personNamesMatch,
  TENNIS_ALWAYS_INCLUDE,
} from "../_sportVerifiedFieldFallbacks.js";
import {
  buildTeamDraftFocusBlock,
  getActiveDraftBundle,
  getNflTeamAbbrFromName,
  getNflDraftPhase,
  getNflTeamNameFromAbbr,
  resolveNflTeamFromQuestion,
} from "../nfl-draft-season.js";
import { simulateDraftRounds } from "../nfl-draft-engine.js";
import { detectNflTeamHint } from "../../src/lib/detectSportFromQuestion.js";
import {
  buildNbaUrTakeBoard,
  buildNbaNewsImpact,
  canonicalizeTeamAbbr,
  extractNbaTeamAbbrevsFromQuestion,
  classifyNbaBoardGamePhase,
  nbaGameHasVerifiedBoxScore,
  questionMentionsPlayer,
} from "../nba.js";
import { buildMlbUrTakeBoard } from "../mlb.js";
import {
  alignGolfBoardToQuestion,
  buildCombinedVerifiedGolfField,
  getUnifiedGolfBoard,
  isKnownPgaTourPlayer,
  normalizeGolfName,
  resolveGolfPlayerInField,
} from "../_golfProviders.js";
import {
  extractGolfTournamentIntentFromQuestion,
  golfLabelsMatchIntent,
  golfQuestionNeedsEventRealign,
  GOLF_INTENT_WRONG_COURSE_FRAGMENTS,
} from "../../shared/golfTournamentIntent.js";
import {
  resolveGolfPrimaryEvent,
  stripMisalignedGolfCourseArtifacts,
} from "../../shared/golfHomeEventSelection.js";
import { augmentNbaRosterGroundingWithUi } from "../../src/lib/nbaUiSurface.js";
import { getNbaPropsForBoard, hydrateNbaPropsOdds } from "../_nbaProps.js";
import {
  countNbaActiveSlatePropSignals,
  nbaBoardHasPostedPropMarkets,
} from "../../shared/nbaPostedPropMarkets.js";
import {
  slimNbaPlayerStatRowForUrTake,
  slimPlayoffSeriesForBoard,
} from "../../shared/nbaUrTakeSlim.js";
import { buildF1UrTakeContext } from "../f1.js";
import { buildF1OddsPromptBlock } from "../_f1Odds.js";
import {
  buildGolfOutrightBasketUserPromptAppendix,
  classifyGolfBetStructure,
} from "../_golfOutrightBasket.js";
import {
  buildCoreFrameworkPrompt,
  buildFactAuthorityPrompt,
  buildMlbParlayResponseRule,
  buildTakeTrustUiMetadata,
  composeRegisteredUrTakeSystemPrompt,
  detectParlayIntent,
  detectUrTakeLongFormIntent,
  resolveEvidenceSparsityProfile,
} from "../_urTakeSystemPromptRegistry.js";
import {
  buildNbaGroundingSnapshot,
  NBA_GROUNDING_REGENERATION_SUFFIX,
  NBA_STRUCTURAL_REGENERATION_SUFFIX,
} from "../_urTakeNbaGroundingQA.js";
import {
  UNIVERSAL_STRUCTURAL_REGENERATION_SUFFIX,
  buildTennisStructuralQaContext,
} from "../../shared/structuralAngleValidation.js";
/** Core bro-voice system instructions — canonical text in ./_urTakeCoreVoice.js */
import { UR_TAKE_CORE_VOICE_PROMPT, sanitizeLeanBroTone } from "../_urTakeCoreVoice.js";
import {
  isNbaGroundingProseRefusal,
  tryBuildNbaGroundingRedirectStructured,
} from "../_urTakeGroundingRedirect.js";
import { buildAllowlistLowerSetFromSnapshot } from "../_urTakeNbaInventedPlayerShadow.js";
import {
  buildEnrichedMemoryPrompt,
  extractStructuredFromPlayText,
  saveSessionMemory,
} from "../_urTakeMemory.js";
import { appendSessionStructuralEdgeBlock } from "../../shared/urTakeSessionStructuralEdge.js";
import {
  validateStructuredURTakeResponse,
  normalizeStructuredUrTakeResponse,
  repairStructuredForDelivery,
  stripBrokenQuoteFragments,
} from "../types/urTakeResponse.js";
import { getStructuredURTakePrompt } from "../prompts/urTakeStructuredPrompt.js";
import {
  applyNbaPropRecentFormContradiction,
  findFirstPlayerStatRowForQuestion,
  inferNbaPropDirection,
  inferPropDirectionFromText,
  nbaOverVsRecentFormContradiction,
  nbaUnderVsSeasonAverageImplausible,
  parseNbaRequestedMarket,
  resolveNbaRequestedMarket,
} from "../_nbaPropSanity.js";

function isTruthyFlag(v) {
  const s = String(v || "").trim().toLowerCase();
  return s === "1" || s === "true" || s === "yes" || s === "on";
}

/** Inline duplicate of _golfOddsApi.buildGolfOddsFreshnessPromptBlock — avoids ur-take importing scrape stack at module load. */
function buildGolfOddsFreshnessPromptBlock(odds) {
  const fresh = odds?.freshness;
  if (!fresh?.isStale && !fresh?.staleWarning) {
    if (odds?.fetchedAt) {
      return `\nODDS FRESHNESS: Posted prices fetched at ${odds.fetchedAt} (${fresh?.ageMinutes ?? "?"} min ago). Cite only prices listed under odds.outrights / odds.topFinish / odds.makeCut.\n`;
    }
    return "";
  }
  return `\nODDS FRESHNESS (mandatory):\n${fresh.staleWarning}\nFetched at: ${fresh.fetchedAt || odds.fetchedAt || "unknown"}.\n`;
}

/** Inline duplicate of _nbaPropsApi.buildNbaPropsFreshnessPromptBlock — avoids ur-take importing scrape stack at module load. */
function buildNbaPropsFreshnessPromptBlock(propsOdds) {
  const fresh = propsOdds?.freshness;
  const liveTag = propsOdds?.isLive || fresh?.maxAgeMinutes === 15 ? " (live game — max 15 min)" : "";
  if (!fresh?.isStale && !fresh?.staleWarning) {
    if (propsOdds?.fetchedAt) {
      return `\nODDS FRESHNESS: Posted NBA prop lines fetched at ${propsOdds.fetchedAt} (${fresh?.ageMinutes ?? "?"} min ago${liveTag}). Cite only prices listed under propsOdds.players[].props (points/rebounds/assists) and their books arrays.\n`;
    }
    return "";
  }
  return `\nODDS FRESHNESS (mandatory):\n${fresh.staleWarning}\nFetched at: ${fresh.fetchedAt || propsOdds.fetchedAt || "unknown"}${liveTag}.\n`;
}

/**
 * @param {Record<string, unknown> | null | undefined} nbaContext
 * @param {{ awayAbbr?: string, homeAbbr?: string } | null | undefined} nbaMatchup
 */

/** Closing when markets / lines are missing — structural only; no hypothetical prices (aligns with STRUCTURAL ANALYSIS MODE). */
const NBA_STRUCTURAL_MARKET_CLOSING_RULE = `- Close with a direct structural call (THE CALL): name the edge and who benefits — grounded only in payload data. No hypothetical prices, no "if the line posts at X," no fabricated thresholds.`;

/** Keeps NBA follow-ups from dead-ending on name typos ("drop the name…"). */
const NBA_FOLLOW_UP_THREAD_RULE = `NBA FOLLOW-UP THREAD RULE (mandatory — same chat as prior messages)
- Verified BDL roster + slate + matchup context are supplied in the NBA context JSON below — you must resolve who the user means without asking. Map typos/nicknames to the closest verified full name on **this game's** roster strings in that payload; use that verified full name naturally in the first paragraph (where it fits the framework — never a staged name-drop opener). Execute props/rebounds/assists/PRA for that player.
- Forbidden anywhere in the message: "if you meant", "tell me who", "drop the name", "correct me if", or any user-facing name confirmation.
- Mandatory closer: Observable live trigger from game state in context, OR a structural THE CALL — numbers only if they appear in the payload (DATA CONFIDENCE RULE).
- Only if no token plausibly matches either roster after fuzzy resolution: two game-level angles using verified stars already named in context — still no spelling/confirmation asks.`;

// Odds enhance but never gate a response. Availability is server-side only; the universal
// DATA AVAILABILITY RULE lives in composeRegisteredUrTakeSystemPrompt.

/** Deep-remove oddsAvailable so it never appears in model-facing JSON or prompts. */

/** When RULES turn leaks betting-shaped JSON, recover prose for tier1/rules delivery. */
// ── Intent + sport helpers ─────────────────────────────────────────────────
function pickSurfaceKey(context) {
  const s = normalizeText(context?.currentTournament?.surface || "");
  if (s.includes("clay")) return "clay";
  if (s.includes("grass")) return "grass";
  return "hard";
}

function getPlayerSurfaceScore(player, surfaceKey) {
  const surfaceMap = {
    hard: ["hElo", "hardElo", "elo"],
    clay: ["cElo", "clayElo", "elo"],
    grass: ["gElo", "grassElo", "elo"],
  };
  const keys = surfaceMap[surfaceKey] || ["elo"];
  for (const key of keys) {
    const v = Number(player?.[key]);
    if (Number.isFinite(v)) return v;
  }
  return Number.NEGATIVE_INFINITY;
}

function buildTourShortlist(playersByTour, surfaceKey, limit = 8) {
  const entries = Object.entries(playersByTour || {});
  const ranked = entries
    .map(([name, p]) => ({
      name,
      score: getPlayerSurfaceScore(p, surfaceKey),
      hold: p?.serveStats?.holdPct ?? null,
      brk: p?.returnStats?.breakPct ?? null,
      dr: p?.overallStats?.dominanceRatio ?? null,
      style: p?.style || null,
    }))
    .filter((x) => Number.isFinite(x.score))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
  return ranked;
}

/** Best single Elo label for snapshot (thin rows may lack surface-specific fields). */
function snapshotEloLabel(p, surfaceKey) {
  const pick = (v, label) =>
    Number.isFinite(Number(v)) ? `${label} ${Number(v)}` : null;
  if (surfaceKey === "clay") {
    const c = pick(p?.cElo, "cElo");
    if (c) return c;
  } else if (surfaceKey === "hard") {
    const h = pick(p?.hElo, "hElo");
    if (h) return h;
  } else if (surfaceKey === "grass") {
    const g = pick(p?.gElo, "gElo");
    if (g) return g;
  }
  return (
    pick(p?.cElo, "cElo") ||
    pick(p?.hElo, "hElo") ||
    pick(p?.gElo, "gElo") ||
    pick(p?.elo, "Elo") ||
    pick(p?.yElo2026, "yElo")
  );
}

function snapshotHoldHint(p) {
  if (typeof p?.serveStats === "string" && p.serveStats.trim()) {
    return p.serveStats.split(",")[0]?.trim() || null;
  }
  if (p?.serveStats?.holdPct != null) {
    return `${p.serveStats.holdPct}% hold`;
  }
  if (typeof p?.returnStats === "string" && p.returnStats.trim()) {
    return p.returnStats.split(",")[0]?.trim().slice(0, 72) || null;
  }
  return null;
}

function snapshotDrHint(p) {
  if (typeof p?.overallStats === "string") {
    const m = p.overallStats.match(/Dominance Ratio\s+([\d.]+)/i);
    if (m) return `DR ${m[1]}`;
    const loose = p.overallStats.match(/\bDR\s+([\d.]+)\b/i);
    if (loose) return `DR ${loose[1]}`;
  }
  if (p?.overallStats?.dominanceRatio != null) {
    return `DR ${p.overallStats.dominanceRatio}`;
  }
  const note = String(p?.fullNote || "");
  const fromNote = note.match(/(?:Dominance Ratio|DR)\s+([\d.]+)/i);
  if (fromNote) return `DR ${fromNote[1]}`;
  return null;
}

/** Ranked snapshot lines for prompt injection (surface-weighted). Safe on sparse rows. */
function buildTennisPlayerSnapshot(playerDb, surfaceKey, limit = 30) {
  const ranked = buildTourShortlist(playerDb, surfaceKey, limit);
  return ranked
    .map(({ name }) => {
      try {
        const p = playerDb?.[name];
        if (!p || typeof p !== "object") return `${name} | (no row in DB)`;

        const eloTag = snapshotEloLabel(p, surfaceKey);
        const hold = snapshotHoldHint(p);
        const dr = snapshotDrHint(p);

        const surf =
          p.surfaceNote?.[surfaceKey] ||
          (surfaceKey === "clay" ? p.surfaceNote?.clay : null) ||
          (surfaceKey === "hard" ? p.surfaceNote?.hard : null) ||
          (surfaceKey === "grass" ? p.surfaceNote?.grass : null);

        const surfaces = surf
          ? `${surfaceKey}: ${String(surf).slice(0, 140)}`
          : [
              p.surfaceNote?.clay ? `clay: ${String(p.surfaceNote.clay).slice(0, 90)}` : null,
              p.surfaceNote?.hard ? `hard: ${String(p.surfaceNote.hard).slice(0, 90)}` : null,
            ]
              .filter(Boolean)
              .join(", ");

        const form =
          p.record2026 ||
          p.surfaceRecord2026 ||
          p.record ||
          p.miamiNote ||
          "";

        const note = p.fullNote ? String(p.fullNote).slice(0, 120) : "";

        const signals = [eloTag, hold, dr].filter(Boolean).join(" · ");
        const thin =
          !eloTag && !hold && !dr && !surfaces && !String(form).trim() && !note;

        const bits = [
          `${name}`,
          p.style ? String(p.style) : "",
          signals || (thin ? "partial row — cite cautiously from notes only" : ""),
          surfaces || "",
          form ? String(form).slice(0, 80) : "",
          note ? note : "",
        ].filter(Boolean);

        return bits.join(" | ");
      } catch {
        return `${name} | (snapshot parse skipped — row present but malformed)`;
      }
    })
    .join("\n");
}

function findPlayerRowLoose(name, tourObj) {
  if (!name || !tourObj || typeof tourObj !== "object") return null;
  const n = normalizeText(name);
  if (!n) return null;
  if (tourObj[name]) return tourObj[name];
  for (const [k, v] of Object.entries(tourObj)) {
    const kn = normalizeText(k);
    if (kn === n || kn.includes(n) || n.includes(kn)) return v;
  }
  return null;
}

function buildMatchupTennisDigest(homeName, awayName, players, surfaceKey) {
  const rowH =
    findPlayerRowLoose(homeName, players?.atp) ||
    findPlayerRowLoose(homeName, players?.wta);
  const rowA =
    findPlayerRowLoose(awayName, players?.atp) ||
    findPlayerRowLoose(awayName, players?.wta);

  const one = (label, row) => {
    if (!row || typeof row !== "object") {
      return `${label}: (no dedicated UR profile row for this name — do not invent stats; use matchup + tour context only.)`;
    }
    const eloTag = snapshotEloLabel(row, surfaceKey);
    const hold = snapshotHoldHint(row);
    const dr = snapshotDrHint(row);
    const surf =
      surfaceKey === "clay"
        ? row.surfaceNote?.clay
        : surfaceKey === "grass"
          ? row.surfaceNote?.grass
          : row.surfaceNote?.hard;
    const surfaces = surf ? `${surfaceKey}: ${String(surf).slice(0, 130)}` : "";

    const form =
      row.record2026 ||
      row.surfaceRecord2026 ||
      row.record ||
      row.miamiNote ||
      "";
    const note = row.fullNote ? String(row.fullNote).slice(0, 110) : "";

    const signals = [eloTag, hold, dr].filter(Boolean).join(" · ");
    const bits = [
      `${label}`,
      row.style ? String(row.style) : "",
      signals || "partial signals — cite cautiously",
      surfaces || "",
      form ? String(form).slice(0, 72) : "",
      note ? note : "",
    ].filter(Boolean);

    return bits.join(" | ");
  };

  return `${one(String(homeName || "").trim() || "Player A", rowH)}
${one(String(awayName || "").trim() || "Player B", rowA)}`;
}

/**
 * Ace prop lines aligned with the app Prop Guide (TennisScreen).
 * Clay events foreground avg_aces_clay, then ace_rate, then hard proxy — same contract as UI.
 */
function buildAcePropsDigest(aceProps, tournamentSurface) {
  if (!aceProps || typeof aceProps !== "object") return "Not available";
  const keys = Object.keys(aceProps);
  if (keys.length === 0) return "Not available";
  const surf = normalizeText(tournamentSurface);
  const clayEvent = surf.includes("clay");
  const lines = [];
  for (const [key, row] of Object.entries(aceProps)) {
    if (!row || typeof row !== "object") continue;
    const name = String(key || "").trim() || "unknown";
    const acePct = row.ace_rate != null ? String(row.ace_rate) : "—";
    const hard = row.avg_aces_hard;
    const clay = row.avg_aces_clay;
    if (clayEvent && clay != null && clay !== "" && Number.isFinite(Number(clay))) {
      lines.push(
        `${name}: ${clay} clay aces/gm · ${acePct} tour ace% · ${hard} hard aces/gm (proxy — matches app Prop Guide on clay)`,
      );
    } else {
      lines.push(`${name}: ${hard} aces/gm (hard proxy) · ${acePct} tour ace% (app Prop Guide line)`);
    }
  }
  return lines.join("\n");
}

function extractNflPlayersFromContext(nflContext) {
  const names = [];
  const seen = new Set();

  const add = (n) => {
    const t = String(n || "").trim();
    if (!t) return;
    const k = t.toLowerCase();
    if (seen.has(k)) return;
    seen.add(k);
    names.push(t);
  };

  if (nflContext && typeof nflContext === "object" && !Array.isArray(nflContext)) {
    const ui = nflContext.uiPlayers;
    if (ui && typeof ui === "object") {
      for (const k of Object.keys(ui)) add(k);
    }
  }

  const text =
    typeof nflContext === "string"
      ? nflContext
      : contextJsonForModel(nflContext);

  const regex = /^([^\n|]{2,})\s+\|\s+(RB|WR|TE|QB)\s+\|/gm;
  let match;
  while ((match = regex.exec(text))) {
    add(match[1]);
  }

  for (const n of NFL_ALWAYS_INCLUDE) add(n);
  return names;
}

function extractNflQuestionSubject(question) {
  const q = normalizeText(question).replace(/[^a-z0-9'\s.-]/g, " ");

  const willPattern =
    /\bwill\s+([a-z][a-z'-]*(?:\s+[a-z][a-z'-]*){0,2})\s+(throw|pass|rush|run|score|catch|record|have)\b/;
  const overUnderPattern =
    /\b([a-z][a-z'-]*(?:\s+[a-z][a-z'-]*){0,2})\s+(over|under)\s+\d/;

  const willMatch = q.match(willPattern);
  if (willMatch) return String(willMatch[1] || "").trim();

  const ouMatch = q.match(overUnderPattern);
  if (ouMatch) return String(ouMatch[1] || "").trim();

  return "";
}

function findNflPlayerMatch(questionSubject, playerNames) {
  if (!questionSubject || !Array.isArray(playerNames) || playerNames.length === 0) {
    return null;
  }

  if (isNameInMergedList(questionSubject, playerNames)) {
    return (
      playerNames.find((n) => personNamesMatch(questionSubject, n)) ||
      extractMentionedPersonFromQuestion(questionSubject, playerNames) ||
      questionSubject
    );
  }

  const subject = normalizeText(questionSubject);
  const subjectTokens = subject.split(/\s+/).filter(Boolean);
  if (subjectTokens.length === 0) return null;

  for (const playerName of playerNames) {
    const playerNorm = normalizeText(playerName);
    const playerTokens = playerNorm.split(/\s+/).filter(Boolean);

    if (playerNorm.includes(subject) || subject.includes(playerNorm)) {
      return playerName;
    }

    const overlap = subjectTokens.filter((t) => playerTokens.includes(t));
    if (overlap.length > 0) {
      return playerName;
    }
  }

  return null;
}

function shouldApplyNflUnsupportedGuard(question) {
  const q = normalizeText(question);
  return (
    q.includes(" over ") ||
    q.includes(" under ") ||
    q.includes("yards") ||
    q.includes("passing") ||
    q.includes("rushing") ||
    q.includes("receiving") ||
    q.includes("td") ||
    q.includes("touchdown")
  );
}

/** Draft / GM / capital questions — different guardrails than in-season prop board. */
function isNflDraftAngleQuestion(question) {
  const q = normalizeText(question);
  const needles = [
    "draft",
    "nfl draft",
    "first round",
    "round 1",
    "round one",
    "combine",
    "mock draft",
    "war room",
    "general manager",
    "front office",
    "trade up",
    "trade back",
    "on the clock",
    "pittsburgh",
    "overall pick",
    "top pick",
    "prospect",
    "draft capital",
    "comp pick",
    "compensatory",
    "draft order",
    "draft slot",
    "draft board",
    "kiper",
    "mcshay",
    "predict",
    "prediction",
    "pick by pick",
    "pick-by-pick",
    "each pick",
    "every pick",
    "every round",
    "all seven",
    "seven round",
    "seven rounds",
    "full mock",
    "who will we pick",
    "who we pick",
    "who we take",
    "our picks",
    "my picks",
  ];
  if (
    /\bgm\b/.test(q) &&
    (q.includes("draft") || q.includes("war room") || q.includes("front office"))
  ) {
    return true;
  }
  return needles.some((n) => q.includes(n));
}

/**
 * Routes draft questions so league-wide and prospect-profile asks are not forced into team simulation.
 * @returns {"TYPE_A"|"TYPE_B"|"TYPE_C"}
 */
function getNflDraftQuestionRoute(question, focusTeamAbbr) {
  const lower = String(question || "").toLowerCase();
  const hasTeam = !!focusTeamAbbr;

  const leagueWide =
    /\bsleeper|\bsleepers\b|biggest sleeper|best value picks?|who falls|who rises|\bwhole class\b|league[- ]wide|across the (draft|class|league)|who goes top|\btop\s*5\b|wins the draft|which team wins|\bwin the draft\b|best players available|most interesting (draft )?situation|best prospect at\b|\bbest (edge|quarterback|qb|receiver|wr|running back|rb|tackle|corner|corners|te|tight end|safety|safeties|idl|iol|guard|center|linebacker|lb)\b.*\b(in this class|this year|the class)\b/i.test(
      lower,
    ) || /\bwho (has|have) the (most|best) interesting\b/i.test(lower);

  if (leagueWide) return "TYPE_B";

  const profile =
    /\bgrade on\b|\b(valuation|value) on\b|\bdraft stock\b|\bprojected range\b|\bpositional rank\b/i.test(lower) ||
    /\bwhere (does|will)\b[\s\S]{0,120}\b(go|land|come off the board)\b/i.test(lower);

  if (profile) return "TYPE_C";

  const teamSim =
    /\bsimulate\b|\bmock draft\b|\bfull mock\b|\b(my|our) team'?s\b|\bwar room\b|\brounds?\s*1\s*[-–]\s*3\b|\bpick[\s-]by[\s-]pick\b|\beach pick\b|\bevery round\b|\ball seven\b|\bseven round/i.test(lower) ||
    (hasTeam &&
      /\bdraft\b|\bmock\b|\bpicks?\b|\bneeds?\b|\bcapital\b|\bwho will\b|\bwhat will\b|\bwho (does|do)\b/i.test(lower));

  if (teamSim) return "TYPE_A";

  return "TYPE_B";
}

function detectLiveGameSignals(question, hasImage) {
  const q = normalizeText(question);
  const liveKeywords = [
    "left in",
    "minutes left",
    "seconds left",
    "time left",
    "right now",
    "currently",
    "just happened",
    "live",
    "this quarter",
    "this inning",
    "this half",
    "this set",
    "bottom of",
    "top of",
    "end of",
    "q1",
    "q2",
    "q3",
    "q4",
    "1st half",
    "2nd half",
    "overtime",
    "ot",
    "needs",
    "has to",
    "on pace",
  ];
  const hasLiveKeyword = liveKeywords.some((kw) => q.includes(kw));
  return {
    isLive: hasImage || hasLiveKeyword,
    hasImage,
    hasLiveKeyword,
  };
}

function hasRecentLiveScreenshotContext(history) {
  if (!Array.isArray(history) || history.length === 0) return false;
  const recent = history.slice(-6);
  const livePattern =
    /\b(live|q[1-4]|quarter|halftime|1st q|2nd q|3rd q|4th q|clock|odds|draftkings|fanduel|scoreboard|@\s*[A-Z]{2,4}|\b\d{1,3}\s*[-:]\s*\d{1,3}\b)\b/i;
  return recent.some((msg) => livePattern.test(String(msg?.content ?? msg?.text ?? "")));
}

function isShortMarketFollowUp(question) {
  const q = normalizeText(question);
  const compact = q.replace(/\s+/g, " ").trim();
  if (!compact) return false;
  if (compact.length > 40) return false;
  return (
    /^(total|total over under|over|under|side|best bet)\??$/.test(compact) ||
    /^(over under|o\/u|ou)\??$/.test(compact) ||
    /^(over\??|under\??|side\??|best bet\??)$/.test(compact)
  );
}

function nbaUrTakeContextHasUsableData(ctx) {
  if (!ctx || typeof ctx !== "object") return false;
  return (
    (Array.isArray(ctx.todaysGames) && ctx.todaysGames.length > 0) ||
    (Array.isArray(ctx.playerStats) && ctx.playerStats.length > 0) ||
    (Array.isArray(ctx.propLines) && ctx.propLines.length > 0) ||
    !!ctx.liveBoxscore ||
    (Array.isArray(ctx.injuries) && ctx.injuries.length > 0)
  );
}

function normalizeAvailabilityStatusClass(value) {
  const s = String(value || "").toLowerCase();
  if (!s) return "";
  if (s.includes("questionable") || s.includes("gtd")) return "questionable";
  if (s.includes("doubtful")) return "doubtful";
  if (s.includes("out") || s.includes("inactive")) return "out";
  return "";
}

function getNbaSeriesGameNumberForGame(game, playoffSeries) {
  const away = String(game?.awayTeam?.abbr || "").toUpperCase();
  const home = String(game?.homeTeam?.abbr || "").toUpperCase();
  if (!away || !home || !Array.isArray(playoffSeries)) return 0;
  const row = playoffSeries.find((s) => {
    const sa = String(s?.away || "").toUpperCase();
    const sh = String(s?.home || "").toUpperCase();
    return (sa === away && sh === home) || (sa === home && sh === away);
  });
  if (!row) return 0;
  const sa = String(row?.away || "").toUpperCase();
  const sh = String(row?.home || "").toUpperCase();
  const awayWins = sa === away && sh === home ? Number(row?.awayWins || 0) : Number(row?.homeWins || 0);
  const homeWins = sa === away && sh === home ? Number(row?.homeWins || 0) : Number(row?.awayWins || 0);
  const played = (Number.isFinite(awayWins) ? awayWins : 0) + (Number.isFinite(homeWins) ? homeWins : 0);
  return played + 1;
}

/** Plain-language elimination signal for serverSummaryOneLiner (series wins in matchup question order). */
function appendPlayoffEliminationSuffix(winsAwayF, winsHomeF, af, hf) {
  const a = Number(winsAwayF) || 0;
  const h = Number(winsHomeF) || 0;
  if (a <= 2 && h <= 2) return " — no team facing elimination yet.";
  if (a === 3 && h === 3) return " — next game eliminates the loser.";
  const hi = Math.max(a, h);
  const lo = Math.min(a, h);
  if (hi >= 3 && lo <= 2 && hi > lo) {
    const trailing = a < h ? af : h < a ? hf : "";
    if (trailing) return ` — ${trailing} facing elimination.`;
  }
  return "";
}

/**
 * Explicit series snapshot for the Haiku JSON payload when the question anchors a matchup.
 * playoffSeries rows are ESPN-shaped: { away, home, awayWins, homeWins, round, status }.
 * awayF/homeF follow resolveNbaMatchupFromQuestion board order (@ away at home).
 */

function getNbaAvailabilityImpactCountForGame(game, bdlAvailability) {
  const away = String(game?.awayTeam?.abbr || "").toUpperCase();
  const home = String(game?.homeTeam?.abbr || "").toUpperCase();
  if (!away || !home || !bdlAvailability || typeof bdlAvailability !== "object") return 0;
  let count = 0;
  for (const meta of Object.values(bdlAvailability)) {
    const team = String(meta?.team || "").toUpperCase();
    if (team !== away && team !== home) continue;
    const cls = normalizeAvailabilityStatusClass(meta?.statusClass || meta?.status || meta?.availability);
    if (cls) count += 1;
  }
  return count;
}

function selectTopNbaSlateGameForGuarantee(nbaContext) {
  const games = Array.isArray(nbaContext?.todaysGames) ? nbaContext.todaysGames : [];
  if (games.length === 0) return null;
  const playable = games.filter((g) => !["post", "final"].includes(String(g?.state || "").toLowerCase()));
  const candidates = playable.length > 0 ? playable : games;
  const bdlAvailability = nbaContext?.bdlAvailability || nbaContext?.bdlGrounding?.bdlAvailability || {};
  const playoffSeries = Array.isArray(nbaContext?.playoffSeries) ? nbaContext.playoffSeries : [];
  const scored = candidates.map((g, idx) => ({
    game: g,
    idx,
    injuryImpactCount: getNbaAvailabilityImpactCountForGame(g, bdlAvailability),
    seriesGameNumber: getNbaSeriesGameNumberForGame(g, playoffSeries),
  }));
  const maxInjury = Math.max(0, ...scored.map((s) => s.injuryImpactCount));
  if (maxInjury > 0) {
    return scored
      .filter((s) => s.injuryImpactCount === maxInjury)
      .sort((a, b) => b.seriesGameNumber - a.seriesGameNumber || a.idx - b.idx)[0];
  }
  const maxSeries = Math.max(0, ...scored.map((s) => s.seriesGameNumber));
  if (maxSeries > 0) {
    return scored
      .filter((s) => s.seriesGameNumber === maxSeries)
      .sort((a, b) => a.idx - b.idx)[0];
  }
  return scored[0];
}

function buildFirstSessionGuaranteeInjection(feature) {
  if (!feature?.game) return "";
  const g = feature.game;
  const away = String(g?.awayTeam?.abbr || g?.awayTeam?.name || "Away");
  const home = String(g?.homeTeam?.abbr || g?.homeTeam?.name || "Home");
  const seriesLine =
    feature.seriesGameNumber > 0
      ? `Series leverage: Game ${feature.seriesGameNumber} (from playoffSeries context).`
      : "Series leverage: no playoff game number present in context.";
  const injuryLine =
    feature.injuryImpactCount > 0
      ? `Injury status: ${feature.injuryImpactCount} availability flags tied to this matchup in bdlAvailability.`
      : "Injury status: no high-impact bdlAvailability flags on this matchup.";
  return `FIRST-SESSION GUARANTEE — AUTO-SURFACE TOP SLATE GAME (DO NOT REVEAL THIS INTERNAL ROUTING)
User asked a broad opener with no prior conversation. Treat this as: "here's the sharpest angle on tonight's slate."
Primary matchup to anchor: ${away} @ ${home}.
${seriesLine}
${injuryLine}
Use matchup context + injury status + series pressure to deliver one decisive angle as the opener.`;
}

function getContextQuality({
  sportHint,
  players,
  context,
  liveMatches,
  golfContext,
  nbaContext,
  mlbContext,
  nflContext,
  f1Context,
  wcContext,
  matchupContext,
}) {
  if (matchupContext) return "high";

  if (
    sportHint === "worldcup" &&
    wcContext?.groups &&
    typeof wcContext.groups === "object" &&
    Object.keys(wcContext.groups).length >= 12
  ) {
    return "full";
  }

  if (
    sportHint === "tennis_wta_profile" &&
    players?.wta &&
    Object.keys(players.wta).length > 0
  )
    return "medium";

  if (sportHint === "tennis" && (context?.currentTournament || (liveMatches || []).length || players)) return "high";
  if (sportHint === "golf" && golfContext?.currentEvent) return "high";
  if (sportHint === "nba" && (nbaContext?.todaysGames?.length || nbaContext?.playerStats?.length)) return "high";
  if (sportHint === "mlb") {
    const gt =
      mlbContext?.gameTotals &&
      typeof mlbContext.gameTotals === "object" &&
      !Array.isArray(mlbContext.gameTotals)
        ? mlbContext.gameTotals
        : {};
    if (
      (mlbContext?.games?.length || 0) > 0 ||
      (mlbContext?.propLines?.length || 0) > 0 ||
      Object.keys(gt).length > 0
    ) {
      return "high";
    }
  }
  if (sportHint === "nfl" && nflContext) return "medium";
  if (sportHint === "f1" && (f1Context?.standings?.length || f1Context?.schedule?.races?.length)) return "high";
  if (sportHint === "derby" && isDerbyActive()) return "high";

  return "low";
}

function deriveConfidenceLabel({
  intent,
  sportHint,
  hasImage,
  matchupContext,
  question,
  contextQuality = "medium",
  isLive = false,
}) {
  const q = normalizeText(question);
  let score = 0;

  if (sportHint && sportHint !== "generic" && sportHint !== "image_review") score += 2;
  if (intent === "slip_review") score += 2;
  if (hasImage) score += 1;
  if (matchupContext) score += 1;
  if (contextQuality === "high" || contextQuality === "full") score += 2;
  if (contextQuality === "medium") score += 1;

  if (
    q.includes("best") ||
    q.includes("sharpest") ||
    q.includes("safest") ||
    q.includes("highest confidence")
  ) {
    score += 1;
  }

  let label;
  if (score >= 6) label = "High";
  else if (score >= 3) label = "Medium";
  else label = "Speculative";

  if (isLive && label === "High") return "Medium";
  return label;
}

function buildSlipReviewPrompt({
  question,
  sportHint,
  nbaContext,
  nflContext,
  mlbContext,
  golfContext,
  f1Context,
  derivedConfidence,
  priorTakesSummary,
}) {
  let relevantContext = "";

  if (sportHint === "nba") {
    relevantContext = `NBA context:
${contextJsonForModel({
  seasonContext: nbaContext?.seasonContext || null,
  todaysGames: nbaContext?.todaysGames || [],
  playoffSeries: nbaContext?.playoffSeries || [],
  propLines: (nbaContext?.propLines || []).slice(0, 80),
  injuries: nbaContext?.injuries || [],
  recentForm: nbaContext?.recentForm || "",
  gameTotals: nbaContext?.gameTotals || {},
  playerStats: (nbaContext?.playerStats || []).slice(0, 60),
  rosterGrounding: nbaContext?.rosterGrounding || null,
  todaysGamesSlateMeta: nbaContext?.todaysGamesSlateMeta || null,
  todaysGamesSlateNote: nbaContext?.todaysGamesSlateNote || null,
})}`;
  } else if (sportHint === "nfl") {
    relevantContext = `NFL context:
${typeof nflContext === "string" ? nflContext : contextJsonForModel(nflContext)}`;
  } else if (sportHint === "mlb") {
    relevantContext = `MLB context:
${contextJsonForModel(mlbContext)}`;
  } else if (sportHint === "golf") {
    relevantContext = `Golf context:
${contextJsonForModel(golfContext)}`;
  } else if (sportHint === "f1") {
    relevantContext = `F1 context:
${contextJsonForModel(f1Context)}`;
  }

  return `You are reviewing a betting slip or pick entry.

${priorTakesSummary ? priorTakesSummary + "\n\n" : ""}User request:
${question}

Sport:
${sportHint || "unknown"}

${relevantContext}

Critical rules:
- Prioritize the image/slip content first.
- Only mention players, teams, games, props, injuries, pricing, matchup edges, or market timing if they are visible in the image or supported by the provided context.
- Do NOT invent matchup analysis that is not supported by the image or context.
- Do NOT claim line shopping, stale pricing, or market movement unless the context clearly supports it.
- If the slip is repetitive, say that directly.
- Use "repetitive construction" or "same-stat fragility" instead of "correlation" unless the legs are truly linked.
- If details are partially unreadable, say what you can confirm and stop there.
- Be sharp, concise, and product-quality.

Confidence guidance:
- Default confidence should be ${derivedConfidence}.
- Do not call something High unless the image and context clearly justify it.

Required response format:

OPENING TAKE
[one sharp sentence]

SLIP VERDICT
[Keep / Trim / Fade / Rebuild]

BIGGEST STRENGTH
[one to two lines]

BIGGEST RISK
[one to two lines]

BEST KEEP
[one line]

FIRST CUT
[one line]

CONFIDENCE
[High / Medium / Speculative]

TIMING
[one line]`;
}

function hasObjectKeys(value) {
  return Boolean(value && typeof value === "object" && !Array.isArray(value) && Object.keys(value).length > 0);
}

function resolveOddsAvailabilityForSport({
  sportHint,
  nbaContext,
  mlbContext,
  golfContext,
  f1Context,
  nflContext,
  liveMatches,
  context,
}) {
  if (sportHint === "nba") {
    const hasProps = Array.isArray(nbaContext?.propLines) && nbaContext.propLines.length > 0;
    const spreadRows =
      nbaContext?.spreads && typeof nbaContext.spreads === "object" && !Array.isArray(nbaContext.spreads)
        ? Object.values(nbaContext.spreads)
        : [];
    const hasSpread = spreadRows.some((s) => s?.current?.displayLine && !s?.lineUnavailable);
    const hasAnProps = nbaBoardHasPostedPropMarkets(nbaContext);
    return hasProps || hasSpread || hasAnProps;
  }
  if (sportHint === "mlb") {
    const hasProps = Array.isArray(mlbContext?.propLines) && mlbContext.propLines.length > 0;
    const hasTotals = hasObjectKeys(mlbContext?.gameTotals);
    return hasProps || hasTotals;
  }
  if (sportHint === "golf") {
    const rows = Array.isArray(golfContext?.odds?.outrights) ? golfContext.odds.outrights : [];
    return rows.some((r) => r?.odds != null && Number.isFinite(Number(r.odds)));
  }
  if (sportHint === "f1") {
    const sm = f1Context?.odds || f1Context?.smarketsOdds;
    return Boolean(
      sm?.hasPostedLines ||
        (Array.isArray(sm?.markets?.raceWinner) && sm.markets.raceWinner.length > 0) ||
        hasObjectKeys(f1Context?.odds) ||
        Array.isArray(f1Context?.markets) ||
        Array.isArray(f1Context?.outrights),
    );
  }
  if (sportHint === "tennis" || sportHint === "tennis_wta_profile") {
    const rows = Array.isArray(liveMatches) ? liveMatches : [];
    const fromRows = rows.some((m) => m?.odd_1 != null || m?.odd_2 != null);
    const fromContext = Boolean(
      context?.odds ||
        (Array.isArray(context?.matches) &&
          context.matches.some((m) => m?.odd_1 != null || m?.odd_2 != null)),
    );
    return fromRows || fromContext;
  }
  if (sportHint === "nfl") {
    if (typeof nflContext === "string") {
      return /\bodds\b|\bline\b|\bspread\b|\btotal\b/i.test(nflContext);
    }
    return Boolean(
      nflContext?.odds ||
        nflContext?.markets ||
        nflContext?.lines ||
        nflContext?.spreads ||
        nflContext?.totals,
    );
  }
  return true;
}

// ── Anthropic call wrapper (429 retries via fetchAnthropicMessages) ──────────
async function callAnthropic({
  apiKey,
  model,
  system,
  messages,
  temperature = 0.45,
  max_tokens = 800,
}) {
  const goldenEvalResult = resolveGoldenEvalAnthropicResponse();
  if (goldenEvalResult) return goldenEvalResult;

  /** Allow slow Claude completions when the host permits long functions (see vercel.json maxDuration). */
  return fetchAnthropicMessages({
    apiKey,
    model,
    max_tokens,
    temperature,
    system,
    messages,
    timeoutMs: 52000,
    maxRetries: 3,
  });
}

function summarizePriorTakes(history) {
  if (!Array.isArray(history) || history.length === 0) return "";

  const assistantTurns = history.filter((h) => h.role === "assistant" || h.role === "ai");
  if (assistantTurns.length === 0) return "";

  const priorTakes = [];
  for (const turn of assistantTurns) {
    const text = String(turn.content || turn.text || "");
    const structured =
      turn.structured && typeof turn.structured === "object" ? turn.structured : null;

    // Extract THE PLAY line
    const playMatch = text.match(/THE PLAY\s*\n([^\n]+)/i);
    const confidenceMatch = text.match(/CONFIDENCE\s*\n([^\n]+)/i);
    const liveCallMatch = text.match(/LIVE CALL\s*\n([^\n]+)/i);

    const play =
      (structured?.call && String(structured.call).trim()) ||
      playMatch?.[1]?.trim() ||
      liveCallMatch?.[1]?.trim();
    const confidence =
      (structured?.confidence && String(structured.confidence).trim()) ||
      confidenceMatch?.[1]?.trim() ||
      "";

    if (play) {
      priorTakes.push({
        play: play.slice(0, 160),
        confidence,
      });
    }
  }

  if (priorTakes.length === 0) return "";

  const lines = priorTakes
    .slice(-5) // last 5 takes in session
    .map((t, i) => `${i + 1}. ${t.play}${t.confidence ? ` (${t.confidence})` : ""}`)
    .join("\n");

  return `PRIOR TAKES THIS SESSION (most recent last)
${lines}

When the current question relates to any of these — same player, same team,
same game, same market, or a correlated bet — reference the prior take
explicitly. Examples:
"Related to my Cade under call — if he's under 22.5, Pistons team total
likely under 108 too."
"Same game as the Cade take above. If you're already on Cade, the Pistons
ML adds correlated risk — size accordingly."
"This is the third time you've asked about this player tonight."

Never silently contradict a prior take. If you're changing your read,
acknowledge it explicitly. If the new question is unrelated, ignore the
prior takes — don't force a connection.

SESSION STRUCTURAL EDGE: When a SESSION STRUCTURAL EDGE block appears below,
that player/angle is the established structural thesis for this chat. Maintain it
on follow-ups unless new evidence explicitly flips the read — live leaderboard
position alone is NOT sufficient to abandon the structural edge.`;
}

function summarizePriorTakesWithStructuralEdge(history, sportHint = "") {
  const base = summarizePriorTakes(history);
  return appendSessionStructuralEdgeBlock(base, history, sportHint);
}

function detectChaseSignals(question, history) {
  const q = normalizeText(question);

  // Explicit chase language
  const chasePhrases = [
    "i need this",
    "need this to hit",
    "have to win",
    "already bet",
    "i already took",
    "just tell me",
    "are you sure",
    "promise me",
    "guarantee",
    "can't lose this one",
    "please say",
    "tell me yes",
    "tell me it's",
    "this has to",
  ];
  const hasChaseLanguage = chasePhrases.some((p) => q.includes(p));

  // Repeated subject detection — pull last 5 user turns
  const priorUserTurns = Array.isArray(history)
    ? history
        .filter((h) => h.role === "user")
        .slice(-5)
        .map((h) => normalizeText(h.content || h.text || ""))
    : [];

  // Extract nouns/names roughly — look for capitalized-ish tokens in current question
  const currentTokens = q.split(/\s+/).filter((t) => t.length >= 4);
  const repeatedTokens = currentTokens.filter((token) =>
    priorUserTurns.some((priorQ) => priorQ.includes(token)),
  );

  // If >= 3 substantive tokens overlap with prior turns, likely same topic
  const sameTopicCount = priorUserTurns.filter((priorQ) => {
    const overlap = currentTokens.filter((t) => priorQ.includes(t));
    return overlap.length >= 3;
  }).length;

  const hasHedgingPanicLanguage =
    (q.includes("already bet") || q.includes("already took")) &&
    (q.includes("other side") ||
      /\bover\b/.test(q) ||
      /\bunder\b/.test(q) ||
      q.includes("is this safe") ||
      q.includes("is it safe"));

  return {
    hasChaseLanguage,
    sameTopicCount,
    hasHedgingPanicLanguage,
    repeatedTokenOverlap: repeatedTokens.length,
    isChase: hasChaseLanguage || sameTopicCount >= 2 || hasHedgingPanicLanguage,
  };
}

function normalizeIncomingChatHistory(raw, { maxMessages = 6 } = {}) {
  if (!Array.isArray(raw)) return [];
  const out = [];
  for (const h of raw) {
    const role =
      h.role === "assistant" || h.role === "ai"
        ? "assistant"
        : h.role === "user"
          ? "user"
          : null;
    const content = chatHistoryContentFromMessage(h);
    if (!role || !content || /^ANALYZING/i.test(content)) continue;
    const row = { role, content: content.slice(0, 4000) };
    const sport = String(h.sport || "").trim().toLowerCase();
    if (sport) row.sport = sport;
    const structured = sliceChatHistoryStructured(h.structured);
    if (structured) row.structured = structured;
    out.push(row);
  }
  const merged = [];
  for (const m of out) {
    if (!merged.length && m.role === "assistant") continue;
    const last = merged[merged.length - 1];
    if (last && last.role === m.role) {
      last.content += `\n\n${m.content}`;
      if (m.structured && typeof m.structured === "object") {
        last.structured = m.structured;
      }
      if (m.sport) last.sport = m.sport;
      continue;
    }
    merged.push({ ...m });
  }
  return merged.slice(-maxMessages);
}

/** First balanced `{ ... }` slice with JSON-safe string handling (handles leading prose before JSON). */
function extractBalancedJsonObject(text) {
  const raw = String(text || "").trim();
  const start = raw.indexOf("{");
  if (start < 0) return null;
  let depth = 0;
  let inString = false;
  let escape = false;
  for (let i = start; i < raw.length; i++) {
    const c = raw[i];
    if (inString) {
      if (escape) {
        escape = false;
      } else if (c === "\\") {
        escape = true;
      } else if (c === '"') {
        inString = false;
      }
      continue;
    }
    if (c === '"') {
      inString = true;
      continue;
    }
    if (c === "{") depth++;
    else if (c === "}") {
      depth--;
      if (depth === 0) {
        const slice = raw.slice(start, i + 1);
        try {
          return JSON.parse(slice);
        } catch {
          return null;
        }
      }
    }
  }
  return null;
}

function tryExtractSummaryDeepFromLooseText(text) {
  const raw = String(text || "").trim();
  const start = raw.indexOf('{"summary"');
  const end = raw.lastIndexOf("}");
  if (start >= 0 && end > start) {
    try {
      const candidate = JSON.parse(raw.slice(start, end + 1));
      if (candidate && typeof candidate.summary === "string") return candidate;
    } catch {
      // fall through
    }
  }

  const block = raw.match(/"summary"\s*:\s*"([\s\S]*?)"\s*,\s*"deep"\s*:\s*"([\s\S]*?)"/);
  if (block) {
    const unescape = (s) =>
      String(s || "")
        .replace(/\\n/g, "\n")
        .replace(/\\"/g, '"')
        .replace(/\\\\/g, "\\");
    return { summary: unescape(block[1]), deep: unescape(block[2]) };
  }
  return null;
}

function normalizeSummaryDeepPayload(summary, deep) {
  let outSummary = String(summary || "").trim();
  let outDeep = typeof deep === "string" ? deep.trim() : null;

  const nested = tryParseJsonObject(outSummary) || tryExtractSummaryDeepFromLooseText(outSummary);
  if (nested && typeof nested.summary === "string" && nested.summary.trim()) {
    outSummary = nested.summary.trim();
    outDeep =
      typeof nested.deep === "string" && nested.deep.trim()
        ? nested.deep.trim()
        : outDeep;
  }

  return {
    summary: outSummary,
    deep: outDeep,
  };
}

/** Removes internal routing labels the model sometimes echoes into user-facing text. */
function stripBannedInternalLeakStrings(text) {
  let s = String(text || "");
  s = s.replace(/\bFOLLOW-UP\s+GATE\s+VIOLATION\b\s*:?\s*/gi, "");
  return s.replace(/\n{3,}/g, "\n\n").trim();
}

/** Phrases that must never appear in user-facing UR Take output (full-body sweep). */
const BANNED_DATA_AVAILABILITY_BODY_PHRASES = [
  "unavailable in context",
  "unavailable in compact context",
  "missing from context",
  "data missing from context",
  "not in context",
  "Season usage data unavailable",
  "Last 5 games data missing",
  "anchoring to the structural reality",
  "absent from compact",
  "compact context",
  "compact data",
  "from compact",
  "Recent form absent",
  "Recent form unavailable",
  "QA notice",
  "automated checks",
  "flagged residual risk",
  "verify lines and role",
  "treat analysis as directional",
  "residual risk in this draft",
];

function escapeRegExpLiteral(str) {
  return String(str).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Global opener sanitizer: remove lead-in paragraphs that describe missing data
 * instead of giving analysis. Keeps the rest of the answer intact.
 * Also strips banned data-availability phrasing anywhere in the body.
 */
function stripBannedDataAvailabilityOpener(text) {
  let s = stripBannedInternalLeakStrings(String(text || "").trim());
  if (!s) return s;
  const bannedLead =
    /^(?:no edge(?: here)?\.?|no\s+(?:player\s+)?prop\s+markets?\s+(?:posted|available)\b|i don't have\b|i can'?t\b|without\b|the context provided\b|the data provided\b|come back when\b|when (?:markets?|prices?) post\b|props?\s+(?:aren'?t|are not)\s+(?:fully\s+)?available\b)/i;
  for (let i = 0; i < 4; i += 1) {
    const paras = s.split(/\n\n+/);
    if (!paras.length) break;
    const head = String(paras[0] || "").trim();
    if (!head) {
      s = paras.slice(1).join("\n\n").trim();
      continue;
    }
    if (bannedLead.test(head)) {
      s = paras.slice(1).join("\n\n").trim();
      continue;
    }
    break;
  }
  for (const phrase of BANNED_DATA_AVAILABILITY_BODY_PHRASES) {
    const re = new RegExp(escapeRegExpLiteral(phrase), "gi");
    s = s.replace(re, "");
  }
  s = s
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\n[ \t]+\n/g, "\n\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  return s;
}

/**
 * Global body sanitizer: remove legacy performance-tracker strings from any line
 * in the model output (summary or deep), not just the opener.
 */
function stripBannedPerformanceTrackerLines(text) {
  let s = stripBannedInternalLeakStrings(String(text || ""));
  if (!s.trim()) return s.trim();
  const bannedLineMatchers = [
    /historical record/i,
    /\b0-0-0\b/i,
    /\b0\.0u\b/i,
    /last 30 days on this confidence tier/i,
    /tier historical record/i,
  ];
  const kept = s
    .split(/\r?\n/)
    .filter((line) => !bannedLineMatchers.some((re) => re.test(line)));
  return stripBannedInternalLeakStrings(kept.join("\n").replace(/\n{3,}/g, "\n\n").trim());
}

/**
 * BDL grounding leak — model hallucinations of internal grounding notes.
 * Pattern is intentionally broad so variants (different verbs, different surrounding text,
 * different BallDontLie phrasings) all collapse to the same strip.
 */


function buildMlbParlayUserPromptAppendix(question) {
  if (!detectParlayIntent(question)) return "";
  return `\n\n${buildMlbParlayResponseRule()}`;
}

function buildMlbPreMarketUserPrompt({
  question,
  mlbContext,
  derivedConfidence,
  priorTakesSummary,
  mlbVerifiedBlock,
}) {
  const gameTotals =
    mlbContext?.gameTotals &&
    typeof mlbContext.gameTotals === "object" &&
    !Array.isArray(mlbContext.gameTotals)
      ? mlbContext.gameTotals
      : {};
  const totalsKeys = Object.keys(gameTotals);
  const totalsPreview =
    totalsKeys.length > 0
      ? JSON.stringify(
          Object.fromEntries(totalsKeys.slice(0, 12).map((k) => [k, gameTotals[k]])),
          null,
          2,
        )
      : null;

  const totalsNote = totalsPreview
    ? `Listed game totals from payload only — cite these numbers verbatim when referencing a total:\n${totalsPreview}`
    : "No gameTotals in this payload — do not state a game total number.";

  return `You are answering an MLB betting question (structural / partial-board mode — same quality bar as full lines).

${priorTakesSummary ? priorTakesSummary + "\n\n" : ""}Question:
${question}

MLB context (JSON — authoritative for what exists; absence means unknown):
${contextJsonForModel(mlbContext)}

${mlbVerifiedBlock}

${totalsNote}

SERVER MODE — STRUCTURAL (mandatory)
- Do NOT invent prop numbers, K totals, strikeout lines, hitter lines, juice, or price quotes.
- Do NOT say or imply "expect K props at X", "books will price", "likely opens at", "look for under 6.5", or any fabricated numeric projection unless that exact number appears in propLines or gameTotals in the JSON above.
- Do NOT assume books are pricing anything until propLines lists the market.
- You MAY describe park factors and venue using games[].park (and named pitchers only when printed on that side — never invent a starter name).
- You MAY cite a game total ONLY from gameTotals in the JSON (exact number).

MLB ANTI-REFUSAL (mandatory)
- Never refuse, decline, or say you "cannot" give a mispricing read solely because probable starters are TBD, gameTotals is missing for some matchups, or a specific prop is not in propLines. TBD starters are normal pre-lock — open directly with park / bullpen / pace / leverage framing (the structural lean). Do not lead with starter uncertainty, probables caveats, or throat-clearing; the only starter caveat when TBD is the final sentence below.
- Never say "I can't call this mispriced" or any variant that declines the lean — deliver the structural angle, then hedge at the end.
- When probable starters or pitchers are still TBD in games[] or context, end the entire response with exactly one final sentence: "Confirm starters before placing." (after your lean — not instead of it.)
- You must still output a useful directional lean (over/under/side/watch) from structural anchors in games[], injuries, and any numbers present in gameTotals or propLines. If a posted total exists for a game, cite it verbatim; if not, discuss run environment qualitatively without inventing a line.

Answer structure:
1. Lean first — give a clear take (over/under/side/slight lean/close) even when market verification is missing.

2. Structural angles — park/run environment, role, matchup, and game-script framing without fake prop numbers.

3. What breaks the lean — one concrete condition that would invalidate or flip it.

4. Optional clarifier — ask for one compact missing market detail (exact line / market scope) to tighten the recommendation.

CONFIDENCE — cap at Medium; align tone with ${derivedConfidence}.

${buildMlbParlayUserPromptAppendix(question)}

${buildUrTakeSportTurnScopeRules("mlb")}

Rules:
- Do not invent unrelated games or props.
`;
}

function buildMlbActionableUserPrompt({
  question,
  mlbContext,
  derivedConfidence,
  priorTakesSummary,
  mlbVerifiedBlock,
}) {
  return `You are answering an MLB betting question.

${priorTakesSummary ? priorTakesSummary + "\n\n" : ""}Question:
${question}

MLB context:
${contextJsonForModel(mlbContext)}

Confidence guidance:
- Default confidence should be ${derivedConfidence}.
- Only go above that if the input strongly justifies it.

${mlbVerifiedBlock}

SERVER MODE — ACTIONABLE (propLines present in payload)
- You MAY cite specific prop lines ONLY when they appear in propLines (player, prop type, line, book/sportsbook field as given).
- You MAY cite game total numbers ONLY from gameTotals in the JSON.
- Do NOT invent props, K totals, or juice not shown in propLines or gameTotals.
- Do NOT claim books "will" open or price at a level without a listed line in propLines.

MLB ANTI-REFUSAL (mandatory)
- Never refuse the take solely because a probable pitcher is still TBD in games[] — open with the grounded lean from listed lines and structure; do not open with pitcher-TBD disclaimers or conditional throat-clearing.
- Never say "I can't call this mispriced" — commit to the lean from verified lines and structure, then hedge last.
- When starters are still TBD, end with exactly one sentence: "Confirm starters before placing."

${buildMlbParlayUserPromptAppendix(question)}

${buildUrTakeSportTurnScopeRules("mlb")}

Rules:
- Do not invent unrelated games or props.

Lead with the strongest grounded angle using verified lines from propLines. If starters are still TBD in games[], keep the body of the answer committed to structure and listed lines; close with "Confirm starters before placing." — do not front-load TBD or "conditional on confirmation" at the top.
`;
}

function buildMlbVerifiedPlayerListBlock(mlbContext, question = "") {
  const pitchers = [];
  const propListed = [];
  const pitSeen = new Set();
  const propSeen = new Set();
  const pitcherListLines = [];
  for (const g of mlbContext?.games || []) {
    const homeAbbr = String(g?.homeTeam?.abbr || "?").trim();
    const awayAbbr = String(g?.awayTeam?.abbr || "?").trim();
    const homePitcher = String(g?.homeTeam?.pitcher || "").trim() || "TBD";
    const awayPitcher = String(g?.awayTeam?.pitcher || "").trim() || "TBD";
    pitcherListLines.push(`${awayAbbr} @ ${homeAbbr}: ${awayPitcher} (away) vs ${homePitcher} (home)`);

    for (const side of ["homeTeam", "awayTeam"]) {
      const pit = g?.[side]?.pitcher;
      if (pit == null) continue;
      const n = String(pit).trim();
      if (n && !pitSeen.has(n)) {
        pitSeen.add(n);
        pitchers.push(n);
      }
    }
  }
  pitchers.sort();
  for (const pl of mlbContext?.propLines || []) {
    if (!pl?.player) continue;
    const n = String(pl.player).trim();
    if (n && !propSeen.has(n)) {
      propSeen.add(n);
      propListed.push(n);
    }
  }
  propListed.sort();
  const pitcherList = pitcherListLines.length > 0 ? pitcherListLines.join("\n") : "(no games in payload)";

  const merged = mergeVerifiedNamesWithFallback(
    [...pitchers, ...propListed],
    MLB_ALWAYS_INCLUDE,
  );
  const asked = extractMentionedPersonFromQuestion(question, merged);

  return `MLB SLATE (live probables + prop board + known-star fallback):
Pitcher matchups:
${pitcherList}

Pitchers: ${pitchers.length ? pitchers.join(", ") : "(none in games array)"}
Prop-listed players: ${propListed.length ? propListed.join(", ") : "(none)"}
Known active pool (fallback): ${merged.join(", ")}
${asked ? `\nUser-mentioned player anchor: ${asked} — analyze even if not yet on tonight's prop board; say "live slate data unavailable for [player]" instead of refusing.` : ""}

FIELD RULES:
- Prefer probables and prop-listed names for "playing tonight" and posted-line questions.
- For any known MLB player the user names (including recent call-ups), give structural/form analysis even if absent from propLines — never say "not in the verified field" or refuse solely because they are missing from the list.
When a pitcher shows as "TBD", still open with park, bullpen leverage, run environment, and game state — do not lead with "starter TBD for [team]" or similar upfront caveats; reserve starter uncertainty for the closing sentence "Confirm starters before placing." Never refuse solely because starters are unsettled.`;
}

function buildNflVerifiedPlayerListBlock(nflContextEffective, question = "") {
  const live = [];
  if (nflContextEffective && typeof nflContextEffective === "object" && !Array.isArray(nflContextEffective)) {
    const ui = nflContextEffective.uiPlayers;
    if (ui && typeof ui === "object") {
      for (const k of Object.keys(ui)) {
        const t = String(k).trim();
        if (t) live.push(t);
      }
    }
  }
  const merged = mergeVerifiedNamesWithFallback(live, NFL_ALWAYS_INCLUDE).sort();
  const asked = extractMentionedPersonFromQuestion(question, merged);
  const staleNote =
    "Board names are directional when labeled offseason — treat usage/role from payload first.";
  if (merged.length === 0) {
    return `NFL PLAYER POOL NOTE: Live board is empty.
For any known NFL player in the user's question, still give role/matchup analysis — say "live usage data unavailable for [player]" instead of refusing.

${staleNote}`;
  }
  return `NFL PLAYER POOL (board + known active fallback):
${merged.join(", ")}

${staleNote}
${asked ? `\nUser-mentioned player anchor: ${asked} — analyze even if missing from the live board; never refuse as "not in verified field."` : ""}

FIELD RULES:
- Prefer board names for posted prop/usage lines.
- For any known NFL professional the user names, provide analysis even when board rows are missing — note "live usage data unavailable" rather than refusing.`;
}

function buildNflDraftProspectBlock(draftBundle) {
  const prospects = Array.isArray(draftBundle?.prospects) ? draftBundle.prospects : [];
  if (!prospects.length) {
    return `DRAFT PROSPECT ANCHORS: unavailable in active bundle.
If a user asks for a non-board name, label it "simulation-only (UDFA-range)" and do not present it as an official slot outcome.`;
  }
  const lines = prospects.map((p) => {
    const status =
      p?.boardStatus === "verified_pool"
        ? "verified_pool"
        : p?.boardStatus === "boarded"
          ? "boarded"
          : "simulation-only";
    let stats = "stats: n/a";
    if (typeof p?.nflGrade === "number" && Number.isFinite(p.nflGrade)) {
      stats = `NFL grade: ${p.nflGrade}`;
    } else if (p?.keyStats && typeof p.keyStats === "object") {
      stats = Object.entries(p.keyStats)
        .slice(0, 3)
        .map(([k, v]) => `${k}:${v}`)
        .join(" | ");
    }
    const band = p?.projectedRange ? `slot band ${p.projectedRange}` : "slot band n/a";
    const cr = p?.consensusRank != null ? `consensus #${p.consensusRank}` : "";
    return `- ${p.name} (${p.position}, ${p.school}) [${status}] — ${band}${cr ? `; ${cr}` : ""} — ${stats}`;
  });
  return `VERIFIED 2026 DRAFT PROSPECT ANCHORS:
${lines.join("\n")}

Roster-grounding rule for draft names:
- If a requested prospect is NOT in this list, you must label them exactly as "simulation-only (UDFA-range)".
- You may discuss fit hypotheticals, but you must not present them as locked pick outcomes in official board language.`;
}

function buildDraftProspectsByPositionBlock(draftBundle) {
  const prospects = Array.isArray(draftBundle?.prospects)
    ? draftBundle.prospects.filter((p) => Number(p?.projectedRound || 9) <= 4)
    : [];
  if (!prospects.length) return "(verified rounds 1-4 pool unavailable)";
  const grouped = {};
  for (const p of prospects) {
    const pos = String(p.position || "UNK").toUpperCase();
    if (!grouped[pos]) grouped[pos] = [];
    grouped[pos].push(p);
  }
  const lines = [];
  for (const pos of Object.keys(grouped).sort()) {
    const row = grouped[pos]
      .sort(
        (a, b) =>
          Number((a.consensusRank ?? a.overallRank) || 999) -
          Number((b.consensusRank ?? b.overallRank) || 999),
      )
      .slice(0, 10)
      .map((p) => `${p.name} (${p.school}) #${p.consensusRank ?? p.overallRank}`)
      .join(", ");
    lines.push(`${pos}: ${row}`);
  }
  return lines.join("\n");
}

function collectTennisVerifiedNames(players, liveMatches) {
  const set = new Set();
  for (const tour of ["atp", "wta"]) {
    const o = players?.[tour];
    if (o && typeof o === "object") {
      for (const k of Object.keys(o)) {
        const n = String(k).trim();
        if (n) set.add(n);
      }
    }
  }
  for (const m of liveMatches || []) {
    const h = String(m?.home_team || m?.raw?.home_team || m?.raw?.home || "").trim();
    const a = String(m?.away_team || m?.raw?.away_team || m?.raw?.away || "").trim();
    if (h) set.add(h);
    if (a) set.add(a);
  }
  return set;
}

function buildTennisVerifiedPlayerListBlock(players, liveMatches, question = "") {
  const live = [...collectTennisVerifiedNames(players, liveMatches)];
  const merged = mergeVerifiedNamesWithFallback(live, TENNIS_ALWAYS_INCLUDE).sort();
  const asked = extractMentionedPersonFromQuestion(question, merged);
  if (merged.length === 0) {
    return `TENNIS PLAYER POOL NOTE: Live board and database keys are empty.
For any player the user names, still give surface/form analysis — say "live draw data unavailable" instead of refusing.`;
  }
  return `TENNIS PLAYER POOL (live board + ATP/WTA keys + tour fallback):
${merged.join(", ")}
${asked ? `\nUser-mentioned player anchor: ${asked} — analyze even if not on today's live board.` : ""}

FIELD RULES:
- Prefer this list and liveMatches for draw-specific and live-match questions.
- For any top/pro tour player the user names (including recent qualifiers), provide analysis even if missing from live board — note "live draw data unavailable" rather than refusing.
- Never say a legitimate tour player is "not in the verified field."`;
}

function collectGolfVerifiedNames(golfContext) {
  return new Set(buildCombinedVerifiedGolfField(golfContext));
}

function extractGolfPlayerMentionFromQuestion(question, golfContext) {
  const q = String(question || "").trim();
  if (!q) return null;
  const field = buildCombinedVerifiedGolfField(golfContext || {});
  for (const name of field) {
    const nl = name.toLowerCase();
    if (nl.length >= 4 && q.toLowerCase().includes(nl)) return name;
    const last = normalizeGolfName(name).lastName;
    if (last && last.length >= 4 && new RegExp(`\\b${last}\\b`, "i").test(q)) return name;
  }
  const parts = q.split(/\s+/).filter((w) => w.length >= 3);
  for (let i = 0; i < parts.length - 1; i++) {
    const two = `${parts[i]} ${parts[i + 1]}`;
    if (isKnownPgaTourPlayer(two)) return two;
  }
  return null;
}

function buildGolfVerifiedPlayerListBlock(golfContext) {
  const sorted = buildCombinedVerifiedGolfField(golfContext).sort();
  const asked = extractGolfPlayerMentionFromQuestion(golfContext?.question, golfContext);
  const askedKnown =
    asked && isKnownPgaTourPlayer(asked)
      ? resolveGolfPlayerInField(asked, sorted) || asked
      : null;

  if (sorted.length === 0) {
    return `GOLF FIELD NOTE: Live leaderboard and field lists are empty in this payload.
For any known PGA Tour professional in the user's question, still provide course-fit and form analysis from season context — note "leaderboard position not yet available" instead of refusing.`;
  }

  const askedLine = askedKnown
    ? `\nUser-mentioned golfer anchor: ${askedKnown} (known PGA Tour pro — analyze even if live position is missing from feed).`
    : "";

  return `GOLF FIELD (live leaderboard + rankings + odds field + major-championship fallback):
${sorted.join(", ")}
${askedLine}

FIELD RULES:
- Prefer this list for live position, cut-line, and "who's leading" questions.
- For prop / top-20 / matchup questions about any known PGA Tour professional (including names in the user's question), provide analysis even when live leaderboard rows are missing — say "leaderboard position not yet available" rather than refusing.
- Never tell the user a legitimate PGA Tour pro is "not in the field" or "not in the verified field."`;
}

function buildF1VerifiedDriverListBlock(f1Context, question = "") {
  const live = [];
  for (const row of f1Context?.standings || []) {
    const n = String(row?.full_name || "").trim();
    if (n) live.push(n);
  }
  const merged = mergeVerifiedNamesWithFallback(live, F1_ALWAYS_INCLUDE).sort();
  const asked = extractMentionedPersonFromQuestion(question, merged);
  if (merged.length === 0) {
    return `F1 DRIVER POOL NOTE: Standings payload is empty.
For any F1 driver the user names, still give weekend/form analysis — say "live standings data unavailable" instead of refusing.`;
  }
  return `F1 DRIVER POOL (standings + grid fallback):
${merged.join(", ")}
${asked ? `\nUser-mentioned driver anchor: ${asked} — analyze even if missing from standings (e.g. reserve/sub).` : ""}

FIELD RULES:
- Prefer standings/session fields for grid-position questions.
- For any F1 driver the user names (including reserves/replacements), provide analysis even when standings rows are missing — note "live standings data unavailable" rather than refusing.
- Never say a legitimate F1 driver is "not in the verified field."`;
}

function golfClientCourseArtifactsMisaligned(g) {
  if (!g || typeof g !== "object") return false;
  const beforeStats = Array.isArray(g.courseStats) ? g.courseStats.length : 0;
  const stripped = stripMisalignedGolfCourseArtifacts(g);
  const afterStats = Array.isArray(stripped.courseStats) ? stripped.courseStats.length : 0;
  if (beforeStats > 0 && afterStats === 0) return true;
  const beforeCourse =
    g.course && typeof g.course === "object"
      ? String(g.course.name || "").trim()
      : String(g.course || "").trim();
  const afterCourse =
    stripped.course && typeof stripped.course === "object"
      ? String(stripped.course.name || "").trim()
      : String(stripped.course || "").trim();
  return Boolean(beforeCourse && afterCourse && beforeCourse !== afterCourse);
}

/** Same slim shape as client `buildGolfContext` (App.jsx) — keeps model JSON aligned with the browser path. */
function slimUnifiedGolfBoardForUrTake(board, questionText) {
  const g = stripMisalignedGolfCourseArtifacts(
    board && typeof board === "object" ? board : null,
  );
  if (!g) return null;
  const primary = resolveGolfPrimaryEvent(g);
  const lb = (rows) => (Array.isArray(rows) ? rows.slice(0, 48) : []);
  const slimTournament = (t) => {
    if (!t || typeof t !== "object") return null;
    return {
      name: t.name ?? null,
      shortName: t.shortName ?? null,
      state: t.state ?? null,
      round: t.round ?? null,
      venue: t.venue ?? null,
      leaderboard: lb(t.leaderboard),
    };
  };
  return {
    currentEvent: primary
      ? {
          name: primary.name || null,
          shortName: primary.shortName || null,
          course: primary.course || primary.courseName || null,
          location: primary.location || null,
          round: primary.round || null,
          state: primary.state || null,
          leaderboard: lb(primary.leaderboard || g.currentEvent?.leaderboard),
        }
      : null,
    tournament: slimTournament(g.tournament),
    course: g.course || null,
    rankings: (g.rankings || []).slice(0, 12),
    odds: {
      outrights: (g.odds?.outrights || []).slice(
        0,
        g.odds?.hasPostedLines ? 48 : 16,
      ),
      topFinish:
        g.odds?.topFinish && typeof g.odds.topFinish === "object"
          ? Object.fromEntries(Object.entries(g.odds.topFinish).slice(0, 24))
          : {},
      makeCut:
        g.odds?.makeCut && typeof g.odds.makeCut === "object"
          ? Object.fromEntries(Object.entries(g.odds.makeCut).slice(0, 24))
          : {},
      linesUnavailable: Boolean(g.odds?.linesUnavailable),
      hasPostedLines: Boolean(
        g.odds?.hasPostedLines ||
          (g.odds?.outrights || []).some(
            (o) => o?.odds != null && Number.isFinite(Number(o.odds)),
          ),
      ),
      fetchedAt: g.odds?.fetchedAt || null,
      freshness: g.odds?.freshness || null,
      source: g.odds?.source || null,
    },
    recentResults: (g.recentResults || []).slice(0, 10),
    courseStats: (g.courseStats || []).slice(0, 8),
    fieldRoster: Array.isArray(g.fieldRoster) ? g.fieldRoster.slice(0, 120) : [],
    question: questionText || "",
    questionEventAlignment: g.questionEventAlignment || null,
  };
}

function resolveGolfQuestionAlignmentArg(golfContextEffective) {
  const align = golfContextEffective?.questionEventAlignment;
  if (!align?.requestedLabel || !align?.requestedSlug) return align ?? null;
  const ce = golfContextEffective?.currentEvent;
  if (
    ce &&
    golfLabelsMatchIntent(ce.name, ce.shortName, {
      slug: align.requestedSlug,
      label: align.requestedLabel,
    })
  ) {
    return null;
  }
  return align;
}

function buildGolfQuestionAlignmentPromptBlock(alignment, currentEvent) {
  if (!alignment?.requestedLabel) return "";
  const slug = alignment.requestedSlug || "";
  const forbidden = GOLF_INTENT_WRONG_COURSE_FRAGMENTS[slug] || [];
  const forbiddenLine = forbidden.length
    ? `- FORBIDDEN VENUES for this question (do not name or describe): ${forbidden.join(", ")}.`
    : "";
  const course = String(currentEvent?.course || "").trim();
  const courseLine =
    course && course !== "TBD"
      ? `- Verified course for this event in payload: ${course}. Cite only this venue.`
      : `- currentEvent.course is TBD — do NOT invent or recall a course name from memory; describe tournament/setup only from leaderboard and odds in the payload.`;

  const prevName = String(alignment.previousFeedEvent || "").trim();
  const requested = String(alignment.requestedLabel || "").trim();
  const realigned = prevName.length > 0 && prevName !== requested;

  if (realigned) {
    const prev = ` The live-feed default week was "${alignment.previousFeedEvent}" — ignore that event entirely.`;
    return `
QUESTION EVENT ALIGNMENT (mandatory):
The user asked about "${alignment.requestedLabel}".${prev}
- Ground every answer in currentEvent for "${alignment.requestedLabel}" only.
- If currentEvent.state is pre/upcoming or leaderboard is empty: treat as pre-tournament — do NOT cite live scores, positions, or course conditions from any other PGA Tour week.
${courseLine}
${forbiddenLine}`;
  }

  const minimal = [courseLine, forbiddenLine].filter(Boolean).join("\n");
  if (!minimal) return "";
  return `\n${minimal}\n`;
}

function golfClientContextLooksUsable(g) {
  if (!g || typeof g !== "object") return false;
  if (String(g.currentEvent?.name || "").trim()) return true;
  if (Array.isArray(g.currentEvent?.leaderboard) && g.currentEvent.leaderboard.length > 0) return true;
  if (
    Array.isArray(g.odds?.outrights) &&
    g.odds.outrights.some((o) => o?.odds != null && Number.isFinite(Number(o.odds)))
  ) {
    return true;
  }
  if (String(g.tournament?.name || "").trim()) return true;
  return false;
}

function buildMessagesForAnthropic({ userPrompt, history, intent, hasImage, image }) {
  const priorRaw =
    intent === "slip_review" ? [] : normalizeIncomingChatHistory(history, { maxMessages: 4 });
  const prior = priorRaw
    .map((row) => ({
      role: row.role,
      content: compactHistoryContentForAnthropic(row),
    }))
    .filter((m) => m.content);

  if (hasImage) {
    const content = [];
    let textBlock = userPrompt;
    if (prior.length) {
      const transcript = prior
        .map((m) => `${m.role === "user" ? "User" : "Assistant"}: ${m.content}`)
        .join("\n\n");
      textBlock = `Prior conversation (most recent last):\n${transcript}\n\n---\n\nCurrent message:\n${userPrompt}`;
    }
    content.push({ type: "text", text: textBlock });
    content.push({
      type: "image",
      source: {
        type: "base64",
        media_type: image.mediaType,
        data: image.base64,
      },
    });
    return [{ role: "user", content }];
  }

  return [...prior, { role: "user", content: userPrompt }];
}

/**
 * Dev-only audit log for NBA UR Take grounding (no images, no raw user text).
 * Enable with UR_TAKE_NBA_AUDIT_LOG=1 in the API environment.
 * @param {Record<string, unknown>} payload
 */
function logNbaUrTakeAuditIfDev(payload) {
  if (String(process.env.UR_TAKE_NBA_AUDIT_LOG ?? "").trim() !== "1") return;
  try {
    console.log(JSON.stringify({ event: "ur_take_nba_audit", ...payload }));
  } catch {
    // ignore logging failures
  }
}

/** Production-safe: always log when `/api/ur-take` returns a generic feed snag (no env gates). */
function logUrTakeApiFallback(payload) {
  const raw = payload.rawModelText != null ? String(payload.rawModelText) : "";
  console.error("[urTakeApiFallback]", {
    requestId: payload.requestId ?? null,
    fallbackReason: payload.fallbackReason,
    sport: payload.sport ?? null,
    providerStatus: payload.providerStatus ?? null,
    providerErrorName: payload.providerErrorName ?? null,
    providerErrorMessage: payload.providerErrorMessage ?? null,
    parseErrorMessage: payload.parseErrorMessage ?? null,
    validationErrors: payload.validationErrors ?? null,
    responseKeys: payload.responseKeys ?? null,
    structuredKeys: payload.structuredKeys ?? null,
    rawModelTextPresent: Boolean(raw.length),
    rawModelTextLength: raw.length,
    questionLength: typeof payload.questionLength === "number" ? payload.questionLength : 0,
    parsedKeys: payload.parsedKeys ?? null,
    stack: payload.stack,
    authReason: payload.authReason ?? null,
    sanitizeCode: payload.sanitizeCode ?? null,
    sanitizeError: payload.sanitizeError ?? null,
    extra: payload.extra,
  });
}

// ── Main Handler ────────────────────────────────────────────────────────────
export default async function handler(req, res) {
  const requestStart = Date.now();
  let nbaBoardBuildMs = 0;
  let anthropicMs = 0;
  let haikuFollowUpsMs = 0;
  /** Reserved before any answer path; released in `finally` unless delivered. */
  let gateQuotaReservation = null;
  let gateQuotaDelivered = false;
  let gateQuotaEmail = null;
  let gateQuotaSessionId = null;
  if (!applyCors(req, res, { methods: "POST, OPTIONS" })) return;
  if (req.method === "OPTIONS") return res.status(200).end();

  const requestId =
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID().replace(/-/g, "").slice(0, 12)
      : `rq${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

  console.log(
    JSON.stringify({
      tag: "[urTakeRequest]",
      requestId,
      event: "ur_take_request_start",
      contentLength: Number(req.headers["content-length"]) || null,
    }),
  );

  const feedSnagResponse = (sportVal, fallbackReason, logCtx = {}) => {
    const reason =
      typeof fallbackReason === "string" && fallbackReason.trim()
        ? fallbackReason.trim()
        : "unknown_server_fallback";
    const userMessages = {
      ip_rate_limited:
        "Too many requests from this connection — wait a minute and try again.",
      email_rate_limited:
        "Too many requests on this account — wait a minute and try again.",
      limit_reached:
        "You've used your free questions for today. Come back tomorrow or upgrade to Pro for unlimited takes.",
      email_required:
        "You've used your 3 free preview questions. Sign in with email to continue.",
      auth_verify_failed:
        "Session expired — refresh the page and try again.",
    };
    const text =
      userMessages[reason] ||
      "The feed hit a snag on that one — try rephrasing or ask about a specific player or matchup and I'll work with what's available.";
    const sportOut = sportVal || "unknown";
    const q = String(logCtx.question ?? req.body?.question ?? "");
    const rawModelText =
      logCtx.rawModelText != null
        ? String(logCtx.rawModelText)
        : logCtx.rawModelTextSlice != null
          ? String(logCtx.rawModelTextSlice)
          : "";
    logUrTakeApiFallback({
      requestId,
      fallbackReason: reason,
      sport: sportOut,
      providerStatus: logCtx.providerStatus ?? null,
      providerErrorName: logCtx.providerErrorName ?? null,
      providerErrorMessage: logCtx.providerErrorMessage ?? null,
      parseErrorMessage: logCtx.parseErrorMessage ?? null,
      validationErrors: logCtx.validationErrors ?? null,
      responseKeys: ["requestId", "response", "take", "confidence", "sport", "fallback", "fallbackReason"],
      structuredKeys: logCtx.structuredKeys ?? null,
      rawModelText,
      questionLength: q.length,
      parsedKeys: logCtx.parsedKeys ?? null,
      stack: logCtx.err?.stack ? String(logCtx.err.stack).slice(0, 2000) : undefined,
      authReason: logCtx.authReason ?? null,
      sanitizeCode: logCtx.sanitizeCode ?? null,
      sanitizeError: logCtx.sanitizeError ?? null,
      extra: logCtx.extra,
    });
    return res.status(200).json({
      requestId,
      response: text,
      take: text,
      confidence: "none",
      sport: sportOut,
      fallback: true,
      fallbackReason: reason,
    });
  };

  if (req.method !== "POST") {
    return feedSnagResponse(null, "http_method_not_post");
  }

  const dailyTakePipeline =
    Boolean(process.env.CRON_SECRET) &&
    String(req.headers["x-daily-take-internal"] ?? "").trim() === "1" &&
    req.headers.authorization === `Bearer ${process.env.CRON_SECRET}`;

  const clientIp = getClientIp(req);
  if (!dailyTakePipeline && !allowRateLimit(`urtake:ip:${clientIp}`, ipLimit())) {
    return feedSnagResponse(null, "ip_rate_limited");
  }

  /** @type {{ ok: true, email: string | null, tier: string } | { ok: false, reason: string } | null} */
  let urAuth = null;
  if (dailyTakePipeline) {
    urAuth = { ok: true, email: null, tier: "pro" };
  } else if (shouldRequireUrTakeAuth()) {
    urAuth = verifyBearerForUrTake(req.headers.authorization);
    if (!urAuth.ok) {
      if (urAuth.reason === "server_misconfigured") {
        return feedSnagResponse(null, "auth_server_misconfigured");
      }
      return feedSnagResponse(null, "auth_verify_failed", { authReason: urAuth.reason });
    }
    if (urAuth.email && !allowRateLimit(`urtake:email:${urAuth.email}`, emailLimit())) {
      return feedSnagResponse(null, "email_rate_limited", {
        extra: { emailDomain: String(urAuth.email).split("@")[1] || "" },
      });
    }
  }

  const sanitized = sanitizeUrTakeBody(req.body);
  if (!sanitized.ok) {
    const hint =
      req.body && typeof req.body === "object" && req.body !== null && "sportHint" in req.body
        ? /** @type {{ sportHint?: string }} */ (req.body).sportHint
        : null;
    const sportForSnag =
      typeof hint === "string" && hint.trim() ? hint.trim() : null;
    return feedSnagResponse(sportForSnag, `request_body_${String(sanitized.code || "invalid")}`, {
      sanitizeCode: sanitized.code ?? null,
      sanitizeError: sanitized.error ?? null,
    });
  }
  req.body = sanitized.body;

  if (urAuth?.ok && urAuth.email) {
    req.body.userEmail = urAuth.email;
  }

  const userTier = urAuth?.tier ?? "free";
  const isPro = ["pro", "owner", "friend"].includes(userTier);

  const goldenEvalCaseId = isGoldenEvalMode()
    ? String(
        req.body?.goldenEvalCaseId ||
          process.env.UR_TAKE_GOLDEN_EVAL_CASE ||
          "",
      ).trim()
    : "";
  if (goldenEvalCaseId) {
    setActiveGoldenEvalCase(goldenEvalCaseId);
  }

  let ANTHROPIC_API_KEY = getEnv("ANTHROPIC_API_KEY");
  const ANTHROPIC_MODEL = getEnv("ANTHROPIC_MODEL") || "claude-sonnet-4-20250514";

  if (
    !ANTHROPIC_API_KEY &&
    isGoldenEvalMode() &&
    goldenEvalCaseId &&
    getGoldenEvalFixtureById(goldenEvalCaseId)?.anthropicPayload
  ) {
    ANTHROPIC_API_KEY = "golden-eval-fixture";
  }

  if (!ANTHROPIC_API_KEY) {
    return feedSnagResponse(
      typeof req.body?.sportHint === "string" && req.body.sportHint.trim()
        ? req.body.sportHint.trim()
        : null,
      "missing_provider_key",
    );
  }

  // Structured redesign: ON by default when client opts in (structured:true).
  // Set STRUCTURED_UR_TAKE_MODE=0 (or false/off) on the server to disable without redeploying the client.
  const structuredUrTakeGloballyDisabled = (() => {
    const v = String(process.env.STRUCTURED_UR_TAKE_MODE ?? "")
      .trim()
      .toLowerCase();
    return v === "0" || v === "false" || v === "off" || v === "no";
  })();
  /** Backup opt-in if JSON body loses `structured` in transit (proxy/middleware). Browser sends `X-UR-Take-Structured: 1`. */
  const structuredHeaderRequested =
    String(req.headers["x-ur-take-structured"] ?? "").trim() === "1";
  /** Immutable for the whole request — never flip false on parse failure or QA loses structured instructions on retry. */
  const structuredModeRequested =
    !structuredUrTakeGloballyDisabled &&
    (req.query?.structured === "true" ||
      req.body?.structured === true ||
      structuredHeaderRequested);

  const {
    userEmail,
    sportHint: incomingSportHint,
    teamHint,
    players,
    context,
    liveMatches,
    golfContext,
    nbaContext: nbaContextFromClient,
    mlbContext: mlbContextFromClient,
    f1Context: f1ContextFromClient,
    nflContext,
    matchupContext,
    image,
    history: incomingHistory,
    wcEventId: incomingWcEventId,
  } = req.body || {};
  let question = autocorrectUrTakeQuestion(String(req.body?.question || "").trim()).text;
  const bettingStyle =
    req.body?.bettingStyle === "limits"
      ? "limits"
      : "balanced";

  const normalizedUrTakeHistoryForGate = normalizeIncomingChatHistory(incomingHistory);
  const conversationFollowUpMeta = resolveUrTakeConversationFollowUp(
    String(question || ""),
    normalizedUrTakeHistoryForGate,
  );
  const isConversationFollowUp = conversationFollowUpMeta.isFollowUp;
  if (
    isConversationFollowUp &&
    conversationFollowUpMeta.reason !== "history_length" &&
    normalizedUrTakeHistoryForGate.length <= 1
  ) {
    console.warn(
      JSON.stringify({
        event: "ur_take_follow_up_thin_history",
        reason: conversationFollowUpMeta.reason,
        normalizedHistoryLength: normalizedUrTakeHistoryForGate.length,
        incomingHistoryLength: Array.isArray(incomingHistory) ? incomingHistory.length : 0,
        recapUserLines: countUrTakeClientRecapUserLines(String(question || "")),
        questionHead: String(question || "").slice(0, 160),
      }),
    );
  }
  const routingQuestionEarly = extractLatestUserTurnForRouting(String(question || ""));

  if (!question || !String(question).trim()) {
    return feedSnagResponse(
      typeof incomingSportHint === "string" && incomingSportHint.trim()
        ? incomingSportHint.trim()
        : null,
      "empty_question",
    );
  }

  // Reserve free-tier quota before NBA shortcuts, context fallbacks, or Anthropic — fail closed if KV is down.
  const gateQuotaReserve = await reserveUrTakeGateQuota({ urAuth, dailyTakePipeline });
  if (!gateQuotaReserve.ok) {
    if (gateQuotaReserve.reason === "storage_unavailable") {
      return res.status(503).json({
        requestId,
        error: "quota_unavailable",
        code: "quota_storage_unavailable",
        response:
          "We could not verify your free questions right now — try again in a moment.",
      });
    }
    return res.status(200).json({
      requestId,
      response:
        gateQuotaReserve.reason === "email_required"
          ? "You've used your 3 free preview questions. Sign in with email to continue."
          : "You've used your free questions for today. Come back tomorrow or upgrade to Pro for unlimited takes.",
      take:
        gateQuotaReserve.reason === "email_required"
          ? "You've used your 3 free preview questions. Sign in with email to continue."
          : "You've used your free questions for today. Come back tomorrow or upgrade to Pro for unlimited takes.",
      confidence: "none",
      sport:
        typeof incomingSportHint === "string" && incomingSportHint.trim()
          ? incomingSportHint.trim()
          : "unknown",
      fallback: true,
      ...gateQuotaReserve.statusBody,
    });
  }
  if (gateQuotaReserve.enforced) {
    gateQuotaReservation = gateQuotaReserve.reservation;
    gateQuotaEmail = gateQuotaReserve.gateQuotaEmail;
    gateQuotaSessionId = gateQuotaReserve.gateQuotaSessionId;
  }

  const hasImage = !!image?.base64;
  const routingQuestion = routingQuestionEarly;
  const wcRunnerUpFollowUpQuestion =
    isWcRunnerUpValueFollowUp(String(question || "")) ||
    isWcRunnerUpValueFollowUp(routingQuestion);

  const intent = detectIntent(routingQuestion, hasImage);
  const chaseSignals = detectChaseSignals(routingQuestion, incomingHistory);
  const shortMarketFollowUp = isShortMarketFollowUp(routingQuestion);
  const hasLiveTranscriptContext = hasRecentLiveScreenshotContext(incomingHistory);
  if (chaseSignals.isChase) {
    console.log(
      JSON.stringify({
        event: "chase_detected",
        userEmail: userEmail || "anonymous",
        sameTopicCount: chaseSignals.sameTopicCount,
        hasChaseLanguage: chaseSignals.hasChaseLanguage,
        hasHedgingPanicLanguage: chaseSignals.hasHedgingPanicLanguage,
        question: String(question).slice(0, 200),
        ts: new Date().toISOString(),
      }),
    );
  }
  const liveKeywordSignals = detectLiveGameSignals(routingQuestion, hasImage);

  const uiSportHintForRouting =
    typeof incomingSportHint === "string" && incomingSportHint.trim()
      ? incomingSportHint.trim()
      : null;

  let sportHint = resolveSportHint({
    incomingSportHint,
    question,
    matchupContext,
    hasImage,
    golfContext,
    chatHistory: incomingHistory,
  });

  if (uiSportHintForRouting === "worldcup" || questionMentionsWorldCup(question)) {
    sportHint = "worldcup";
  }

  const sportSwitched = sportsContextSwitched(uiSportHintForRouting, sportHint);
  if (sportSwitched) {
    console.log(
      JSON.stringify({
        event: "ur_take_sport_context_switch",
        from: uiSportHintForRouting,
        to: sportHint,
        questionHead: String(question || "").slice(0, 120),
      }),
    );
  }
  const firstSessionNoHistory = !Array.isArray(incomingHistory) || incomingHistory.length === 0;
  let firstSessionGuaranteeFeature = null;
  let preloadedNbaBoard = null;
  if (
    shouldRunNbaFirstSessionGuarantee({
      firstSessionNoHistory,
      hasImage,
      sportHint,
      uiSportHint: uiSportHintForRouting,
      question,
      wcEventId: incomingWcEventId,
    })
  ) {
    try {
      const fresh = await buildNbaUrTakeBoard(routingQuestion);
      const featured = selectTopNbaSlateGameForGuarantee(fresh);
      if (featured?.game) {
        preloadedNbaBoard = fresh;
        firstSessionGuaranteeFeature = featured;
        sportHint = "nba";
      }
    } catch (err) {
      console.warn("[ur-take] first-session guarantee board load failed:", err?.message || err);
    }
  }
  if (
    (sportHint === "generic" || sportHint === "image_review") &&
    questionMentionsWorldCup(question)
  ) {
    sportHint = "worldcup";
  }

  const detectedSport = sportHint;
  console.log("[ur-take] request:", {
    sport: detectedSport,
    questionSlice: question?.slice(0, 80),
  });
  const nbaDebugEnabled = isTruthyFlag(getEnv("UR_TAKE_NBA_DEBUG"));

  /** Server-authoritative slate — drop stale client payloads when UI sport ≠ routed sport. */
  let nbaContext =
    sportSwitched && sportHint !== "nba" ? null : nbaContextFromClient;
  let mlbContext =
    sportSwitched && sportHint !== "mlb" ? null : mlbContextFromClient;
  let golfContextEffective =
    sportSwitched && sportHint !== "golf" ? null : golfContext;
  let f1Context =
    sportSwitched && sportHint !== "f1" ? null : f1ContextFromClient;
  let wcContext = null;
  /** @type {import("../../shared/wcGroupComposition.js").ReturnType<typeof buildWcCrossGroupValuePrebuiltStructured> | null} */
  let wcCrossGroupPrebuiltEarly = null;
  /** @type {import("../../shared/wcTomorrowSlatePrebuilt.js").ReturnType<typeof buildWcTomorrowSlatePrebuiltStructured> | null} */
  let wcTomorrowSlatePrebuiltEarly = null;
  /** @type {import("../../shared/wcFixtureMatchupPrebuilt.js").ReturnType<typeof buildWcFixtureMatchupPrebuiltStructured> | null} */
  let wcFixtureMatchupPrebuiltEarly = null;
  /** @type {import("../../shared/wcFixtureMatchupPrebuilt.js").ReturnType<typeof buildWcFixtureMatchupPrebuiltStructured> | null} */
  let wcFixtureAltFollowUpPrebuiltEarly = null;
  /** @type {Record<string, { advancePct?: number }> | null} */
  let wcFixturePrebuiltTeamStats = null;
  /** @type {{ wcIntent: string | null, mentionedTeams: string[], requiredEntities: string[], knockoutRulesInjected: boolean, structuralEdgeInjected: boolean, playerPropDetected: boolean, wcEventId: string | null, qaEntityMatch: string | null, qaIntentMatch: string | null, qaPlayerMatch: string | null }} */
  const wcRelevanceLog = {
    wcIntent: null,
    mentionedTeams: [],
    requiredEntities: [],
    knockoutRulesInjected: false,
    structuralEdgeInjected: false,
    playerPropDetected: false,
    playerMarketTier: null,
    wcEventId: null,
    qaEntityMatch: null,
    qaIntentMatch: null,
    qaPlayerMatch: null,
  };
  let nbaRelevanceMustFetch = null;
  let nbaRelevanceServerBoardFetched = false;
  let nbaRelevanceClientContextUsable = null;
  let nbaLiveBoardRefreshForced = false;
  let nbaClientContextIgnored = false;
  let nbaFinalsOutrightsBlock = null;
  let nbaFinalsContextBlock = null;
  let nbaIntentForHandler = null;
  /** @type {{ finalsMode: boolean, seriesState: object | null }} */
  let nbaFinalsModeMeta = { finalsMode: false, seriesState: null };
  /** @type {{ outrightsInjected: boolean, seriesStale: boolean, mvpStale: boolean, seriesAgeMinutes: number | null, mvpAgeMinutes: number | null } | null} */
  let nbaFinalsOutrightsMeta = null;
  let wcIntent = null;
  let wcRequiredEntities = [];
  let wcForbiddenEntities = [];
  /** @type {Record<string, string>} */
  let wcStrengthTags = {};
  if (sportHint === "worldcup" || questionMentionsWorldCup(question)) {
    if (sportHint !== "worldcup") sportHint = "worldcup";
    wcIntent = classifyWcQuestionIntent(routingQuestion, incomingHistory);
    wcRequiredEntities = resolveRequiredEntities(routingQuestion, incomingHistory, wcIntent);
    wcRelevanceLog.wcIntent = wcIntent;
    wcRelevanceLog.mentionedTeams = extractMentionedWcTeams(String(question || ""));
    wcRelevanceLog.requiredEntities = wcRequiredEntities;
    wcRelevanceLog.knockoutRulesInjected = shouldInjectStaticRules(String(question || ""), wcIntent);
    wcRelevanceLog.playerPropDetected = isWcPlayerMarketIntent(wcIntent);
    wcRelevanceLog.playerMarketTier = wcContext?.playerMarketTier || null;
    const wcEventIdTrimmed =
      incomingWcEventId != null && String(incomingWcEventId).trim()
        ? String(incomingWcEventId).trim()
        : null;
    wcRelevanceLog.wcEventId = wcEventIdTrimmed;
    const sessionEntities = extractSessionWcEntities(incomingHistory);
    const reqSet = new Set(wcRequiredEntities);
    wcForbiddenEntities = sessionEntities.filter((e) => !reqSet.has(e));
    const wcTomorrowSlateCandidate =
      !wcRunnerUpFollowUpQuestion &&
      !isConversationFollowUp &&
      isWcTomorrowOrSlateBetQuestion(routingQuestion) &&
      !isWcPlayerMarketIntent(wcIntent);
    if (wcTomorrowSlateCandidate) {
      try {
        wcTomorrowSlatePrebuiltEarly = await buildWcTomorrowSlatePrebuiltFromInputs({
          question: String(question || ""),
          nowMs: Date.now(),
        });
        if (wcTomorrowSlatePrebuiltEarly) {
          console.log(
            JSON.stringify({
              event: "ur_take_wc_tomorrow_slate_prebuilt_early",
              sport: "worldcup",
              wcIntent,
              tomorrowEtDate: wcTomorrowSlatePrebuiltEarly.tomorrowEtDate,
              fixtureCount: wcTomorrowSlatePrebuiltEarly.tomorrowFixtures?.length ?? 0,
              featuredHome: wcTomorrowSlatePrebuiltEarly.fixtureHome,
              featuredAway: wcTomorrowSlatePrebuiltEarly.fixtureAway,
            }),
          );
        }
      } catch (tomorrowErr) {
        console.warn("[ur-take] tomorrow slate prebuilt resolve failed:", tomorrowErr?.message);
      }
    }
    const wcCrossGroupCandidate =
      !wcTomorrowSlatePrebuiltEarly &&
      !wcRunnerUpFollowUpQuestion &&
      !isConversationFollowUp &&
      shouldUseWcCrossGroupValuePrebuilt(routingQuestion, wcIntent) &&
      !isWcPlayerMarketIntent(wcIntent);
    if (wcCrossGroupCandidate) {
      try {
        const nowMs = Date.now();
        const { teamStats, bdlFutures } = await resolveWcCrossGroupPrebuiltInputs(nowMs);
        wcCrossGroupPrebuiltEarly = buildWcCrossGroupValuePrebuiltStructured({
          teamStats,
          bdlFutures,
          question: String(question || ""),
          nowMs,
        });
        if (!wcCrossGroupPrebuiltEarly) {
          wcCrossGroupPrebuiltEarly = buildWcGroupSlatePrebuiltStructured({
            groupLetter: "D",
            pickAbbr: "PAR",
            pickMarket: "to advance",
          });
        }
      } catch (crossErr) {
        console.warn("[ur-take] cross-group prebuilt resolve failed:", crossErr?.message);
        wcCrossGroupPrebuiltEarly =
          buildWcCrossGroupValuePrebuiltStructured({
            question: String(question || ""),
          }) ||
          buildWcGroupSlatePrebuiltStructured({
            groupLetter: "D",
            pickAbbr: "PAR",
            pickMarket: "to advance",
          });
      }
    }
    const wcFixturePrebuiltCandidate =
      !wcCrossGroupPrebuiltEarly &&
      !wcRunnerUpFollowUpQuestion &&
      !isConversationFollowUp &&
      shouldUseWcFixtureMatchupPrebuilt(routingQuestion, wcIntent, {
        isConversationFollowUp,
        wcRunnerUpFollowUpQuestion,
        mentionedTeams: wcRelevanceLog.mentionedTeams,
        wcEventId: wcEventIdTrimmed,
      });
    const wcFixtureAltFollowUpCandidate =
      !wcCrossGroupPrebuiltEarly &&
      !wcRunnerUpFollowUpQuestion &&
      isConversationFollowUp &&
      shouldUseWcFixtureMatchupAltFollowUpPrebuilt(routingQuestion, wcIntent, {
        isConversationFollowUp,
        wcRunnerUpFollowUpQuestion,
        mentionedTeams: wcRelevanceLog.mentionedTeams,
        wcEventId: wcEventIdTrimmed,
        history: normalizedUrTakeHistoryForGate,
      });
    if (wcFixturePrebuiltCandidate || wcFixtureAltFollowUpCandidate) {
      try {
        const nowMs = Date.now();
        const inputs = await resolveWcFixtureMatchupPrebuiltInputs({
          question: String(question || ""),
          mentionedTeams: wcRelevanceLog.mentionedTeams,
          wcEventId: wcEventIdTrimmed,
          history: normalizedUrTakeHistoryForGate,
          nowMs,
        });
        if (inputs) {
          wcFixturePrebuiltTeamStats = inputs.teamStats || null;
          const built = buildWcFixtureMatchupPrebuiltStructured({
            home: inputs.home,
            away: inputs.away,
            group: inputs.group,
            question: String(question || ""),
            match: inputs.match,
            teamStats: inputs.teamStats,
            simLastUpdated: inputs.simLastUpdated,
            nowMs: inputs.nowMs,
          });
          if (built) {
            if (wcFixtureAltFollowUpCandidate) {
              wcFixtureAltFollowUpPrebuiltEarly = built;
              console.log(
                JSON.stringify({
                  event: "ur_take_wc_fixture_matchup_alt_followup_prebuilt_early",
                  sport: "worldcup",
                  wcIntent,
                  home: inputs.home,
                  away: inputs.away,
                  hasKvFixture: inputs.hasKvFixture,
                }),
              );
            } else {
              wcFixtureMatchupPrebuiltEarly = built;
              console.log(
                JSON.stringify({
                  event: "ur_take_wc_fixture_matchup_prebuilt_early",
                  sport: "worldcup",
                  wcIntent,
                  home: inputs.home,
                  away: inputs.away,
                  hasKvFixture: inputs.hasKvFixture,
                }),
              );
            }
          }
        }
      } catch (fixtureErr) {
        console.warn("[ur-take] fixture matchup prebuilt resolve failed:", fixtureErr?.message);
      }
    }
    if (
      !wcTomorrowSlatePrebuiltEarly &&
      !wcCrossGroupPrebuiltEarly &&
      !wcFixtureMatchupPrebuiltEarly &&
      !wcFixtureAltFollowUpPrebuiltEarly
    ) {
      try {
        wcContext = await buildWorldCupUrTakeContext(String(question || ""), {
          wcIntent,
          requiredEntities: wcRequiredEntities,
          injectStaticRules: wcRelevanceLog.knockoutRulesInjected,
          wcEventId: wcEventIdTrimmed,
        });
      } catch (err) {
        console.warn("[ur-take] buildWorldCupUrTakeContext failed:", err?.message || err);
      }
    } else if (wcTomorrowSlatePrebuiltEarly) {
      wcContext = {
        source: "worldcup_tomorrow_slate_prebuilt",
        promptBlock: "",
        phase: "GROUP_STAGE",
        tournamentSimResults: null,
        matchDetails: [],
        groups: {},
      };
    } else if (wcFixtureMatchupPrebuiltEarly || wcFixtureAltFollowUpPrebuiltEarly) {
      wcContext = {
        source: "worldcup_fixture_matchup_prebuilt",
        promptBlock: "",
        phase: "GROUP_STAGE",
        tournamentSimResults: { teamStats: wcFixturePrebuiltTeamStats },
        matchDetails: [],
        groups: {},
      };
    } else {
      wcContext = {
        source: "worldcup_cross_group_prebuilt",
        promptBlock: "",
        phase: "PRE_GROUP",
        tournamentSimResults: null,
        groups: {},
        groupMispriceTopGroups: wcCrossGroupPrebuiltEarly?.groupLetter
          ? [wcCrossGroupPrebuiltEarly.groupLetter]
          : ["K"],
      };
    }
    wcStrengthTags = getWcTeamStrengthTags(wcContext?.groups, wcRequiredEntities);
    wcRelevanceLog.playerMarketTier = wcContext?.playerMarketTier || null;

    if (
      isWcRunnerUpValueFollowUp(routingQuestion) ||
      isWcRunnerUpValueFollowUp(String(question || ""))
    ) {
      const runnerUpFromHistory = extractWcRunnerUpFromHistory(normalizedUrTakeHistoryForGate);
      if (!runnerUpFromHistory.group) {
        console.warn(
          JSON.stringify({
            event: "wc_runner_up_history_missing",
            sport: "worldcup",
            isConversationFollowUp,
            normalizedHistoryLength: normalizedUrTakeHistoryForGate.length,
            incomingHistoryLength: Array.isArray(incomingHistory) ? incomingHistory.length : 0,
            routingQuestion: routingQuestion.slice(0, 160),
            assistantTurns: normalizedUrTakeHistoryForGate
              .filter((t) => t.role === "assistant")
              .map((t) => ({
                hasStructured: Boolean(t.structured),
                runnerUpGroupLetter: t.structured?.runnerUpGroupLetter ?? null,
                callPreview: String(t.structured?.call || t.content || "").slice(0, 120),
              })),
          }),
        );
      }
    }
  }
  if (sportHint === "worldcup") {
    const wcPrebuiltFast = await tryDeliverWcPrebuiltFastPath({
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
      wcTomorrowSlatePrebuiltEarly,
      wcFixtureMatchupPrebuiltEarly,
      wcFixtureAltFollowUpPrebuiltEarly,
      wcRunnerUpFollowUpQuestion,
      isConversationFollowUp,
      normalizedUrTakeHistoryForGate,
      intent,
      gateQuotaEmail,
      gateQuotaSessionId,
      setGateQuotaDelivered: (v) => {
        gateQuotaDelivered = v;
      },
      extractTakeFromResponse,
      userEmail,
      appendTakeForUser,
    });
    if (wcPrebuiltFast.handled) return;
  }
  let effectiveStructuredModeRequested = structuredModeRequested;
  if (sportHint === "worldcup") {
    effectiveStructuredModeRequested = false;
  }
  if (sportHint === "nba") {
    const liveBoardRefreshForced = nbaRequiresLiveUrTakeBoardRefresh(
      nbaContextFromClient || nbaContext,
      String(question || ""),
    );
    nbaLiveBoardRefreshForced = liveBoardRefreshForced;
    const mustFetchNbaBoard =
      sportSwitched ||
      liveBoardRefreshForced ||
      !nbaUrTakeContextHasUsableData(nbaContext);
    nbaRelevanceMustFetch = mustFetchNbaBoard;
    nbaRelevanceClientContextUsable = liveBoardRefreshForced
      ? false
      : nbaUrTakeContextHasUsableData(nbaContextFromClient);
    try {
      const nbaT0 = Date.now();
      let fresh = null;
      if (mustFetchNbaBoard) {
        const usePreloaded =
          !liveBoardRefreshForced && preloadedNbaBoard && !sportSwitched;
        fresh =
          (usePreloaded ? preloadedNbaBoard : null) ||
          (await buildNbaUrTakeBoard(routingQuestion));
        if (!nbaBoardHasPostedPropMarkets(fresh)) {
          fresh = await hydrateNbaPropsOdds(fresh);
        }
      }
      if (!fresh && mustFetchNbaBoard) {
        console.warn(
          JSON.stringify({
            event: "ur_take_nba_board_empty_after_fetch",
            sportSwitched,
            questionHead: String(question || "").slice(0, 120),
          }),
        );
      }
      if (fresh) {
        nbaRelevanceServerBoardFetched = true;
        const probeGameId =
          fresh?.todaysGames?.find((g) => g?.actionNetworkGameId)?.actionNetworkGameId ??
          fresh?.sourceMeta?.propsOddsGameId ??
          null;
        const kvProbe = probeGameId != null ? await getNbaPropsForBoard(probeGameId) : null;
        console.log(
          JSON.stringify({
            event: "ur_take_nba_props_kv_probe",
            gameId: probeGameId,
            kvHit: Boolean(kvProbe),
            hasPostedLines: Boolean(kvProbe?.hasPostedLines),
            playerCount: kvProbe?.playerCount ?? 0,
            boardHasPropsOdds: Boolean(fresh?.propsOdds),
            boardHasPostedLines: Boolean(fresh?.propsOdds?.hasPostedLines),
            boardPropLinesCount: Array.isArray(fresh?.propLines) ? fresh.propLines.length : 0,
            boardTodaysGamesCount: Array.isArray(fresh?.todaysGames) ? fresh.todaysGames.length : 0,
            hydrateCalled: mustFetchNbaBoard,
            sportSwitched,
          }),
        );
        nbaBoardBuildMs = Date.now() - nbaT0;
        nbaClientContextIgnored = liveBoardRefreshForced;
        nbaContext = {
          ...fresh,
          question: String(question || ""),
          clientUiSurface: liveBoardRefreshForced
            ? fresh.clientUiSurface
            : (nbaContextFromClient?.clientUiSurface ?? fresh.clientUiSurface),
        };
        nbaContext.rosterGrounding = augmentNbaRosterGroundingWithUi(
          nbaContext.rosterGrounding,
          nbaContext.todaysGames || [],
        );
        if (
          !sportSwitched &&
          nbaContextFromClient &&
          typeof nbaContextFromClient === "object" &&
          Array.isArray(nbaContextFromClient.injuries) &&
          nbaContextFromClient.injuries.length > 0
        ) {
          const merged = new Map();
          for (const row of nbaContext.injuries || []) {
            const k = String(row?.player || "").trim().toLowerCase();
            if (k) merged.set(k, row);
          }
          for (const row of nbaContextFromClient.injuries) {
            const k = String(row?.player || "").trim().toLowerCase();
            if (k) merged.set(k, row);
          }
          nbaContext = { ...nbaContext, injuries: [...merged.values()] };
        }
      }
    } catch (err) {
      console.warn("[ur-take] buildNbaUrTakeBoard failed:", err?.message || err);
      if (!sportSwitched && !liveBoardRefreshForced) {
        nbaContext = nbaContextFromClient;
      }
    }
    if (
      !sportSwitched &&
      !liveBoardRefreshForced &&
      isConversationFollowUp &&
      nbaContextFromClient &&
      typeof nbaContextFromClient === "object"
    ) {
      const c = nbaContextFromClient;
      const overlays = {};
      const serverPlayoffSeries = Array.isArray(nbaContext?.playoffSeries) ? nbaContext.playoffSeries : [];
      if (
        serverPlayoffSeries.length === 0 &&
        Array.isArray(c.playoffSeries) &&
        c.playoffSeries.length > 0
      ) {
        overlays.playoffSeries = c.playoffSeries;
      }
      if (Array.isArray(c.injuries) && c.injuries.length > 0) {
        overlays.injuries = c.injuries;
      }
      if (Object.keys(overlays).length > 0) {
        nbaContext = { ...nbaContext, ...overlays };
      }
      const cPbt = c.rosterGrounding?.playersByTeamAbbrev;
      if (cPbt && typeof cPbt === "object" && !Array.isArray(cPbt) && Object.keys(cPbt).length > 0) {
        const sRg = nbaContext.rosterGrounding;
        const sPbt = (sRg && sRg.playersByTeamAbbrev) || {};
        const mergedPbt = { ...sPbt };
        for (const [k, val] of Object.entries(cPbt)) {
          if (!Array.isArray(val) || !val.length) continue;
          const key = String(k).toUpperCase();
          const prev = mergedPbt[key];
          if (!Array.isArray(prev) || !prev.length) {
            mergedPbt[key] = val.slice();
          } else {
            const seen = new Set(prev.map((n) => String(n).toLowerCase()));
            const add = prev.slice();
            for (const n of val) {
              const nm = String(n || "").trim();
              if (nm && !seen.has(nm.toLowerCase())) {
                seen.add(nm.toLowerCase());
                add.push(nm);
              }
            }
            mergedPbt[key] = add;
          }
        }
        nbaContext = {
          ...nbaContext,
          rosterGrounding: {
            ...(sRg && typeof sRg === "object" ? sRg : {}),
            playersByTeamAbbrev: mergedPbt,
          },
        };
      }
    }
    const nbaIntentForOutrights = classifyNbaQuestionIntent(
      String(question || ""),
      incomingHistory,
    );
    const nbaMatchupProbe =
      resolveNbaMatchupFromQuestion(String(question || ""), nbaContext || {}) || null;
    const finalsCtxProbe = resolveNbaFinalsUrTakeContext({
      nbaContext,
      nbaMatchup: nbaMatchupProbe,
      question: String(question || ""),
      nbaIntent: nbaIntentForOutrights,
    });
    nbaFinalsModeMeta = {
      finalsMode: finalsCtxProbe.finalsMode,
      seriesState: finalsCtxProbe.seriesState,
    };
    nbaFinalsContextBlock = finalsCtxProbe.contextBlock;
    if (nbaFinalsModeMeta.finalsMode) {
      effectiveStructuredModeRequested = false;
    }

    const needsOutrights =
      finalsCtxProbe.finalsMode ||
      nbaIntentForOutrights === NBA_INTENT.SERIES_WINNER ||
      nbaIntentForOutrights === NBA_INTENT.FINALS_MVP;

    if (needsOutrights) {
      const requiredEntities = resolveRequiredNbaEntities(
        String(question || ""),
        incomingHistory,
        nbaIntentForOutrights,
      );
      const [seriesKv, mvpKv, nbaGoalKv] = await Promise.all([
        readNbaFinalsSeriesFromKv(),
        readNbaFinalsMvpFromKv(),
        readGoalEditorialFromKv("nba"),
      ]);
      nbaFinalsOutrightsBlock = formatNbaOutrightsForPrompt({
        nbaIntent: nbaIntentForOutrights,
        question: String(question || ""),
        requiredEntities,
        seriesKv,
        mvpKv,
        goalEditorialBlock: buildGoalNbaFinalsEditorialPromptBlock(nbaGoalKv),
      });
      nbaFinalsOutrightsMeta = {
        outrightsInjected: nbaOutrightsInjectedForContext(seriesKv, mvpKv),
        seriesStale: Boolean(seriesKv?.stale),
        mvpStale: Boolean(mvpKv?.stale),
        seriesAgeMinutes: seriesKv?.freshness?.ageMinutes ?? null,
        mvpAgeMinutes: mvpKv?.freshness?.ageMinutes ?? null,
      };
      if (nbaContext) {
        nbaContext = applyFinalsRosterFiltersToNbaContext({
          ...nbaContext,
          finalsMode: finalsCtxProbe.finalsMode,
          finalsSeriesState: finalsCtxProbe.seriesState,
          ...(nbaFinalsOutrightsBlock
            ? {
                finalsOutrightsBlock: nbaFinalsOutrightsBlock,
                finalsOutrights: { series: seriesKv, mvp: mvpKv },
              }
            : {}),
        });
      }
    } else if (nbaContext && finalsCtxProbe.finalsMode) {
      nbaContext = applyFinalsRosterFiltersToNbaContext({
        ...nbaContext,
        finalsMode: true,
        finalsSeriesState: finalsCtxProbe.seriesState,
      });
    }
  }

  if (sportHint === "mlb") {
    try {
      const freshMlb = await buildMlbUrTakeBoard(String(question || ""));
      if (
        freshMlb &&
        (sportSwitched ||
          (Array.isArray(freshMlb.propLines) && freshMlb.propLines.length > 0) ||
          Object.keys(freshMlb.gameTotals || {}).length > 0)
      ) {
        mlbContext = {
          ...(mlbContext && typeof mlbContext === "object" ? mlbContext : {}),
          ...freshMlb,
          question: String(question || ""),
        };
      }
    } catch (e) {
      console.warn("[ur-take] MLB board refresh failed, using client context", e?.message || e);
    }
  }

  if (sportHint === "golf") {
    const clientGolfRaw = golfContext && typeof golfContext === "object" ? golfContext : null;
    const clientGolf = clientGolfRaw
      ? stripMisalignedGolfCourseArtifacts(clientGolfRaw)
      : null;
    if (clientGolf) golfContextEffective = clientGolf;
    const questionStr = String(question || "");
    const intent = extractGolfTournamentIntentFromQuestion(questionStr);
    const needsQuestionAlign = golfQuestionNeedsEventRealign(clientGolf, questionStr);
    const needsHydrate = sportSwitched || !golfClientContextLooksUsable(clientGolf);
    const needsCourseArtifactAlign = golfClientCourseArtifactsMisaligned(clientGolfRaw);

    if (intent || needsQuestionAlign || needsHydrate || needsCourseArtifactAlign) {
      try {
        const board = await getUnifiedGolfBoard();
        const aligned = intent
          ? await alignGolfBoardToQuestion(board, questionStr)
          : needsQuestionAlign
            ? await alignGolfBoardToQuestion(board, questionStr)
            : board;
        const slim = slimUnifiedGolfBoardForUrTake(aligned, questionStr);
        if (slim && golfClientContextLooksUsable(slim)) {
          golfContextEffective = slim;
          console.log(
            JSON.stringify({
              tag: "[urTakeGolfHydrate]",
              requestId,
              event: intent
                ? "golf_context_question_aligned"
                : needsQuestionAlign
                  ? "golf_context_question_aligned"
                  : "golf_context_server_hydrated",
              alignment: slim.questionEventAlignment || undefined,
              course: slim.currentEvent?.course || null,
            }),
          );
        }
      } catch (e) {
        console.warn("[ur-take] server golf board hydrate failed:", e?.message || e);
      }
    }
  }

  if (sportHint === "nba" && nbaContext && !nbaContext.newsImpact) {
    nbaContext.newsImpact = buildNbaNewsImpact(nbaContext);
  }

  if (sportHint === "f1") {
    const hasNbaNoise =
      nbaContextFromClient &&
      typeof nbaContextFromClient === "object" &&
      ((Array.isArray(nbaContextFromClient.todaysGames) &&
        nbaContextFromClient.todaysGames.length > 0) ||
        (Array.isArray(nbaContextFromClient.playerStats) &&
          nbaContextFromClient.playerStats.length > 0));
    if (hasNbaNoise) {
      console.log(
        JSON.stringify({
          event: "wrong_sport_context_payload",
          requestedSport: incomingSportHint ?? null,
          resolvedSportHint: sportHint,
          resolvedContextSport: "f1",
          wrongSportContextDetected: true,
        }),
      );
    }
    try {
      const serverF1 = await buildF1UrTakeContext({ question: String(question || "") });
      const sources = serverF1?.urTakeAssembly?.sources || ["server_openf1"];
      f1Context = {
        ...(typeof f1ContextFromClient === "object" && f1ContextFromClient ? f1ContextFromClient : {}),
        ...serverF1,
      };
      console.log(
        JSON.stringify({
          event: "sport_context_route",
          requestedSport: incomingSportHint ?? null,
          resolvedSportHint: sportHint,
          resolvedContextSport: "f1",
          contextSourcesUsed: sources,
          wrongSportContextDetected: Boolean(hasNbaNoise),
        }),
      );
    } catch (err) {
      console.warn("[ur-take] buildF1UrTakeContext failed:", err?.message || err);
      f1Context =
        typeof f1ContextFromClient === "object" && f1ContextFromClient ? f1ContextFromClient : {};
    }
  }

  const oddsAvailable = resolveOddsAvailabilityForSport({
    sportHint,
    nbaContext,
    mlbContext,
    golfContext: golfContextEffective,
    f1Context,
    nflContext,
    liveMatches,
    context,
  });
  if (sportHint === "nba" && nbaContext && typeof nbaContext === "object") {
    nbaContext = { ...nbaContext, oddsAvailable };
  }
  if (sportHint === "mlb" && mlbContext && typeof mlbContext === "object") {
    mlbContext = { ...mlbContext, oddsAvailable };
  }
  if (sportHint === "mlb") {
    console.log("[ur-take] MLB context audit", {
      propLinesCount: Array.isArray(mlbContext?.propLines) ? mlbContext.propLines.length : 0,
      gameTotalsCount: Object.keys(mlbContext?.gameTotals ?? {}).length,
      gamesCount: Array.isArray(mlbContext?.games) ? mlbContext.games.length : 0,
      source: mlbContext?.primarySource ?? "unknown",
    });
  }
  if (sportHint === "golf" && golfContextEffective && typeof golfContextEffective === "object") {
    golfContextEffective = { ...golfContextEffective, oddsAvailable };
  }
  if (sportHint === "f1" && f1Context && typeof f1Context === "object") {
    f1Context.oddsAvailable = oddsAvailable;
  }
  if (sportHint === "nfl" && nflContext && typeof nflContext === "object") {
    nflContext.oddsAvailable = oddsAvailable;
  }
  if (!oddsAvailable) {
    console.warn(
      `[odds] unavailable — running without lines (sport=${String(sportHint || "unknown")}; server log only, not shown to model)`,
    );
  }

  const nbaNewsImpact = sportHint === "nba" ? nbaContext?.newsImpact || null : null;
  const nbaInvalidation =
    sportHint === "nba"
      ? applyNbaMarketInvalidation({
          question,
          board: nbaContext || {},
          newsImpact: nbaNewsImpact,
        })
      : {
          decisionMode: "normal",
          blocked: false,
          unresolved: false,
          targetedPlayer: null,
          statusClass: "unknown",
          statusDisplay: "",
          team: null,
          requiresStatusAcknowledgement: false,
        };

  const nbaAvailabilityIntent =
    sportHint === "nba"
      ? detectNbaAvailabilityIntent(question)
      : { isAvailabilityQuestion: false, asksBettingConsequence: false };
  const nbaDirectPropAsk = sportHint === "nba" ? isDirectNbaPropAsk(question) : false;
  const nbaDecisionMode =
    sportHint === "nba"
      ? resolveNbaDecisionMode({
          sportHint,
          availabilityIntent: nbaAvailabilityIntent,
          directPropAsk: nbaDirectPropAsk,
          invalidation: nbaInvalidation,
        })
      : "none";

  const mlbDecisionMode =
    sportHint === "mlb" ? resolveMlbDecisionMode(mlbContext || {}, String(question || "")) : null;

  const contextQuality = getContextQuality({
    sportHint,
    players,
    context,
    liveMatches,
    golfContext: golfContextEffective,
    nbaContext,
    mlbContext,
    nflContext,
    f1Context,
    wcContext,
    matchupContext,
  });

  const nbaMatchup =
    sportHint === "nba" ? resolveNbaMatchupFromQuestion(question, nbaContext || {}) : null;

  if (sportHint === "nba") {
    nbaIntentForHandler = classifyNbaQuestionIntent(
      String(question || ""),
      incomingHistory,
    );
    const finalsCtxFinal = resolveNbaFinalsUrTakeContext({
      nbaContext,
      nbaMatchup,
      question: String(question || ""),
      nbaIntent: nbaIntentForHandler,
    });
    nbaFinalsModeMeta = {
      finalsMode: finalsCtxFinal.finalsMode,
      seriesState: finalsCtxFinal.seriesState,
    };
    nbaFinalsContextBlock = finalsCtxFinal.contextBlock;
    if (nbaContext && finalsCtxFinal.finalsMode) {
      nbaContext = applyFinalsRosterFiltersToNbaContext({
        ...nbaContext,
        finalsMode: true,
        finalsSeriesState: finalsCtxFinal.seriesState,
      });
    }
  }

  const isBoardLive = computeIsBoardLive({
    sportHint,
    nbaContext,
    nbaMatchup,
    mlbContext,
    liveMatches,
    golfContextEffective,
  });
  const liveSignals = {
    ...liveKeywordSignals,
    isBoardLive,
    isEffectivelyLive: Boolean(liveKeywordSignals.hasLiveKeyword) || isBoardLive,
  };

  const baseDerivedConfidence = deriveConfidenceLabel({
    intent,
    sportHint,
    hasImage,
    matchupContext,
    question,
    contextQuality,
    isLive: liveKeywordSignals.isLive,
  });
  const nbaConfidenceModifier =
    sportHint === "nba"
      ? applyNbaConfidenceModifiers({
          baseConfidence: baseDerivedConfidence,
          invalidation: nbaInvalidation,
          nbaContext,
          question: String(question || ""),
        })
      : { label: baseDerivedConfidence, reason: "" };
  const derivedConfidence = nbaConfidenceModifier.label;
  const nbaMatchupPool =
    sportHint === "nba" && nbaMatchup
      ? buildAllowedMatchupPlayerPool(nbaMatchup, nbaContext || {})
      : null;
  const nbaGroundingSnapshot =
    sportHint === "nba" && nbaContext && typeof nbaContext === "object"
      ? buildNbaGroundingSnapshot(nbaContext, nbaMatchup)
      : null;
  const nbaMatchupGroundingBlock =
    sportHint === "nba" ? injectMatchupGroundingBlock(nbaMatchup, nbaMatchupPool) : "";
  const nbaMatchupGroundingApplied = sportHint === "nba" && Boolean(nbaMatchupGroundingBlock);
  const nbaOffMatchupPromptAcknowledgement =
    sportHint === "nba" ? buildOffMatchupPromptAcknowledgement(question, nbaMatchup, nbaMatchupPool) : "";

  const nbaGameStateGate =
    sportHint === "nba" ? buildNbaGameStateGateSnapshot(nbaContext || {}, nbaMatchup) : null;

  const nbaContextForModel =
    sportHint === "nba" && nbaContext && typeof nbaContext === "object"
      ? buildNbaContextForModel(nbaContext, nbaMatchup, question)
      : nbaContext;

  const tennisSystemPromptExtra = ``;

  const evidenceSparsityProfile = resolveEvidenceSparsityProfile({
    contextQuality,
    question: String(question || ""),
    hasMatchupContext: Boolean(matchupContext),
    sportHint,
    intent,
    hasImage,
  });
  const takeTrustUi = buildTakeTrustUiMetadata({
    contextQuality,
    evidenceSparsityProfile,
    sportHint,
  });
  const takeClientPayload = (takeRecord) => ({
    id: takeRecord.id,
    playLine: takeRecord.playLine,
    confidence: takeRecord.confidence,
    status: takeRecord.status,
    trust: takeTrustUi,
  });

  let memoryBlock = "";
  if (userEmail && isPro && !isConversationFollowUp) {
    memoryBlock = await buildEnrichedMemoryPrompt(userEmail, getDurableJson);
  }

  const longFormRequested = detectUrTakeLongFormIntent(String(question || ""));

  const systemPrompt = composeRegisteredUrTakeSystemPrompt({
    contextQuality,
    sportHint,
    chaseSignals,
    tennisSystemPromptExtra,
    nbaDecisionMode,
    mlbDecisionMode,
    question: String(question || ""),
    intent,
    hasImage,
    hasMatchupContext: Boolean(matchupContext),
    evidenceSparsityProfile,
    liveSignals,
    bettingStyle,
    memoryBlock,
    longFormRequested,
  });

  const outputJsonMode =
    isConversationFollowUp &&
    String(sportHint || "").toLowerCase() !== "worldcup" &&
    !nbaFinalsModeMeta?.finalsMode
      ? "plain"
      : resolveOutputJsonMode({
          chaseSignals,
          intent,
          hasImage,
          liveSignals: liveKeywordSignals,
          question,
          matchupContext,
          sportHint,
          wcIntent,
          finalsMode: Boolean(nbaFinalsModeMeta?.finalsMode),
        });
  const jsonContract = buildJsonOutputContract(outputJsonMode, sportHint, {
    requireStatusShift:
      sportHint === "nba" && Boolean(nbaInvalidation?.requiresStatusAcknowledgement),
    longFormRequested,
    wcIntent,
  });
  const propProjectionModeBlock = intent === "prop_projection" ? `\n\n${PROP_PROJECTION_MODE_BLOCK}` : "";
  const spreadAndGameSideBlock = isSpreadOrGameSideQuestion(question)
    ? `\n\n${SPREAD_AND_GAME_SIDE_BLOCK}`
    : "";
  /** Structured mode must NOT also attach summary/deep JSON contract — model would return wrong shape and validation always fails. */
  const attachTieredJsonContract =
    outputJsonMode !== "plain" && Boolean(jsonContract) && !effectiveStructuredModeRequested;
  let systemPromptForModel = attachTieredJsonContract
      ? `${systemPrompt}

JSON RESPONSE MODE (overrides conflicting FORMATTING / DEFAULT RESPONSE FORMAT rules above for this turn only)
For matchup, player prop, and "who wins" style questions when this contract applies, return JSON with summary (Tier 2.5) and deep (Tier 3 full format).
For factual Tier-1 questions, return JSON with only summary as a short string.
For live in-game Tier-2 questions, return JSON with only summary in the compressed live format.
For all other questions where no contract is attached, use plain text as already specified.

${jsonContract}${propProjectionModeBlock}${spreadAndGameSideBlock}`
      : `${systemPrompt}${propProjectionModeBlock}${spreadAndGameSideBlock}`;
  const nbaLiveNoPropSystemPromptBlock =
    sportHint === "nba" ? buildNbaLiveNoPropSystemPromptBlock(nbaGameStateGate, nbaContext) : "";
  if (nbaLiveNoPropSystemPromptBlock) {
    systemPromptForModel = `${systemPromptForModel}

${nbaLiveNoPropSystemPromptBlock}`;
  }
  if (isConversationFollowUp) {
    systemPromptForModel = `${systemPromptForModel}\n\n${UR_TAKE_CONVERSATION_FOLLOW_UP_APPENDIX}`;
    if (sportHint === "worldcup") {
      const wcFollowUpAppendix =
        wcIntent === WC_INTENT.RULES
          ? `${WC_FOLLOW_UP_SYSTEM_APPENDIX}

WC RULES FOLLOW-UP (mandatory): Structured betting JSON mode is OFF. Return tier1 summary (+ optional deep) factual rules only — no Lean/Edge/Prop card.`
          : WC_FOLLOW_UP_SYSTEM_APPENDIX;
      systemPromptForModel = `${systemPromptForModel}\n\n${wcFollowUpAppendix}`;
    } else {
      systemPromptForModel = buildUrTakeFollowUpCoreSystemPrompt();
      systemPromptForModel = `${systemPromptForModel}\n\n${buildFactAuthorityPrompt()}`;
    }
  }
  if (sportHint === "worldcup" && wcIntent === WC_INTENT.RULES) {
    systemPromptForModel = `${systemPromptForModel}\n\n${WC_RULES_TURN_APPENDIX}`;
  }

  if (
    isDerbyActive() &&
    (questionReferencesDerby(String(question || "")) || sportHint === "derby")
  ) {
    const derbyCtx = buildDerbyContext();
    if (derbyCtx) {
      systemPromptForModel = `${systemPromptForModel}\n\n${derbyCtx}`;
    }
  }

  const rawPriorTakesSummary = summarizePriorTakes(incomingHistory);
  let sessionMemory;
  if (sportHint === "worldcup") {
    sessionMemory = buildWcSessionMemoryPrompt(rawPriorTakesSummary, incomingHistory, sportHint, {
      wcIntent,
      requiredEntities: wcRequiredEntities,
      question: String(question || ""),
    });
    wcRelevanceLog.structuralEdgeInjected = sessionMemory.structuralEdgeInjected;
  } else {
    const nbaIntentForMemory =
      sportHint === "nba"
        ? classifyNbaQuestionIntent(String(question || ""), incomingHistory)
        : null;
    sessionMemory = buildUrTakeSessionMemoryPrompt(rawPriorTakesSummary, incomingHistory, sportHint, {
      question: String(question || ""),
      intent: nbaIntentForMemory,
    });
  }
  const priorTakesSummary = [sessionMemory.summary, sessionMemory.conversationTransitionBlock]
    .filter(Boolean)
    .join("\n\n");
  const nbaImpactSummary =
    sportHint === "nba" ? summarizeNbaNewsImpact(nbaNewsImpact) : "";
  const nbaStatusShiftLine =
    sportHint === "nba"
      ? buildNbaStatusShiftSection(nbaNewsImpact, nbaInvalidation)
      : "";
  const nbaConditionalPayload =
    sportHint === "nba" && nbaDecisionMode === "conditional_wait"
      ? buildNbaConditionalPayload({
          invalidation: nbaInvalidation,
          nbaContext,
          newsImpact: nbaNewsImpact,
        })
      : null;
  const nbaPlayerResolutionBlock =
    sportHint === "nba" ? buildNbaPlayerResolutionBlock(nbaInvalidation) : "";
  let nbaPostValidationChecked = false;
  let nbaPostValidationTriggered = false;
  let nbaFallbackOrRepairUsed = false;

  const buildEarlyPathsCtx = () => ({
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
    setGateQuotaDelivered: (v) => {
      gateQuotaDelivered = v;
    },
    buildNbaAvailabilityResponse,
    ensureNbaTakeConfidenceConsistency,
    buildNbaOutStatusShiftPlan,
    buildNbaObservabilityMeta,
    logNbaObservability,
    extractTakeFromResponse,
    appendTakeForUser,
    takeClientPayload,
    hasNoChatHistory: normalizedUrTakeHistoryForGate.length === 0,
    golfContextEffective,
  });

  const nbaShortcutEarly = await tryUrTakeEarlyPaths(buildEarlyPathsCtx(), {
    includeEmptyFallbacks: false,
  });
  if (nbaShortcutEarly.handled) return;

  let userPrompt = question;
  /** Scoped for Anthropic token budget — NFL TYPE_A draft simulation uses a higher max_tokens ceiling. */
  let draftTeamSimulationInject = false;

  if (intent === "slip_review") {
    userPrompt = buildSlipReviewPrompt({
      question,
      sportHint,
      nbaContext: nbaContextForModel,
      nflContext,
      mlbContext,
      golfContext: golfContextEffective,
      f1Context,
      derivedConfidence,
      priorTakesSummary,
    });
  } else if (sportHint === "tennis_wta_profile") {
    // DATA FRESHNESS: this sport reads from live APIs — no staleness injection needed.
    // If you ever add hardcoded fallbacks, add dataFreshness to the payload.
    const surfaceKey = pickSurfaceKey({
      currentTournament: { surface: context?.currentTournament?.surface },
    });

    const wtaSnapshot = buildTennisPlayerSnapshot(players?.wta, surfaceKey, 40);

    const wtaPlayerNames = Object.keys(players?.wta || {});
    const questionLower = normalizeText(question);

    const mentionedPlayers = wtaPlayerNames.filter((name) => {
      const lower = normalizeText(name);
      if (!lower) return false;
      if (questionLower.includes(lower)) return true;
      const parts = lower.split(/\s+/).filter(Boolean);
      const lastName = parts[parts.length - 1];
      return lastName.length > 3 && questionLower.includes(lastName);
    });

    let matchupDigest = "";
    if (mentionedPlayers.length >= 2) {
      matchupDigest = buildMatchupTennisDigest(
        mentionedPlayers[0],
        mentionedPlayers[1],
        players,
        surfaceKey,
      );
    }

    userPrompt = `You are answering a WTA tennis question as Under Review.

TODAY
${getTodayStr()}

${context && typeof context === "object" ? `TENNIS APP CONTEXT (JSON — full server bundle; same on every turn including follow-ups)
${contextJsonForModel(context)}

` : ""}${priorTakesSummary ? priorTakesSummary + "\n\n" : ""}QUESTION
${question}

MODE
This is a profile-based WTA analysis. There is NO live fixtures feed for WTA.
Answer using ONLY the player database below. Do not invent live odds, scheduled
matches, or current draws. The user knows there is no live board — they want a
sharp, data-driven take based on the players' rally profiles, serve/return splits,
surface records, and tiebreak rates.

${matchupDigest ? `MATCHUP DIGEST (use this for head-to-head questions)
${matchupDigest}

` : ""}WTA PLAYER DATABASE (cite only these stats — do not fabricate)
${wtaSnapshot || "Not loaded"}

CONFIDENCE GUIDANCE
Default confidence: ${derivedConfidence}
WTA mode is profile-based — confidence should generally be Medium or Speculative
unless the surface/style mismatch is truly obvious from the data.

EXECUTION RULES — READ CAREFULLY
1. Lead with the take. First sentence is a concrete claim about a specific player
   or matchup using actual data from above.

2. NEVER say "no live data" or "feed unavailable" or anything about data limitations.
   Just answer the question with the profiles you have.

3. Cite specific stats from the database when justifying a take — rally splits,
   tiebreak rate, surface record, serve/return numbers. If a player isn't in the
   database, say so directly and pivot to who IS analyzable.

4. For head-to-head questions, identify the surface/style edge:
   - Who has the better rally profile for this surface?
   - Who has the tiebreak edge if it goes to a deciding set?
   - Who has the serve dominance on this surface?
   - Cite the actual numbers, not generic "X is better on clay."

5. Use the standard format (THE PLAY, MARKET MISTAKE, WHY MISPRICED, etc.) but
   for pure analytical questions ("who wins?"), THE PLAY can be the player you'd
   back if a price were available.

6. Add this exact line at the end of CONFIDENCE:
   SCOPE — WTA profile-based read; confirm live odds before sizing any bet.`;
  } else if (sportHint === "tennis") {
    // DATA FRESHNESS: this sport reads from live APIs — no staleness injection needed.
    // If you ever add hardcoded fallbacks, add dataFreshness to the payload.
    const leagueStr = normalizeText(matchupContext?.league || "");
    const isWtaLeague =
      leagueStr.includes("wta") ||
      (leagueStr.includes("women") && leagueStr.includes("tennis"));

    const rawMx = matchupContext?.raw || {};
    const mxHome = String(rawMx.home || "").trim();
    const mxAway = String(rawMx.away || "").trim();
    const boardSurfaceHint =
      String(rawMx.bdl_tournament_surface || "").trim() ||
      context?.currentTournament?.surface ||
      "";

    const surfaceKey = pickSurfaceKey({
      currentTournament: {
        surface: boardSurfaceHint || context?.currentTournament?.surface,
      },
    });

    const atpSnapshot = buildTennisPlayerSnapshot(players?.atp, surfaceKey, 30);
    const wtaSnapshot = buildTennisPlayerSnapshot(players?.wta, surfaceKey, 30);

    const matchupDigest =
      mxHome && mxAway
        ? buildMatchupTennisDigest(mxHome, mxAway, players, surfaceKey)
        : "";

    const liveBoard = (liveMatches || [])
      .slice(0, 15)
      .map((m) => {
        const score =
          m.raw?.score && m.raw.score !== "-" ? ` | Score: ${m.raw.score}` : "";
        const live = String(m.raw?.live || "0") === "1" ? " [LIVE]" : "";
        const surfRaw = String(m.raw?.bdl_tournament_surface || "").trim();
        const surf =
          surfRaw.length > 0 ? ` | Surface: ${surfRaw}` : "";
        const snap =
          m.raw?.ur_static_snapshot || String(m.raw?.source || "").includes("ur_static_wta")
            ? " [WTA profile snapshot — not a confirmed draw time]"
            : "";
        return `${m.title}${live}${snap} | ${m.network || ""}${surf}${m.raw?.round ? ` | ${m.raw.round}` : ""}${score}`;
      })
      .join("\n");

    const cardTournamentName = String(rawMx.tournament_name || "").trim();
    const globalTournamentName = String(context?.currentTournament?.name || "").trim();
    const tournamentMismatch =
      !!cardTournamentName &&
      !!globalTournamentName &&
      normalizeText(cardTournamentName) !== normalizeText(globalTournamentName);

    const tournamentName =
      cardTournamentName || context?.currentTournament?.name || "Current Tournament";
    const tournamentSurface =
      boardSurfaceHint || context?.currentTournament?.surface || "Unknown";
    let tournamentContext = context?.currentTournament?.context || "";
    if (tournamentMismatch) {
      tournamentContext =
        `App active tournament filter is "${globalTournamentName}" but this MATCHUP CARD fixture is "${cardTournamentName}" — use the CARD tournament for venue, surface, altitude, and conditions. ` +
        tournamentContext;
    }
    const tournamentSpeed = context?.currentTournament?.speed || "";
    const breakingNews = String(context?.breaking || "").trim();

    const hasLiveBoard = liveBoard.trim().length > 0;
    const tennisVerifiedBlock = buildTennisVerifiedPlayerListBlock(players, liveMatches, question);
    const fixtureHome = mxHome || "HOME_PLAYER";
    const fixtureAway = mxAway || "AWAY_PLAYER";
    const matchFocusBlock =
      mxHome && mxAway
        ? `MATCH FOCUS — THIS OVERRIDES EVERYTHING ELSE

A specific match is on the card: ${fixtureHome} vs ${fixtureAway}

YOUR ENTIRE RESPONSE IS ABOUT THIS MATCH ONLY.

Rules:
1. Every section (THE PLAY, MATCH READ, PROP PROJECTIONS, FADE) must
   reference ${fixtureHome} or ${fixtureAway} by name. No exceptions.

2. Do NOT give tournament-level takes in place of match-level takes.
   "Alcaraz benefits most at Madrid" is NOT an answer to a question
   about ${fixtureHome} vs ${fixtureAway}.

3. Tournament context (surface, altitude, speed) is background only.
   It informs HOW you analyze this match. It is not the answer itself.

4. If the user asks "Clay — who benefits more?", answer: which of
   ${fixtureHome} or ${fixtureAway} benefits more from this surface, and why,
   using their specific stats from the player database.

5. If the user asks "what are the best props?", deliver prop projections
   for ${fixtureHome} and ${fixtureAway} specifically — aces, double faults,
   games, break points, scoreline. Not tournament outright recommendations.

6. The only time you may mention a player not named ${fixtureHome} or
   ${fixtureAway} is in the FADE section to establish relative value context,
   and only briefly.

7. TENNIS RESPONSE WORDING RULES:
   - Never mention database/profile depth/Elo-ranking availability in the body.
     Banned body phrases: "no dedicated UR profile row", "limited in profile depth",
     "database does not rank", "limited in the database", "profile is limited".
     Thin data belongs in CONFIDENCE only, one phrase.
   - WHY MISPRICED = market error only (1–2 sentences). WHY IT FITS = player-matchup reason only (1–2 sentences). No repetition.
   - Age/injury context that materially affects matchup should lead WHY IT FITS (sentence 1 or 2), not be buried.
   - CONFIDENCE format: "[High/Medium/Speculative] — [one phrase basis]", max 15 words after dash.

VIOLATION: Responding about Alcaraz, Zverev, Swiatek, or any other
player when the question is about ${fixtureHome} vs ${fixtureAway} is a
critical failure. Do not do this under any circumstances.`
        : "";
    const tennisPropProjectionUserBlock =
      intent === "prop_projection" && mxHome && mxAway
        ? `DIRECT PROP REQUEST — MANDATORY OUTPUT FOR THIS MATCH

The user asked for props on ${fixtureHome} and ${fixtureAway}. Your summary must include:
- Match winner lean with threshold
- Total games projection (OVER/UNDER + number)
- Aces projection for ${fixtureHome} and ${fixtureAway} (per set and total)
- Double-fault projection for ${fixtureHome} and ${fixtureAway}
- Break points saved projection for each
- Scoreline projection

If data is thin, use tour/surface baselines, but still produce all projections.`
        : "";

    // DATA FRESHNESS: this sport reads from live APIs — no staleness injection needed.
    // If you ever add hardcoded fallbacks, add dataFreshness to the payload.
    userPrompt = `You are answering a tennis betting question as Under Review.

TODAY
${getTodayStr()}

${priorTakesSummary ? priorTakesSummary + "\n\n" : ""}QUESTION
${question}

${context && typeof context === "object" ? `TENNIS APP CONTEXT (JSON — full server bundle; same on every turn including follow-ups)
${contextJsonForModel(context)}

` : ""}${matchFocusBlock ? `${matchFocusBlock}\n\n` : ""}${breakingNews ? `BREAKING NEWS — READ FIRST AND ADJUST ALL ANSWERS ACCORDINGLY
${breakingNews}

` : ""}TOURNAMENT CONTEXT
Name: ${tournamentName}
Surface: ${tournamentSurface}
Speed: ${tournamentSpeed}
Context: ${tournamentContext}

${tennisVerifiedBlock}

${tennisPropProjectionUserBlock ? `${tennisPropProjectionUserBlock}\n` : ""}

FIXTURE vs FILTER (mandatory)
TOURNAMENT CONTEXT applies to the CURRENT FIXTURE on the card, not the app's active tournament filter alone.
If the match card shows a different tournament than the global filter, use the MATCH tournament and its surface.
Example: Munich BMW Open (ATP 250) is medium clay at low altitude; Madrid Mutua Madrid Open (Masters 1000) is medium-slower clay at altitude — they play very differently. Never mix them.

${matchupDigest ? `MATCHUP CARD — PLAYER DIGEST (use in WHY MISPRICED / WHY IT FITS — cite only these signals; do not invent stats)
Official event surface on card (ATP feed): ${boardSurfaceHint || "not on card — use tournament context above"}
${matchupDigest}

` : ""}${hasLiveBoard ? `LIVE MATCH BOARD
${liveBoard}

` : ""}ATP PLAYER DATABASE (surface-ranked snapshot — cite only these stats)
${atpSnapshot || "Not loaded"}

WTA PLAYER DATABASE (surface-ranked snapshot — cite only these stats)
${wtaSnapshot || "Not loaded"}

PROP GUIDE DIGEST — ACE / SERVE VOLUME (canonical; must match app Prop Guide card text)
${buildAcePropsDigest(context?.ace_props, tournamentSurface)}

ACE_PROPS_JSON (verbatim — same source as digest; use for field-level checks only)
${context?.ace_props ? contextJsonForModel(context.ace_props) : "{}"}

CONFIDENCE GUIDANCE
Default confidence: ${derivedConfidence}
Only go above that if the data strongly justifies it.

EXECUTION RULES — READ CAREFULLY
1. Opener authority is Step 1 of THE UNDERREVIEW RESPONSE FRAMEWORK above. The first sentence states the trigger condition (line threshold, surface/lineup status, game script). Do not open with a limitation, disclaimer, or pipeline note.

2. Never say "in data-only mode", "live feed unavailable", "based on available data",
   or any variation. The user does not care about your data pipeline. They want a call.

3. If breaking news is present above, it overrides everything else. Adjust the entire
   response to account for it — withdrawals, injuries, scheduling changes. Do not
   recommend a player who has withdrawn. Do not ignore news that changes the board.

4. Name specific players. Use the player database above.
   Do not give generic archetype-only answers — "clay specialist" is not a play unless tied to a named player and threshold.

5. Use the stats in the database rows: cElo, serve/hold hints, DR, surface notes, form strings.
   Reference them in WHY MISPRICED. Do not invent statistics.

6. Price discipline is mandatory on every answer.
   Every play must include a price threshold: "only at +150 or better",
   "only if implied probability is under 40%", "value entry under -120".
   Never recommend a play without a price anchor (bands are OK — do not invent a precise book quote).

7. If the live board has matches, use them.
   Name the players, round context, and what the board implies.

8. If no live board is shown, execute from the player database snapshot.
   Surface + cElo + serve/hold + surface notes + form = a specific, justified play.

9. For match bets: name player, market, price threshold, and one key statistical reason from the snapshot.
   For futures: name player, market (outright / top-4 / top-8), price threshold,
   why the surface profile justifies it, and one player or price to fade with reasoning.

10. For withdrawal or injury questions: immediately redirect to who benefits most.
    Reprice the field. Name the new favorite and the value plays that opened up.

11. Confidence must cite what data it rests on in CONFIDENCE line.
    High = specific snapshot stats + surface match + price discipline.
    Medium = surface model without live board confirmation.
    Speculative = thin data.
    Never call something High without citing the specific signals that justify it.

NO-MARKET FALLBACK RULE (ATP — mandatory when live board is thin, ace_props is empty, or match pricing is missing but tournament/player context is loaded)

You are NOT allowed to respond with "wait for lines" or "come back when books post"
as the primary answer.

Instead, do ALL of the following:

1. Open with a confident pre-market call: match winner framing or side market
   (games/sets) using surface Elo bands from the player database snapshot rows
   (cElo / hElo / gElo as provided) — no fabricated odds; use price-threshold language.

${NO_MARKET_VERIFIED_PLAYER_STEP_2}

3. For each player (when at least two names exist on the TENNIS PLAYER POOL above), state:
   - Market shape to watch (match winner band, spread in games, over/under games, ace prop)
   - A threshold in words ("only playable if implied favorite is under 65%")
   - Reasoning from surface Elo, serve/hold hints, DR, form strings, or round context on the board

4. When PROP GUIDE DIGEST / ace_props is present, tie ace overs/unders to named players using
   ONLY the numbers printed in PROP GUIDE DIGEST (or verbatim in ACE_PROPS_JSON). When the
   tournament surface is clay, the digest foregrounds avg_aces_clay — cite that value with label
   "clay aces/gm" exactly as shown. Do not substitute a different per-game ace average from memory.
   When liveMatches lists rounds or live flags, reference them explicitly.

5. End with a live trigger: set, break, or stat pace that would confirm or break the lean.

Never open with "no board pricing." Give named players, surface-backed ranges,
and something to watch from liveMatches or the snapshot.

REQUIRED RESPONSE FORMAT
Plain text only. No markdown. No bold. No asterisks.

One sharp opening sentence that is the call itself.

Then:

THE PLAY
[specific player + market + price threshold — one line]

MARKET MISTAKE
[what the book is mispricing and why — one to two lines]

WHY MISPRICED
[cite specific stats from the snapshot rows — one to two lines]

TIMING EDGE
[when to bet and why — one line]

WHY IT FITS
[surface + tournament fit + player profile — one to two lines]

FADE
[one explicit player or market to avoid, with one-line reason]

CONFIDENCE
[High / Medium / Speculative — followed by one phrase citing what data this rests on]

TIMING
[one line: bet now / wait for price / live trigger]${
      isWtaLeague
        ? `

SCOPE (mandatory extra line — WTA matchup or card)
SCOPE — Under Review is deepest on ATP markets; this WTA read uses tour-level profiles and live card context — confirm prices before sizing.`
        : ""
    }`;
  } else if (sportHint === "golf") {
    // DATA FRESHNESS: this sport reads from live APIs — no staleness injection needed.
    // If you ever add hardcoded fallbacks, add dataFreshness to the payload.
    const golfState = String(golfContextEffective?.currentEvent?.state || "").toLowerCase();
    const golfIsFinal = golfState === "post" || golfState === "final";
    const golfVerifiedBlock = buildGolfVerifiedPlayerListBlock(golfContextEffective);
    const golfHasVerifiedNames = collectGolfVerifiedNames(golfContextEffective).size > 0;
    const golfBetStructure = classifyGolfBetStructure(question, "golf");
    const golfOutrightBasketBlock = buildGolfOutrightBasketUserPromptAppendix(
      question,
      golfContextEffective?.odds?.outrights,
    );

    if (golfIsFinal) {
      userPrompt = `You are answering a golf question after the tournament has FINISHED.

${priorTakesSummary ? priorTakesSummary + "\n\n" : ""}Question:
${question}

Golf context:
${contextJsonForModel(golfContextEffective)}

${golfVerifiedBlock}
${buildGolfQuestionAlignmentPromptBlock(
        resolveGolfQuestionAlignmentArg(golfContextEffective),
        golfContextEffective?.currentEvent,
      )}
${buildGolfOddsFreshnessPromptBlock(golfContextEffective?.odds)}

TOURNAMENT STATUS: FINAL (currentEvent.state is post/final)
- Do NOT frame this as live betting, pre-market, or "wait for lines / tee times."
- Do NOT tell the user the event has not started or is scheduled for a future date.
- Answer from currentEvent.leaderboard and recentResults (if present) only — cite winner, final scores, and narrative of how the event unfolded.
- If the user asked for a "live" or "best bet" angle, reframe: there is no live market edge after the final putt; give a concise results recap and what the board says about who won and why.
- Name specific golfers from the leaderboard rows. Never invent a golfer not on the board.

FINAL RECAP — BETTING INTELLIGENCE (mandatory; narrative alone is incomplete)
When the tournament status is Final, the recap MUST include all of the following that the JSON can support (skip a bullet only if that slice is truly absent):
1) If odds.outrights rows include numeric American prices, which pre-tournament outrights would have CASHED versus the final leaderboard (name golfer + printed price from context only). If there are no numeric odds (field-only payload), state that in one line and skip hypothetical price tickets.
2) Which top-5 / top-10 / top-20 style prices in odds.topFinish (or related slices) would have cashed — cite the structure present in JSON; skip if empty.
3) Which make-cut prices in odds.makeCut cashed or lost for named golfers — only if those rows exist.
4) One concrete lesson for handicapping a future event at this course (field / setup / volatility) tied to what the final board showed.

Confidence guidance:
- Default confidence should be ${derivedConfidence}.

Use the standard Under Review sections (THE PLAY can be PASS or a retrospective note — not a new bet recommendation).`;
    } else {
      userPrompt = `You are answering a golf betting question.

${priorTakesSummary ? priorTakesSummary + "\n\n" : ""}Question:
${question}

Golf context:
${contextJsonForModel(golfContextEffective)}

${golfVerifiedBlock}
${buildGolfQuestionAlignmentPromptBlock(
        resolveGolfQuestionAlignmentArg(golfContextEffective),
        golfContextEffective?.currentEvent,
      )}
${golfOutrightBasketBlock}
${buildGolfOddsFreshnessPromptBlock(golfContextEffective?.odds)}

BET STRUCTURE (server classification — obey for wording and math):
- marketType: ${golfBetStructure.marketType}
- structure: ${golfBetStructure.structure}
${golfBetStructure.structure === "basket" ? "- This turn is NOT a parlay; use basket / coverage / multiple singles only." : ""}

Confidence guidance:
- Default confidence should be ${derivedConfidence}.
- Only go above that if the input strongly justifies it.
${nbaConfidenceModifier.reason ? `- Confidence modifier: ${nbaConfidenceModifier.reason}` : ""}

${buildUrTakeSportTurnScopeRules("golf")}

Rules:
- Use the tournament, odds, rankings, and player names in the provided golf context.
- currentEvent.leaderboard has live positions when the feed provides them — cite scores/positions from those rows when present.
- If a golfer the user names is a known PGA Tour pro but missing from live leaderboard rows, do NOT refuse — note "leaderboard position not yet available" and analyze from rankings, season form, course fit, and static profile data in context.
- Never say a legitimate PGA Tour pro is "not in the verified field", "not on the live leaderboard" as a refusal, or "not in the field."
- Short follow-ups ("any sleepers?", "who else?", "best value longshot?") still apply to this same Golf context JSON — use the leaderboard and odds here; never tell the user to re-paste a screenshot or resend the board when this payload includes field data.
- If data is limited, still stay within golf and give the best golf lean from the available board.
${
  golfHasVerifiedNames
    ? `- Name the golfer(s) the user asked about when they are known PGA Tour professionals or appear in the GOLF FIELD list above.
- For betting-market questions: if odds.outrights has numeric prices, THE PLAY must begin with one specific golfer name and market (example: "Collin Morikawa top-20") using prices from context only. If there are no posted prices, lean on form / course fit without inventing odds.`
    : `- Live field list is thin — still analyze any known PGA Tour pro the user names; do not invent book prices.`
}
- Do not invent unrelated teams, games, or props.

NO-MARKET FALLBACK RULE (mandatory when odds.outrights is empty or thin but leaderboard or event context exists)

You are NOT allowed to respond with "wait for book prices" as the primary answer.

Instead, do ALL of the following:

1. Open with a confident pre-market angle: top-10, top-20, make-cut, or
   matchup H2H — using leaderboard position, strokes-gained narrative from
   context, and course fit.

${NO_MARKET_VERIFIED_PLAYER_STEP_2}

3. For each golfer (when at least two names exist on the GOLF FIELD list above or the user named known pros), state:
   - The market shape to watch (top-10 / top-20 / make cut / first-round leader)
   - A verbal price band or "only if outright is +X or longer" when odds rows exist;
     if no numbers, give a range in words tied to world ranking and form
   - Reasoning from courseStats, recent rounds, or fit notes in context

4. Tie reads to leaderboard position and volatility: chasing vs protecting a lead — but separate "who leads" from "where the bet is" when a SESSION STRUCTURAL EDGE block is present.

5. End with a live trigger: what hole range or round split would flip the lean.

SESSION STRUCTURAL EDGE (when present in PRIOR TAKES / structural block above):
- The established structural player is the primary betting angle; the leaderboard leader is context, not an automatic replacement for THE PLAY.
- Dual framing when they differ: "[Leader] has the lead; [Structural player] is the value / structural play we flagged."
- Only flip the structural edge if you name new evidence (WD, injury, weather, collapse) — not because the board changed.

Never open with market-availability throat-clearing. Give monitoring hooks; name golfers from the GOLF FIELD list or known PGA Tour pros the user asked about.`;
    }
  } else if (sportHint === "nba") {
    const nbaQuestionForModel = sanitizeNbaQuestionForGeneration(question, nbaContext);

    if (isConversationFollowUp) {
      const nbaRosterListBlockFollowUp = buildNbaRosterProminentInjection(nbaContextForModel, {
        hasImage,
        question,
        matchup: nbaMatchup,
      });
      userPrompt = `You are answering a short NBA betting follow-up.

${priorTakesSummary ? priorTakesSummary + "\n\n" : ""}Question:
${nbaQuestionForModel}

${nbaMatchupGroundingBlock ? `${nbaMatchupGroundingBlock}\n\n` : ""}${nbaImpactSummary ? `HIGH-PRIORITY NBA NEWS IMPACT (SERVER-COMPUTED — READ FIRST)
${nbaImpactSummary}

` : ""}${nbaInvalidation.unresolved && nbaInvalidation.targetedPlayer ? `UNRESOLVED AVAILABILITY FLAG
Target player: ${nbaInvalidation.targetedPlayer}
Status: ${nbaInvalidation.statusDisplay || nbaInvalidation.statusClass}
Rule: Do not give false certainty. Keep any take contingent on confirmed status.

` : ""}${sportHint === "nba" && nbaGameStateGate ? formatNbaGameStateBlocksForUserPrompt(nbaGameStateGate) : ""}${nbaFinalsContextBlock ? `${nbaFinalsContextBlock}\n` : ""}${nbaFinalsOutrightsBlock ? `${nbaFinalsOutrightsBlock}\n\n` : ""}NBA context (full board — same filtered payload as the opening turn; cite only numbers present):
${contextJsonForModel(nbaContextForModel)}
${buildNbaPropsFreshnessPromptBlock(resolveNbaPropsOddsForPrompt(nbaContextForModel, nbaMatchup))}
${buildNbaKeyPropsLinesPromptBlock(nbaContextForModel, resolveNbaPropsOddsForPrompt(nbaContextForModel, nbaMatchup))}
${buildNbaGameTotalsPromptBlock(nbaContextForModel, nbaMatchup)}

Default confidence should be ${derivedConfidence}.

${nbaRosterListBlockFollowUp}

IMPORTANT: playerStatsText may contain season-average rows with stale team assignments. The INTERNAL authorized-name roster block above overrides playerStatsText for team assignments when both appear.

${NBA_FOLLOW_UP_THREAD_RULE}`;
    } else {
    const nbaRosterListBlock = buildNbaRosterProminentInjection(nbaContextForModel, {
      hasImage,
      question,
      matchup: nbaMatchup,
    });
    const firstSessionGuaranteeBlock = buildFirstSessionGuaranteeInjection(firstSessionGuaranteeFeature);

    userPrompt = `You are answering an NBA betting question.

${priorTakesSummary ? priorTakesSummary + "\n\n" : ""}Question:
${nbaQuestionForModel}

${sportHint === "nba" ? `INTERNAL NBA CONTROL (DO NOT QUOTE OR REPEAT VERBATIM)
- decisionMode: ${nbaDecisionMode}
- Obey the NBA DECISION MODE SPINE appended to the system prompt for this mode (substance + avoidance). User prompt rules below still apply where they do not conflict.
- Never print internal labels, control headers, or mode names to the user.

` : ""}${firstSessionGuaranteeBlock ? `${firstSessionGuaranteeBlock}

` : ""}${sportHint === "nba" && nbaGameStateGate ? formatNbaGameStateBlocksForUserPrompt(nbaGameStateGate) : ""}${sportHint === "nba" && nbaPlayerResolutionBlock ? `${nbaPlayerResolutionBlock}

` : ""}${nbaConditionalPayload ? `INTERNAL CONDITIONAL PAYLOAD (DO NOT QUOTE OR REPEAT VERBATIM)
- targetPlayer: ${nbaConditionalPayload.player}
- currentStatus: ${nbaConditionalPayload.status}
- listedMarket: ${nbaConditionalPayload.listedMarkets}
- IF ACTIVE: ${nbaConditionalPayload.ifActive}
- IF OUT: ${nbaConditionalPayload.ifOut}
- IF UNRESOLVED: ${nbaConditionalPayload.ifUnresolved}

` : ""}${nbaImpactSummary ? `HIGH-PRIORITY NBA NEWS IMPACT (SERVER-COMPUTED — READ FIRST)
${nbaImpactSummary}

` : ""}${nbaInvalidation.unresolved && nbaInvalidation.targetedPlayer ? `UNRESOLVED AVAILABILITY FLAG
Target player: ${nbaInvalidation.targetedPlayer}
Status: ${nbaInvalidation.statusDisplay || nbaInvalidation.statusClass}
Rule: Do not give false certainty. Keep any take contingent on confirmed status.

` : ""}${nbaMatchupGroundingBlock ? `${nbaMatchupGroundingBlock}\n\n` : ""}${
      nbaContextForModel?.focusedSeriesSnapshot?.serverSummaryOneLiner
        ? `FOCUSED PLAYOFF SERIES (board-verified — mirror this in series framing; do not invent wins/game number)\n${nbaContextForModel.focusedSeriesSnapshot.serverSummaryOneLiner}\n\n`
        : ""
    }${nbaFinalsContextBlock ? `${nbaFinalsContextBlock}\n` : ""}${nbaFinalsOutrightsBlock ? `${nbaFinalsOutrightsBlock}\n\n` : ""}${
      nbaIntentForHandler === NBA_INTENT.PREDICTIONS_ROUNDUP ? `${NBA_PREDICTIONS_ROUNDUP_PROMPT}\n\n` : ""
    }NBA context:
${contextJsonForModel(nbaContextForModel)}
${buildNbaPropsFreshnessPromptBlock(resolveNbaPropsOddsForPrompt(nbaContextForModel, nbaMatchup))}
${buildNbaKeyPropsLinesPromptBlock(nbaContextForModel, resolveNbaPropsOddsForPrompt(nbaContextForModel, nbaMatchup))}
${buildNbaGameTotalsPromptBlock(nbaContextForModel, nbaMatchup)}

Confidence guidance:
- Default confidence should be ${derivedConfidence}.
- Only go above that if the input strongly justifies it.

${nbaRosterListBlock}

IMPORTANT: playerStatsText may contain season-average rows with stale team
assignments. A player listed as ATL in playerStatsText may have been traded.
The INTERNAL authorized-name roster block above overrides playerStatsText for team assignments.
If a name appears in playerStatsText but not under that team in playersByTeamAbbrev / the authorized list,
do not cite them as being on that team tonight.

When using the Tier-3 format (opener prefixed with ">> ", then THE PLAY and following sections),
no preamble, no roster disclaimer, no source caveat — nothing before the opener sentence.
The opener content is governed by Step 1 of the framework; the ">> " prefix is formatting only.

TEAM-LEVEL READ REQUIREMENTS (mandatory when named players are unavailable)

When you cannot name specific players, you MUST anchor the response to
verifiable team-level data from the provided nbaContext. Specifically:

1. Series context from playoffSeries — what is the current series record?
   Who has home court? What were the scores of prior games in this series?
   This is MORE useful than player names for series betting.

2. Pace and scoring from gameTotals — what is the total line for this game?
   Is this a high-pace or low-pace matchup based on available data?

3. Injury context from injuries array — are any key players listed as out
   or doubtful? This directly affects every prop on the slate.

4. Season context from seasonContext — are we in playoffs? What phase?
   Playoff basketball has specific patterns that change prop values.

Generic statements like "bench guys either explode or vanish" or "home
court helps the home team" are FORBIDDEN when specific series data,
injury reports, or game totals are available in the context.

If the injuries array shows a star player is out, LEAD WITH THAT.
If the series is 3-0, LEAD WITH THAT — series pressure changes everything.
If the game total is 215.5, that tells you something specific about pace
expectations. USE IT.

${nbaInvalidation.requiresStatusAcknowledgement && nbaStatusShiftLine ? `STATUS SHIFT ACKNOWLEDGMENT — MANDATORY
You must explicitly acknowledge this status shift in the response:
${nbaStatusShiftLine}
If output is JSON Tier 2.5, include this in "statusShift" and keep it decisive.

` : ""}

The goal: a user reading this response should learn something specific
about ATL vs NYK tonight that they couldn't get from a generic sports
column. If the response could apply to any two playoff teams, rewrite it.

${ROSTER_ENFORCEMENT_NBA}

${buildUrTakeSportTurnScopeRules("nba")}

Rules:
- Do not invent unrelated games or props.
- Stats in the nbaContext are the ONLY stats you may cite with confidence.
  Never cite a specific percentage or compression rate unless it appears in the provided context payload. If grounded data does not contain a percentage, describe the pattern qualitatively instead. Do not apply estimated compression rates to multiple players in the same response — that is a fabrication pattern regardless of whether the percentages differ.
- If the question references a live game (contains score, time remaining, or
  an attached screenshot), ALWAYS acknowledge the current game state first.
  Never declare a prop a winner while the game is still in progress.
- If a player mentioned in the question is not in today's injury report or
  game list, reflect uncertainty only in CONFIDENCE — never lead the answer with data-availability throat-clearing.
- NBA availability is enforced globally via INJURY GROUNDING (NBA BDL) in the system registry — use the \`bdlAvailability\` array (not training memory).
- When a player row includes "tonightGame", that matchup string comes from today's prop board (Odds API) and is more current than the "team" field from BallDontLie after trades — use it for who plays in which game tonight.
- When "playerStatsText" is present and statsSource is "game_box", treat it as the primary roster truth for who played for which team today (from game box scores). When statsSource is "season_average", do not treat team abbreviations as tonight's lineup — they may lag trades.
- If todaysGamesSlateNote is set, todaysGames is empty for the reason given (e.g. BallDontLie returned no games for that ET date). Trust that note instead of guessing a pipeline failure.
- POSTED PROP LINES (propsOdds): when propsOdds.hasPostedLines is true, prefer
  propsOdds.players[].props (points/rebounds/assists) and per-book prices over
  legacy propLines for cited American lines. Obey ODDS FRESHNESS above — if stale,
  do not cite specific prices as live.
- PROP BOARD HYGIENE: propLines are filtered server-side to drop games that are
  already final (Odds event.completed and/or todaysGames.state === "post").
  Never use a prop row for a matchup that is Final in todaysGames as a "tonight"
  lean — treat those as stale. If the market snapshot still includes completed
  games, ignore those rows and apply the fallback below.

FALLBACK RULE (mandatory when active player prop markets are unavailable for an upcoming/live game the user cares about)

Do not treat unavailable markets as an excuse for thin analysis. The user is here because tip is close.

FALLBACK FORMAT (mandatory when markets are unavailable for a matchup you can see in context):

Same ROSTER DISCLOSURE RULE as above — never mention partial rosters, loading, or which names are "verified."

Open with the sharpest matchup observation you can ground in playerStats, rosterGrounding,
injuries, playoffSeries, or gameTotals — not a dismissal.

Then deliver, in prose (no bullets): (1) primary structural angle from verified stats and matchup;
(2) game script / pace framework using numbers only when present in context (gameTotals, box, recentGames);
(3) one live trigger tied to pace, foul trouble, rotation, or observable stat clips from context — no fabricated thresholds.

Do NOT use "Watch for:" as a section header.
Do NOT use player names as headers (no "JALEN BRUNSON —").
Do NOT open with empty-slate throat-clearing about data availability.
${NBA_STRUCTURAL_MARKET_CLOSING_RULE}

LIVE NBA OVERRIDE: Never surface technical errors, variable names, array names, HTTP status codes, or API details to users. Ever. No exceptions.
When prop lines are unavailable, do not mention it. Do not apologize. Do not explain. Pivot to the strongest angle from live game state: minutes played, pace, foul trouble, rotation patterns, early stat lines, and matchup dynamics.
Lead with the angle, not the caveat. Never open with what you don't have.
When analyzing a live game, close the response with a one-line signature in this format: TEAM1 SCORE, TEAM2 SCORE · Q? TIME · Live. This replaces the need to announce "the game is live" in the opening.

Ignore unrelated injury callouts from the raw user text when they do not match the targeted player/team in this take.

Hard cap: keep the entire answer under 200 words.

Internal structure (do not print these labels):

[Opening line — one sentence, sharpest matchup observation you can defend from context]

[Paragraph 1 — primary structural angle from verified averages vs this matchup. LEAD WITH THE EDGE,
then reasoning. Numbers only from payload (recentGames, playerStats, gameTotals). Max 3 sentences.]

[Paragraph 2 — game total / pace framework: cite totals or pace figures only when they appear in context.
Max 2 sentences. Tie opinions to scheme, injuries, or series facts when you explain why.]

[Paragraph 3 — live trigger from observable game state in context — player, stat clip, rotation, or foul pattern.
Numbers only if visible in live/box context. Max 2 sentences. Cut filler like "rosters shift fast."]

When the INTERNAL authorized-name block lists names for both sides of the matchup, prefer weaving in one player per team across the answer when it fits naturally — not a hard rule. Never invent a player name.
Use only players who appear in that authorized-name block above (unless Question/image authorizes otherwise).

LEAD WITH THE EDGE, NOT THE SETUP.

Every paragraph must start with the conclusion, not the context.

Wrong: "Brunson in playoff home games typically runs high usage. Look for his line in the 24–28 range and lean under if it opens at 27.5."

Right: "Brunson under is the lean if his line opens 27.5 or higher — Knicks depth means he doesn't need to carry at home."

The edge comes first. The reason comes second. Always.

Example shape (ATL vs NYK — adapt names and numbers to verified context only):

Brunson under is the lean if his line opens 27.5 or higher — Knicks depth means he doesn't need to carry at home in the playoffs.

KAT's 3PM line is the other read. Atlanta's perimeter scheme runs him off the arc in high-leverage possessions — under 3.5 is the play if it posts at even money or better.

If gameTotals in context shows 214.5, that band is the pace read: a line that low usually means both sides expect a grind — lean under on big player overs. If the same block shows 222+, plan for a track meet and nudge player overs. Use the number in the JSON, not a wait for the book.`;
    }
  } else if (sportHint === "mlb") {
    // DATA FRESHNESS: this sport reads from live APIs — no staleness injection needed.
    // If you ever add hardcoded fallbacks, add dataFreshness to the payload.
    const mlbVerifiedBlock = buildMlbVerifiedPlayerListBlock(mlbContext, question);

    userPrompt =
      mlbDecisionMode !== "actionable"
        ? buildMlbPreMarketUserPrompt({
            question,
            mlbContext,
            derivedConfidence,
            priorTakesSummary,
            mlbVerifiedBlock,
          })
        : buildMlbActionableUserPrompt({
            question,
            mlbContext,
            derivedConfidence,
            priorTakesSummary,
            mlbVerifiedBlock,
          });
  } else if (sportHint === "f1") {
    const f1VerifiedBlock = buildF1VerifiedDriverListBlock(f1Context, question);
    const f1OddsBlock = buildF1OddsPromptBlock(f1Context?.odds || f1Context?.smarketsOdds);

    userPrompt = `You are answering a Formula 1 betting question.

${priorTakesSummary ? priorTakesSummary + "\n\n" : ""}Question:
${question}

F1 context:
${contextJsonForModel(f1Context)}
${f1OddsBlock}

Confidence guidance:
- Default confidence should be ${derivedConfidence}.
- Only go above that if the input strongly justifies it.

${f1VerifiedBlock}

${buildUrTakeSportTurnScopeRules("f1")}

Rules:
- The F1 context JSON is server-assembled; **never** ask the user to paste F1 data, context, or screenshots to proceed.
- Use the queryFocus and schedule.races fields in context for the event the user named (e.g. Miami Grand Prix) when present.
- Whether odds grids or qualifying splits appear or not, deliver the same-caliber **race-only** read: head-to-head matchup, points finish, qualifying pace, tire or weather hooks — grounded only in fields present in context.
- Do not invent unrelated drivers, races, or props.

NO-MARKET FALLBACK RULE (mandatory when betting markets in context are thin or odds blocks are empty but the next race or weekend is upcoming)

You are NOT allowed to respond with "wait for prices" or "check back when
markets post" as the primary answer.

Instead, do ALL of the following:

1. Open with a confident pre-race angle: podium finish lean, top-6, or
   head-to-head constructor pairing — grounded in driver standings and session
   data you actually have.

${NO_MARKET_VERIFIED_PLAYER_STEP_2}

3. For each driver (when at least two names exist on the F1 DRIVER POOL above), tie to:
   - Podium or top-N finish framing from current points / form
   - Qualifying-to-race correlation when session data lists practice or qual gaps
   - Constructor teammate dynamic when both appear in context

4. Use schedule.races and sessions: reference next race name, track type, and
   weather or format notes only if present in context — never invent session times.

5. End with a live trigger: what to watch in FP3/qualifying or lap 1 that would
   confirm or break the lean.

Never open with "no odds yet." Give them a monitoring plan and a priced band
in words (e.g. "podium only makes sense at +400 or better — watch qual gap").`;
  } else if (sportHint === "nfl") {
    const canonicalNfl = await buildCanonicalNflContext({ question, matchupContext });
    const nflContextEffective =
      nflContext && String(nflContext).trim()
        ? nflContext
        : canonicalNfl.promptContext;

    const nflDataFreshness =
      typeof nflContext === "object" &&
      nflContext !== null &&
      !Array.isArray(nflContext) &&
      nflContext.dataFreshness
        ? nflContext.dataFreshness
        : canonicalNfl.dataFreshness;

    const availableNflPlayers = extractNflPlayersFromContext(nflContextEffective);
    const subject = extractNflQuestionSubject(question);
    const matchedPlayer = findNflPlayerMatch(subject, availableNflPlayers);

    const nflDraftAngle = isNflDraftAngleQuestion(question);
    const draftBundleForPrompt = getActiveDraftBundle();
    const draftPhase = getNflDraftPhase(new Date(), draftBundleForPrompt);
    const nflDraftWindowActive =
      nflDraftAngle && (draftPhase === "pre_draft" || draftPhase === "during_draft");
    const draftProspectBlock = buildNflDraftProspectBlock(draftBundleForPrompt);
    const focusTeamFromQuestion = resolveNflTeamFromQuestion(question);
    const nflTeamAbbrFromQuestionMap = detectNflTeamHint(question);
    const focusTeam =
      focusTeamFromQuestion ||
      (nflTeamAbbrFromQuestionMap
        ? getNflTeamNameFromAbbr(nflTeamAbbrFromQuestionMap)
        : null) ||
      getNflTeamNameFromAbbr(teamHint);
    const focusTeamAbbr = focusTeam
      ? getNflTeamAbbrFromName(focusTeam)
      : String(teamHint || "").toUpperCase() || null;
    const focusTeamAbbrFromResolvedName = focusTeamFromQuestion
      ? getNflTeamAbbrFromName(focusTeamFromQuestion)
      : null;
    const teamHintAbbrRaw = String(teamHint || "").trim().toUpperCase();
    const focusTeamAbbrFromClient =
      teamHintAbbrRaw && getNflTeamNameFromAbbr(teamHintAbbrRaw)
        ? teamHintAbbrRaw
        : null;
    /** Regex-extracted franchise name → abbr; else nickname/city map on question text; else validated client tab hint. TYPE_B league-wide wins inside route() before TYPE_A. */
    const focusTeamAbbrForRoute =
      focusTeamAbbrFromResolvedName ||
      nflTeamAbbrFromQuestionMap ||
      focusTeamAbbrFromClient ||
      null;
    const nflDraftRoute = nflDraftWindowActive
      ? getNflDraftQuestionRoute(question, focusTeamAbbrForRoute)
      : null;
    draftTeamSimulationInject =
      nflDraftWindowActive && nflDraftRoute === "TYPE_A";
    const teamState = focusTeamAbbr ? draftBundleForPrompt?.teams?.[focusTeamAbbr] : null;
    const teamPickList = (teamState?.picks || [])
      .filter((p) => Number(p?.round || 9) <= 3)
      .sort((a, b) => Number(a.overall || 0) - Number(b.overall || 0))
      .map((p) => `R${p.round} #${p.overall}`)
      .join(", ");
    const teamNeedPriority = (teamState?.needPriority || teamState?.needs || []).join(", ") || "best-player-available";
    const sensibleSimulation =
      draftTeamSimulationInject && focusTeamAbbr
        ? simulateDraftRounds({ teamAbbr: focusTeamAbbr, rounds: 3, chaosMode: false })
        : null;
    const chaosSimulation =
      draftTeamSimulationInject && focusTeamAbbr
        ? simulateDraftRounds({ teamAbbr: focusTeamAbbr, rounds: 3, chaosMode: true })
        : null;
    const prospectsFormattedByPosition = buildDraftProspectsByPositionBlock(draftBundleForPrompt);
    const teamCapitalBlock =
      nflDraftAngle && focusTeam
        ? buildTeamDraftFocusBlock(focusTeam, draftBundleForPrompt)
        : "";
    const nflContextForPrompt =
      (typeof nflContextEffective === "string"
        ? nflContextEffective
        : contextJsonForModel(nflContextEffective)) +
      (teamCapitalBlock ? `\n\n---\n\n${teamCapitalBlock}` : "");
    const nflVerifiedBlock = buildNflVerifiedPlayerListBlock(nflContextEffective, question);

    const questionPropNames = [];
    if (subject) questionPropNames.push(subject);
    if (matchedPlayer && !questionPropNames.includes(matchedPlayer)) {
      questionPropNames.push(matchedPlayer);
    }
    const questionPropSlice = formatPropContextForPlayers(questionPropNames, 3);

    let nflUserPromptBody = `You are answering an NFL betting question.

${priorTakesSummary ? priorTakesSummary + "\n\n" : ""}Question:
${question}

DATA FRESHNESS — READ FIRST
${nflDataFreshness != null ? JSON.stringify(nflDataFreshness, null, 2) : "Staleness metadata not available"}

NFL context:
${nflContextForPrompt}

Confidence guidance:
- Default confidence should be ${derivedConfidence}.
- Only go above that if the input strongly justifies it.

${nflVerifiedBlock}

${draftProspectBlock}

${
  nflDraftWindowActive
    ? `DRAFT QUESTION CLASSIFICATION — read the question and pick exactly one route (THIS REQUEST: ${nflDraftRoute}):

TEAM NAME EXTRACTION (mandatory before asking for clarification):

Before responding "Which team?", scan the user's question for NFL team nicknames and cities (cowboys, eagles, chiefs, patriots, ravens, kansas city, green bay, etc.).

Server-resolved team abbreviation for this request: ${focusTeamAbbrForRoute || "NONE"}.

Examples: "simulate the cowboys draft" → teamHint DAL → Dallas simulation; "what should the chiefs do?" → KC; "jets mock draft" → NYJ.

Only ask "Which team?" if NO team name or city appears anywhere in the question AND the resolved abbreviation above is NONE. If ANY team reference exists in the question OR the server resolved an abbreviation, run the simulation immediately — no clarification interrogatives.

TYPE A — TEAM SIMULATION
Signals: "simulate [team]", "Cowboys draft", "what will [team] do", "[team] mock",
"[team] rounds 1-3", "my team's picks", "pick by pick", "mock draft"
Response: Run sensible board + chaos branch only when a franchise is resolved below.
Never ask for a team when the question is Type B or Type C.

TYPE B — LEAGUE-WIDE DRAFT ANALYSIS
Signals: "biggest sleepers", "best value picks", "who falls", "who rises",
"best prospect at [position]", "most interesting situation", "who goes top 5",
"best players available", "which team wins the draft"
Response: Answer directly from the VERIFIED prospect pool above. No team required.
Never ask which team the user means. Never route this to simulation.

TYPE C — PROSPECT PROFILE
Signals: player + "draft", "where does [player] go", "grade on [player]",
"[player] fit", draft stock/range/projection questions
Response: projectedRange, positionalRank/EDGE (or position rank), strengths/concerns if in pool, and 2–3 best-fit teams grounded in TEAM DRAFT CAPITAL needs when context exists.

RULE: Never ask for a franchise when the route is TYPE B or TYPE_C.
RULE: Never use numbered clarification lists ("1. Give me...", "2. Tell me...").
RULE — DRAFT TONE (Types A/B/C): Never open with what you need ("I need...", "Give me:",
"Once you X I'll Y"). Lead with insight; if you genuinely lack one fact, ask in one neutral sentence — never transactional or bossy.

`
    : ""
}${
  nflDraftWindowActive && !draftTeamSimulationInject
    ? `NFL DRAFT — ANALYSIS MODE (${nflDraftRoute}, not team simulation):
Answer the user's question outright. Pull every prospect name from VERIFIED anchors / pool rows only — cite projectedRange, consensusRank, nflGrade there and compare to positional value tiers.
Do NOT append team-mock simulations unless they asked for a team's picks.

TYPE B — OPEN / LEAGUE QUESTIONS:
If which team wins the draft / most interesting capital / league-wide sleeper questions: answer with concrete teams or prospects plus reasoning — zero clarification interrogatives.

TYPE B — SLEEPERS ("sleepers", "best value vs ADP/board", falls):
Use this layout (titles optional; keep tight):

DRAFT SLEEPERS — 2026

[Player], [Position], [School] — one line tying undervaluation to likely draft slot vs where their traits say they belong (use pool ranges).
[repeat for 5–7 names drawn from verified pool rows — not memorized scouting]

ROUND VALUE NOTE
One sentence naming which round clusters have the richest mispriced traits this year based on POOL tiers (example pattern only: Round 3 interior depth depressing Day 2 IOL valuations).

Define sleeper using POOL cues: consensus/projected band clearly later than traits suggest, multi-team fits underpriced versus consensus landing spot, medical/character noise — always cite pool fields instead of invented hype.

TYPE C — PROSPECT PROFILE:
Structured answer: positional rank vs class, projectedRange + source bands in pool, strengths/concerns arrays when present, then 2–3 teams whose TEAMS needs + picks map cleanly.

`
    : ""
}${
  draftTeamSimulationInject
    ? `NFL DRAFT 2026 — TEAM SIMULATION MODE ONLY (TYPE_A)

Team: ${focusTeamAbbr || "UNKNOWN"}
Picks: ${teamPickList || "No rounds 1-3 picks found in active state"}
Priority needs: ${teamNeedPriority}
Draft location: ${draftBundleForPrompt?.event?.location || "Pittsburgh, PA"}

VERIFIED PROSPECT POOL (rounds 1-4 only — do not name prospects outside this list):
${prospectsFormattedByPosition}

SIMULATION BASELINE (engine output — align narrative; validate slot realism — only when Team is NOT UNKNOWN below)
SENSIBLE: ${sensibleSimulation ? JSON.stringify(sensibleSimulation) : "(no franchise resolved — skip baseline)"}
CHAOS: ${chaosSimulation ? JSON.stringify(chaosSimulation) : "(no franchise resolved — skip baseline)"}

SIMULATION RULES (mandatory — TYPE A team resolved only):
1. Target under 400 words total.
2. Never open with inability hedges — open directly with the simulation header.
3. Only detail picks for the anchored team — use slot numbers under Picks.
4. No league-wide mock of picks 1–11 unless one short clause ties to YOUR pick.
5. Labels for missing pool names: "Day 3 / UDFA range" — never invent prospects.

TYPE A — TEAM UNKNOWN (mandatory stop):
If Team shows UNKNOWN OR no NFL franchise was resolved AND the route is TYPE_A, respond with ONLY this exact sentence — nothing before or after, no apologies, no lists:

Which team? Drop the franchise and I'll run the board — sensible scenario plus a chaos branch.

MY TEAM wording with no franchise also maps here — identical single-line reply.

TYPE A — TEAM RESOLVED:
Use baseline JSON only if SENSIBLE/CHAOS rows exist above; otherwise synthesize obeying slot validation.

PROSPECT SLOT VALIDATION (mandatory before finalizing any simulation):
- Each prospect must appear in VERIFIED anchors / pool.
- Respect projectedRange + consensusRank + projectedRound — no absurd reaches vs bands (David Bailey ≠ top 12 profile on this board).
- POSITION_VALUE_MAP & economics still apply.

FOCUS TEAM: Only ${focusTeam || focusTeamAbbr || "[named team]"} slots/needs unless question names another trade partner.`
    : ""
}

${buildUrTakeSportTurnScopeRules("nfl")}

Rules:
- Use only players/teams/roles that exist in the provided NFL context — **except** the "NFL DRAFT BOARD" section: Round 1 pick numbers, team slot holders, trade notes on those slots, and OFFICIAL ROUND 1 PICKS (when populated) are authoritative for draft questions.
- If the asked player is not in provided context, return PASS and explain missing context in one line — **unless** the question is draft-centric (see DRAFT / GM MODE below); then you may discuss well-known prospects qualitatively but must not fabricate who was selected at which slot.
- Draft identity enforcement: for draft-centric questions, any prospect name outside VERIFIED 2026 DRAFT PROSPECT ANCHORS must be labeled "simulation-only (UDFA-range)" before analysis.
- Do not invent unrelated games, props, role changes, or target-share claims.

- Data staleness: If DATA FRESHNESS above shows isCurrentSeason: false, you MUST include exactly one short line acknowledging the limitation — **except in NFL DRAFT TEAM SIMULATION (see below)**, where staleness belongs only in the single CONFIDENCE block at the end. Example phrasings: "Working off 2024 QB stats and offseason tier data — this gets sharper once Week 1 posts." / "Offseason snapshot, not live 2026 — flagging uncertainty accordingly." Do not let this line dominate the answer, but do not omit it when the snapshot is not current-season.`;

    nflUserPromptBody += `

${
  draftTeamSimulationInject
    ? `NFL DRAFT SIMULATION — RESPONSE FORMAT (mandatory; omit fully if you already returned the single-line franchise prompt for UNKNOWN team)

CRITICAL RULES BEFORE WRITING ANYTHING:

1. Do not open with "I can't" or "without live war-room intel" or any hedge. Everyone knows mocks are speculation. Skip that entirely. Open directly with the simulation.

2. No board-flow paragraphs. Do not list who goes at picks 1–11 in a wall of text. The user asked about their team, not the entire draft. The only prospect names you list in depth are the picks for the team being simulated.

3. Board context belongs in ONE line per pick maximum (under the pick line). Not a separate "BOARD FLOW" section.

4. The CHAOS BRANCH must be:
   - ONE sentence describing the disruptive event (specific, plausible — trade-up, medical flag, run at a position, rival reach).
   - Then 2–3 lines showing how the team adapts and why it still works.
   - Chaos means the board shifts — not absurd reaches or profiles that violate PROSPECT SLOT VALIDATION.

5. BOARD WATCH BEFORE THURSDAY is 2–3 specific pre-draft storylines that directly affect THIS team's picks — not generic draft advice.

6. CONFIDENCE: ONE appearance only, at the end. Do not repeat simulation disclaimers elsewhere. No duplicate "offseason snapshot" lines outside CONFIDENCE.

7. Only name prospects from the verified 2026 draft pool. Honor PROSPECT SLOT VALIDATION above.

REQUIRED FORMAT — use this structure (replace brackets with real picks/slots for the requested rounds):

[TEAM] DRAFT SIMULATION — 2026

SENSIBLE BOARD

Pick [overall #]: [Player], [Position], [School]
[One line — why this pick at this slot]

Pick [overall #]: [Player], [Position], [School]
[One line — why]

(add lines for each pick the user asked for — must match this team's actual slots from Picks above)

---

CHAOS BRANCH

[One sentence: the disruptive event]
[2–3 lines: how the team adapts and why it still works — may reference different prospect names if slots change, still validated]

---

BOARD WATCH BEFORE THURSDAY
• [Specific storyline — direct impact on this team's board]
• [Another specific storyline]
• [Optional third]

CONFIDENCE
Simulation. Pre-draft consensus board + verified prospect pool. Accuracy sharpens once live trades and day-of decisions are known.[If DATA FRESHNESS requires it, append one short staleness clause here only — nowhere else.]`
    : teamCapitalBlock
      ? `TEAM PICK-BY-PICK SIMULATION:
- Anchored team: ${focusTeam}. Use TEAM DRAFT CAPITAL rows in order when user asks for pick-by-pick outcomes.
- Never present a name as a locked-in league selection pre-draft; frame as likely paths.`
      : ""
}

${
  draftTeamSimulationInject
    ? ""
    : nflDraftAngle && nflDraftWindowActive
    ? ""
    : nflDraftAngle
    ? `NO-MARKET / DRAFT ANGLE (when the question is draft-centric, not a priced prop, and you are outside the pre/during-draft windowed analysis above):
You are NOT allowed to stall with "wait until the draft" as the whole answer.

Instead:
1. Open with board truth: their Round 1 slot(s) from NFL DRAFT BOARD and any trade-note capital.
2. Map roster need → 2–3 realistic target buckets (position/archetype), without claiming a player "will" go at a specific pick unless clearly hypothetical.
3. Name one trade-up or trade-back lever that fits their slot + needs.
4. End with a live trigger: what combine / medical / pro-day / smoke-screen signal would flip the lean.

Skip the generic "two active NFL players from the prop board" requirement when this block applies.`
    : `NO-MARKET FALLBACK RULE (mandatory when prop boards or weekly lines are empty in context but games or usage data imply an upcoming slate)

You are NOT allowed to respond with "wait for lines" or "come back when props drop"
as the primary answer.

Instead, do ALL of the following:

1. Open with a confident pre-market call: anytime TD, passing yards, rushing
   yards, or receptions — anchored to defense tier data and player role from
   nflContext.

${NO_MARKET_VERIFIED_PLAYER_STEP_2}

3. For each player (when at least two names exist on the NFL PLAYER POOL above), state:
   - The prop type to watch
   - A pre-market band in words ("fade yards if the line opens above 275")
   - Reasoning from matchup defense tiers, red-zone role, or snap context in the payload

4. Tie offense to opposing defense tiers and game environment when those fields exist.

5. End with a live trigger: quarter or script cue that would confirm the lean
   (e.g. "If they're trailing early, check live pass attempts over").

Never open with "props aren't out." Give named players and monitoring hooks.`
}`;

    userPrompt = questionPropSlice
      ? `${questionPropSlice}\n\n${nflUserPromptBody}`
      : nflUserPromptBody;
  } else if (sportHint === "derby") {
    userPrompt = `You are answering a Kentucky Derby 2026 betting question.

${priorTakesSummary ? priorTakesSummary + "\n\n" : ""}Question:
${question}

STATIC DERBY FIELD DATA is appended to your system instructions — use it as the authoritative source for post positions, morning-line style odds, trainer/jockey, edges, and editorial verdicts.

Rules:
- Answer as a horse racing / Derby analyst using that appendix; cite horses by name and post when relevant.
- Do not invent runners or prices outside the appendix.
- Do not pivot to NBA, NFL, MLB, tennis, golf, or F1 unless the user explicitly asks.

Confidence guidance:
- Default confidence should be ${derivedConfidence}.`;
  } else if (sportHint === "worldcup" && (wcContext?.promptBlock || wcCrossGroupPrebuiltEarly)) {
    const wcTurnScopeBlock = buildWcTurnScopeBlock(routingQuestion, wcIntent);
    const entityBindingBlock = buildEntityBindingPromptBlock(wcRequiredEntities);
    const priceBindingBlock = buildPriceBindingPromptBlock(
      String(question || ""),
      wcRequiredEntities,
      wcIntent,
    );
    const wcMatchupBlock =
      wcIntent === WC_INTENT.MATCHUP
        ? buildWcMatchupIntentRules({ phase: wcContext?.phase || "GROUP_STAGE" })
        : "";
    const isWcRulesIntent = wcIntent === WC_INTENT.RULES;
    const isWcMatchupIntent = wcIntent === WC_INTENT.MATCHUP;
    const wcAdvancementMarketKind = classifyWcAdvancementMarket(String(question || ""));
    const isWcAdvancementMarketIntent =
      (wcIntent === WC_INTENT.ENTITY_PRICING &&
        isWcAdvancementMarketQuestion(String(question || ""))) ||
      (wcIntent === WC_INTENT.STRUCTURAL &&
        Boolean(wcAdvancementMarketKind) &&
        wcAdvancementMarketKind !== WC_ADVANCEMENT_MARKET.TOURNAMENT_WINNER);
    const isWcGroupWinnerIntent =
      wcAdvancementMarketKind === WC_ADVANCEMENT_MARKET.GROUP_WINNER;
    const isWcTournamentWinnerIntent =
      wcIntent === WC_INTENT.ENTITY_PRICING && isTournamentWinnerQuestion(routingQuestion);
    const isWcTopGoalscorersListIntent = wcIntent === WC_INTENT.TOP_GOALSCORERS_LIST;
    const isWcPredictionsRoundupIntent = wcIntent === WC_INTENT.PREDICTIONS_ROUNDUP;
    const isWcPlayerMarketIntentFlag =
      isWcPlayerMarketIntent(wcIntent) &&
      !isWcTopGoalscorersListIntent &&
      !isWcPredictionsRoundupIntent;
    const wcPlayerMarketResolved =
      isWcPlayerMarketIntent(wcIntent) || isWcTopGoalscorersListIntent
        ? resolveWcPlayerMarketResponse(String(question || ""), wcIntent, wcContext)
        : null;
    const wcPlayerMarketBlock =
      wcPlayerMarketResolved?.promptAppendix && !wcPlayerMarketResolved.forcePass
        ? `${wcPlayerMarketResolved.promptAppendix}\n\n`
        : "";
    const wcGroupLettersForPrompt = resolveWcGroupLettersForPrompt(routingQuestion, {
      wcIntent,
      mentionedTeams: wcRequiredEntities,
      topMispriceGroups: wcContext?.groupMispriceTopGroups || null,
    });
    const wcGroupCompositionBlock = wcGroupLettersForPrompt.length
      ? `${buildWcGroupBindingPromptBlocks(wcGroupLettersForPrompt)}\n\n`
      : "";
    const wcRoleLine = isWcRulesIntent
      ? "You are answering a factual 2026 FIFA World Cup rules question."
      : isWcMatchupIntent
        ? "You are answering a 2026 FIFA World Cup group/matchup advancement question."
        : isWcTournamentWinnerIntent
          ? "You are answering a 2026 FIFA World Cup tournament winner (outright) question."
        : isWcAdvancementMarketIntent
          ? "You are answering a 2026 FIFA World Cup knockout-reach / advancement-market question (NOT tournament winner outright)."
        : isWcTopGoalscorersListIntent
          ? "You are answering a 2026 FIFA World Cup top goalscorers list question (ranked players with odds)."
          : isWcPredictionsRoundupIntent
            ? "You are answering a 2026 FIFA World Cup predictions roundup (Winners, Dark horse, Breakout player, Top goalscorer — every labeled slot)."
            : isWcPlayerMarketIntentFlag
              ? "You are answering a 2026 FIFA World Cup player-market question (Golden Boot / top scorer / named player)."
              : "You are answering a 2026 FIFA World Cup betting question.";
    const wcIntentRules = isWcRulesIntent
      ? `- Answer with tournament rules only. Do NOT lead with a betting take or group-stage prediction.
- Lead sentence one with the direct answer about extra time, penalties, or the specific rule asked.
- No team advancement picks unless the user asked about a specific matchup.
- Do NOT reference prior chat turns, teams, or pricing/matchup questions — this turn is rules-only.`
      : isWcMatchupIntent
        ? `- Return JSON per OUTPUT CONTRACT: summary = balanced advancement read (150 words max); deep = full reasoning (no word limit).
- Sentence one must name BOTH required teams and their strength tags from VERIFIED CONTEXT.
- Use only teams, groups, fixtures, and results from WORLD CUP 2026 — VERIFIED CONTEXT above.
- Reference strength as Favorite / Contender / Longshot — never cite Elo or numeric power ratings.
- If CURRENT OUTRIGHT ODDS is missing or STALE, use cautious structural language — no overconfident winner picks.
- Do not invent scores, lineups, or odds not supported by the context block.
- Stay on World Cup 2026 (USA, Mexico, Canada hosts; June 11 — July 19, 2026).`
        : isWcTournamentWinnerIntent
          ? `- Return JSON per OUTPUT CONTRACT: summary = tournament favorites verdict (150 words max); deep = full reasoning (no word limit).
- Sentence one must name 2-4 tournament favorites from CURRENT OUTRIGHT ODDS — NOT a single group Game 1 unless the user asked that fixture this turn.
- Use winPct from BDL tournament sims when citing sims — NOT group advancement % (advancePct).
- Do NOT repeat Mexico vs South Africa or any prior matchup lean from this chat.
- Lean must pair the correct team with its price (favorites at negative odds; longshots at +300 or higher).
- If CURRENT OUTRIGHT ODDS is missing or STALE, use structural language — no overconfident winner picks.
- Stay on World Cup 2026 (USA, Mexico, Canada hosts; June 11 — July 19, 2026).`
        : isWcAdvancementMarketIntent
          ? `- Return JSON per OUTPUT CONTRACT: summary = fair-price read on the specific futures market asked (150 words max); deep = full reasoning (no word limit).
- Sentence one must answer the asked market — name the team and verdict (Pass / lean / fair).
${isWcGroupWinnerIntent ? `- GROUP WINNER: cite groupWinPct from TOURNAMENT SIMULATION — never winPct (tournament outright) or qfPct as the group-winner probability.
- Do NOT cite CURRENT OUTRIGHT ODDS (+1500+) as the group-winner price — use BDL win_group seed or omit +XXXX.` : `- **Summary sentence 2 (maps to structured \`line\`) — mandatory format:** "Pass at [American odds] — sim [X]% vs market ~[Y]%." Use BDL FUTURES SEED price for the asked market (e.g. R16 -130), NOT tournament winner outright. Example: "Pass at -130 — sim 15% vs market ~57%."`}
- Follow ADVANCEMENT MARKET BINDING and SIM STAT BINDING in VERIFIED CONTEXT — cite groupWinPct for group winner, r16Pct for Round of 16, advancePct only for group escape.
- Do NOT cite CURRENT OUTRIGHT ODDS (tournament winner) as the price for group winner, Round of 16, or group-advance markets.
- SportsLine / editorial R16 prices (e.g. USA Reach Round of 16 -115) are narrative corroboration only — label as editorial.
- Reference strength as Favorite / Contender / Longshot — never cite Elo or numeric power ratings.
- Stay on World Cup 2026 (USA, Mexico, Canada hosts; June 11 — July 19, 2026).`
        : isWcTopGoalscorersListIntent
          ? `- Return JSON per OUTPUT CONTRACT only (summary + deep keys).
- summary: numbered list of exactly five named players with American odds from GOLDEN BOOT in VERIFIED CONTEXT — not a single-player lean.
- deep max 120 words: brief context on gaps between #1–#5; do not repeat the full list verbatim.
- Do NOT paste the prior turn's one-line top-scorer answer — this turn is a ranked board.
- Cite only prices from PLAYER MARKETS — VERIFIED CONTEXT.
- Stay on World Cup 2026 (USA, Mexico, Canada hosts; June 11 — July 19, 2026).`
          : isWcPredictionsRoundupIntent
            ? `- Return JSON per OUTPUT CONTRACT only (summary + deep keys).
- User asked for MULTIPLE labeled predictions — answer every slot they listed (Winners, Dark horse, Breakout player, Top goalscorer).
- summary sentence 1 = tournament framing across the board (not a single Golden Boot thesis).
- summary sentence 2 = structural delta (sims %, paths, or market vs UR).
- deep must include labeled lines: "Winners:", "Dark horse:", "Breakout player:", "Top goalscorer:" — one complete sentence each.
- End deep with WATCH FOR and an explicit PLAY decision for the best single bet from the roundup.
- Do NOT collapse into a Golden Boot-only answer.
- Stay on World Cup 2026 (USA, Mexico, Canada hosts; June 11 — July 19, 2026).`
          : isWcPlayerMarketIntentFlag
            ? `- Return JSON per OUTPUT CONTRACT only (summary + deep keys).
- summary max 40 words: direct answer to the question — PLAYER name, price, PASS or lean. No thesis, no section headers.
- deep max 100 words: optional extra detail for Full breakdown only — do not repeat summary.
- Never answer with only a country/national team as the scorer.
- Cite only prices from PLAYER MARKETS — VERIFIED CONTEXT.
- Stay on World Cup 2026 (USA, Mexico, Canada hosts; June 11 — July 19, 2026).`
            : wcIntent === WC_INTENT.SCORE_PREDICTION
            ? `- Return JSON per OUTPUT CONTRACT: summary max 90 words.
- User wants SCORELINES (e.g. top 5 scores to consider) — list exactly five plausible final scores with winner orientation (e.g. "MEX 2-1 RSA", "1-1").
- Do NOT answer with Golden Boot, top scorer, or a single-player prop from earlier turns.
- Name the match or teams in scope when known from the question or REQUIRED ENTITIES.
- Stay on World Cup 2026 (USA, Mexico, Canada hosts; June 11 — July 19, 2026).`
          : isWcGroupSlateQuestion(routingQuestion)
            ? `- Return JSON per OUTPUT CONTRACT: summary max 60 words — sentence one names the group-stage pick (team + market).
- Answer the group/slate question only — not Golden Boot or a named player from earlier turns.
- Each group has exactly four teams: one Favorite, one Contender, two Longshots — use the GROUP composition block when present; never miscount longshots.
- When describing a group, name all four teams with correct strength tags.
- Cite team abbreviations and odds from CURRENT OUTRIGHT ODDS or FIXTURE MATCH ODDS when claiming value.
- Stay on World Cup 2026 (USA, Mexico, Canada hosts; June 11 — July 19, 2026).`
            : wcIntent === WC_INTENT.CONTINUATION
              ? `- Return JSON per OUTPUT CONTRACT: summary max 120 words — extend the prior thread the user referenced.
- Build on the last exchange; do not cold-start an unrelated thesis unless the user pivoted.
- Stay on World Cup 2026 (USA, Mexico, Canada hosts; June 11 — July 19, 2026).`
              : `- Return JSON per OUTPUT CONTRACT: summary = punchy verdict (150 words max); deep = full reasoning (no word limit).
- This is a general World Cup question — answer what was asked (no forced group pick or player-market template).
- Always answer the user's question directly in summary sentence one. State the take, name the team, give the verdict. Do not open with context or setup. The lead is the answer. Follow with 2-3 sentences of supporting reasoning only in summary.
- Use only teams, groups, fixtures, and results from WORLD CUP 2026 — VERIFIED CONTEXT above.
- Reference strength as Favorite / Contender / Longshot — never cite Elo or numeric power ratings.
- When claiming a team is "mispriced" you MUST cite the exact odds from the CURRENT OUTRIGHT ODDS block in VERIFIED CONTEXT (team abbreviation + price) and the block must not be marked STALE.
- If CURRENT OUTRIGHT ODDS is missing, marked STALE, or says no live odds are available, never use the word "mispriced". Use structural language instead (e.g. "Based on group strength...").
- For match 1X2 moneylines, cite only prices from FIXTURE MATCH ODDS when present and not marked STALE; otherwise use Elo win/draw/loss structure only.
- Only include data relevant to the current tournament phase and the specific question; do not bloat with irrelevant groups or matches.
- In knockout phases, follow KNOCKOUT STAGE RULES in VERIFIED CONTEXT — 90-minute moneylines do not settle advancement; ET/pens apply if level.
- For "can X still win the tournament?" use CITED TEAM PATH — if a team is eliminated, state that clearly.
- Do not invent scores, lineups, or odds not supported by the context block.
- Stay on World Cup 2026 (USA, Mexico, Canada hosts; June 11 — July 19, 2026).`;

    const wcPushBackBindingBlock = [
      wcRunnerUpFollowUpQuestion
        ? buildWcPushBackBindingBlock(routingQuestion, normalizedUrTakeHistoryForGate)
        : "",
      buildWcGroupValuePushBackBindingBlock(routingQuestion, normalizedUrTakeHistoryForGate),
    ]
      .filter(Boolean)
      .join("\n\n");

    const wcPushBackVoiceBlock =
      isConversationFollowUp && (wcPushBackBindingBlock || wcIntent === WC_INTENT.CONTINUATION)
        ? WC_PUSHBACK_VOICE_PROMPT
        : "";

    const wcHasMatchPlayerProps = hasMatchPlayerPropRows(wcContext?.playerMarketKv?.matchPlayerProps);
    const wcScriptPriceBlock = buildWcScriptPriceUserAppendix({
      question: routingQuestion,
      wcIntent,
      phase: wcContext?.phase,
      isParlay: detectParlayIntent(routingQuestion) || detectWcSgpComboIntent(routingQuestion),
      hasMatchPlayerProps: wcHasMatchPlayerProps,
    });
    const wcTeamOpenerBlock = buildWcTeamMarketOpenerPromptBlock({
      question: routingQuestion,
      wcIntent,
    });

    userPrompt = `${wcRoleLine}

${priorTakesSummary ? priorTakesSummary + "\n\n" : ""}${wcPushBackBindingBlock ? `${wcPushBackBindingBlock}\n\n` : ""}${wcPushBackVoiceBlock ? `${wcPushBackVoiceBlock}\n\n` : ""}${wcTurnScopeBlock ? `${wcTurnScopeBlock}\n\n` : ""}${entityBindingBlock ? `${entityBindingBlock}\n\n` : ""}${priceBindingBlock ? `${priceBindingBlock}\n\n` : ""}${wcMatchupBlock ? `${wcMatchupBlock}\n\n` : ""}${wcGroupCompositionBlock}${wcPlayerMarketBlock}${wcContext.promptBlock}

Question:
${question}

Confidence guidance:
- Default confidence should be ${derivedConfidence}.

Rules:
${wcIntentRules}${isWcRulesIntent ? "" : `\n\n${WC_CARD_CONTRACT_VOICE_PROMPT}`}${isWcPredictionsRoundupIntent ? `\n\n${WC_PREDICTIONS_ROUNDUP_PROMPT}` : ""}${wcScriptPriceBlock ? `\n\n${wcScriptPriceBlock}` : ""}${wcTeamOpenerBlock ? `\n\n${wcTeamOpenerBlock}` : ""}`;
  } else if (matchupContext) {
    // DATA FRESHNESS: this sport reads from live APIs — no staleness injection needed.
    // If you ever add hardcoded fallbacks, add dataFreshness to the payload.
    userPrompt = `You are answering a betting question about this matchup.

${priorTakesSummary ? priorTakesSummary + "\n\n" : ""}Question:
${question}

Matchup context:
${JSON.stringify(matchupContext || {}, null, 2)}

Confidence guidance:
- Default confidence should be ${derivedConfidence}.
- Only go above that if the input strongly justifies it.

${buildUrTakeSportTurnScopeRules(matchupContext?.league ? String(matchupContext.league).toLowerCase() : "generic")}

Rules:
- Stay within the matchup and its sport.
- Do not invent unrelated teams, players, or props.`;
  } else {
    // DATA FRESHNESS: this sport reads from live APIs — no staleness injection needed.
    // If you ever add hardcoded fallbacks, add dataFreshness to the payload.
    const continuationRule =
      shortMarketFollowUp && hasLiveTranscriptContext
        ? `
CONTINUATION RULE — SHORT LIVE FOLLOW-UP
- Recent transcript includes live/screenshot game context. Reuse that game context instead of cold-starting.
- Give a provisional conditional lean now (not a locked bet): "Lean X if number/scope condition holds."
- Ask exactly ONE compact clarifier for the decision-critical missing input (usually exact live number + full game vs 1H).
- Acknowledge uncertainty once, then move to analysis. Do not repeat cannot-assess phrasing and do not output long missing-input checklists.
- Do not fabricate an exact live total/line and do not imply certainty when price/scope is missing.
- If you reference arithmetic (pace math, current score totals, points needed, possession projections), show the exact calculation inline so users can verify it instantly. Format example: "Score: 78 + 72 = 150. Points needed: 219.5 - 150 = 69.5."
`
        : "";

    userPrompt = `You are answering a sports betting question.

${priorTakesSummary ? priorTakesSummary + "\n\n" : ""}Question:
${question}

Available context:
${JSON.stringify({
  sportHint,
  matchupContext: matchupContext || null,
  hasImage,
  shortMarketFollowUp,
  hasLiveTranscriptContext,
}, null, 2)}

Confidence guidance:
- Default confidence should be ${derivedConfidence}.
- Only go above that if the input strongly justifies it.

${buildUrTakeSportTurnScopeRules(sportHint)}

Rules:
- Stay within the sport most clearly implied by the question and the attached context.
- If the sport is ambiguous, answer conservatively and do not invent specifics — never refuse or redirect for sport-routing reasons.
- Do not make up games, players, or props that are not supported by the prompt.
${continuationRule}`;
  }

  const messages = buildMessagesForAnthropic({
    userPrompt,
    history: incomingHistory,
    intent,
    hasImage,
    image,
  });

  /** Single user-turn prompt body (embedded JSON contexts live here). Anthropic `messages` also contain prior turns when present. */
  const contextPayload = { userPrompt };
  const contextPayloadJson = JSON.stringify(contextPayload);
  const messagesJson = JSON.stringify(messages);
  const userPromptCharCount = userPrompt.length;

  const emptyContextEarly = await tryUrTakeEarlyPaths(buildEarlyPathsCtx(), {
    includeNbaShortcuts: false,
  });
  if (emptyContextEarly.handled) return;

  try {
    const factualQuestion = isSettledFactQuestion(question);
    const selectedTemperature = factualQuestion ? 0.2 : 0.45;

    const tokenBudget =
      draftTeamSimulationInject
        ? 2600
        : effectiveStructuredModeRequested
          ? 4200
          : outputJsonMode === "tier2_5_json"
            ? 4200
            : outputJsonMode === "tier2_live_json"
              ? 2200
              : outputJsonMode === "tier1_json"
                ? 700
                : outputJsonMode === "plain" &&
                    !isConversationFollowUp &&
                    Boolean(liveSignals?.isEffectivelyLive)
                  ? isPro
                    ? 700
                    : 500
                : isPro ? 1400 : 800;

    // Pro depth guidance only for plain-text full cards — never override JSON contracts,
    // follow-up brevity rules, or draft simulation routes.
    const shouldApplyProDepthAppendix =
      isPro &&
      outputJsonMode === "plain" &&
      !isConversationFollowUp &&
      !draftTeamSimulationInject;

    const proDepthAppendix = shouldApplyProDepthAppendix ? `

[PRO SESSION — DEPTH UNLOCKED]
You are responding to a Pro subscriber. Apply the following:
- Complete the full five-step framework without truncating the structural anchor or close. Do not compress reasoning to meet brevity targets.
- End every analysis card with an explicit verdict block. Use the format appropriate to odds availability:

  If odds ARE available:
  THE PLAY: [lean/fade/pass] · [High/Medium/Speculative] confidence · [one sharp sentence on why]

  If odds are NOT available (no live lines in context):
  THE PLAY: [lean/fade/pass] · [High/Medium/Speculative] confidence · [one sharp sentence on why] — when the line posts, watch for [specific player + specific stat threshold]

- If session history exists, open with one sentence that connects this query to the prior take before building the new card. Do not repeat full prior reasoning — reference it, then advance.
- If evidence is thin, say so plainly in the verdict block rather than omitting it. Thin context, capped confidence, honest close is better than a padded card.
- Never fabricate a line, spread, or total that is not present in the context payload. If odds are unavailable, the verdict close must be directional only — no invented numbers.
` : "";

    const systemPromptWithProAppendix = `${systemPromptForModel}${proDepthAppendix}`;

    if (sportHint === "nba" && nbaContext?.rosterGrounding) {
      console.log(
        "[ur-take] NBA rosterGroundingQuality:",
        nbaContext.rosterGrounding.rosterGroundingQuality ?? "absent",
      );
    }
    const nbaCtxJsonChars =
      sportHint === "nba" ? contextJsonForModel(nbaContextForModel ?? {}).length : null;
    console.log(
      `[ur-take] context: sport=${String(
        sportHint || "unknown",
      )} systemPromptChars=${systemPromptWithProAppendix.length} contextPayloadChars=${userPromptCharCount}${
        nbaCtxJsonChars != null ? ` nbaContextJsonChars=${nbaCtxJsonChars}` : ""
      }`,
    );

    const qaCoherenceContext =
      sportHint === "nba" &&
      nbaGroundingSnapshot &&
      nbaGroundingSnapshot.verifiedPlayerToTeam instanceof Map &&
      nbaGroundingSnapshot.verifiedPlayerToTeam.size > 0
        ? {
            allowedTeamAbbreviations: nbaMatchup
              ? nbaGroundingSnapshot.focusAllowedTeams || []
              : nbaGroundingSnapshot.slateTeamAbbrevs || [],
            knownPlayerToTeam: nbaGroundingSnapshot.verifiedPlayerToTeam,
          }
        : undefined;

    const nbaInventedShadow =
      sportHint === "nba" &&
      nbaMatchup &&
      nbaGroundingSnapshot &&
      Array.isArray(nbaGroundingSnapshot.focusAllowedTeams) &&
      nbaGroundingSnapshot.focusAllowedTeams.length === 2
        ? {
            allowlistLower: buildAllowlistLowerSetFromSnapshot(nbaGroundingSnapshot),
            matchupTeams: /** @type {[string, string]} */ ([
              String(nbaGroundingSnapshot.focusAllowedTeams[0] || "").toUpperCase(),
              String(nbaGroundingSnapshot.focusAllowedTeams[1] || "").toUpperCase(),
            ]),
          }
        : undefined;

    const tennisContextForQa =
      sportHint === "tennis" || sportHint === "tennis_wta_profile"
        ? buildTennisStructuralQaContext({ liveMatches, players })
        : undefined;

    const qaPostOptsBase = {
      sport: sportHint,
      question: String(question || ""),
      nbaContext: nbaContextForModel,
      mlbContext:
        sportHint === "mlb" && mlbContext && typeof mlbContext === "object" ? mlbContext : undefined,
      tennisContext: tennisContextForQa,
      golfContext:
        sportHint === "golf" && golfContextEffective && typeof golfContextEffective === "object"
          ? golfContextEffective
          : undefined,
      f1Context:
        sportHint === "f1" && f1Context && typeof f1Context === "object" ? f1Context : undefined,
      intent,
      liveMode: Boolean(liveSignals?.isEffectivelyLive),
      coherenceContext: qaCoherenceContext,
      nbaGroundingSnapshot: sportHint === "nba" ? nbaGroundingSnapshot : undefined,
      nbaInventedShadow,
    };

    let responseText = "";
    let responseDeep = null;
    let responseFormat = "plain";
    let responseStatusShift = null;
    let lastQaPost = null;
    let qaAttemptCount = 0;
    let qaFallbackApplied = false;
    /** Critical QA codes from the prior generation attempt (used to tailor NBA grounding repair suffix). */
    let prevQaCriticalCodes = [];

    let structuredResponse = null;
    let nbaFinalsStructuredParseFailed = false;
    /** Last non-empty Anthropic text for this QA attempt — used if post-process strips everything. */
    let lastNonEmptyRawModelText = "";
    let nbaGroundingRedirectUsed = false;
    let wcPlayerMarketPassUsed = false;
    let wcGroupSlatePassUsed = false;
    let wcFixtureMatchupPassUsed = false;
    let wcRunnerUpFollowUpPassUsed = false;
    let wcGroupValuePushBackPassUsed = false;
    /** World Cup relevance QA — declared outside QA loop for post-loop player-market repair. */
    let wcQaResult = null;

    if (
      sportHint === "worldcup" &&
      !wcRunnerUpFollowUpQuestion &&
      !isConversationFollowUp &&
      (isWcPlayerMarketIntent(wcIntent) || wcIntent === WC_INTENT.TOP_GOALSCORERS_LIST)
    ) {
      const wcPlayerResolved = resolveWcPlayerMarketResponse(
        String(question || ""),
        wcIntent,
        wcContext,
      );
      if (wcPlayerResolved.forcePass) {
        structuredResponse = wcPlayerResolved.structured;
        responseText = wcPlayerResolved.responseText;
        responseDeep = wcPlayerResolved.responseDeep;
        responseFormat = effectiveStructuredModeRequested ? "structured" : "plain";
        wcPlayerMarketPassUsed = true;
        wcRelevanceLog.playerMarketTier =
          wcPlayerResolved.playerMarketTier || wcRelevanceLog.playerMarketTier;
        console.log(
          JSON.stringify({
            event: "ur_take_wc_player_market_pass",
            sport: "worldcup",
            wcIntent,
            playerMarketTier: wcPlayerResolved.playerMarketTier,
            dataConfidence: wcContext?.dataConfidence || null,
          }),
        );
      }
    }

    if (sportHint === "worldcup" && wcRunnerUpFollowUpQuestion && !wcPlayerMarketPassUsed) {
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
          responseText = formatWcCompactDisplayText(prebuilt, prebuilt.lean);
          responseDeep = null;
          responseFormat = effectiveStructuredModeRequested ? "structured" : "plain";
          wcRunnerUpFollowUpPassUsed = true;
          console.log(
            JSON.stringify({
              event: "ur_take_wc_runner_up_follow_up_pass",
              sport: "worldcup",
              wcIntent,
              runnerUpGroupLetter: runnerUpGroup,
              pickAbbr: runnerUpTeamAbbr,
            }),
          );
        }
      }
    }

    if (
      sportHint === "worldcup" &&
      isConversationFollowUp &&
      !wcPlayerMarketPassUsed &&
      !wcRunnerUpFollowUpPassUsed &&
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
        responseText = formatWcCompactDisplayText(prebuilt, prebuilt.lean);
        responseDeep = null;
        responseFormat = effectiveStructuredModeRequested ? "structured" : "plain";
        wcGroupValuePushBackPassUsed = true;
        console.log(
          JSON.stringify({
            event: "ur_take_wc_group_value_pushback_pass",
            sport: "worldcup",
            wcIntent,
            groupLetter: prebuilt.groupLetter,
            reaffirmed: true,
          }),
        );
      }
    }

    if (
      sportHint === "worldcup" &&
      !wcRunnerUpFollowUpQuestion &&
      !isConversationFollowUp &&
      !wcPlayerMarketPassUsed &&
      !wcRunnerUpFollowUpPassUsed &&
      wcCrossGroupPrebuiltEarly
    ) {
      structuredResponse = wcCrossGroupPrebuiltEarly;
      responseText = formatWcCompactDisplayText(wcCrossGroupPrebuiltEarly, wcCrossGroupPrebuiltEarly.lean);
      responseDeep = null;
      responseFormat = effectiveStructuredModeRequested ? "structured" : "plain";
      wcGroupSlatePassUsed = true;
      console.log(
        JSON.stringify({
          event: "ur_take_wc_cross_group_value_pass",
          sport: "worldcup",
          wcIntent,
          groupLetter: wcCrossGroupPrebuiltEarly.groupLetter,
          pickAbbr: wcCrossGroupPrebuiltEarly.groupLetter,
          early: true,
        }),
      );
    } else if (
      sportHint === "worldcup" &&
      !wcRunnerUpFollowUpQuestion &&
      !isConversationFollowUp &&
      !wcPlayerMarketPassUsed &&
      shouldUseWcCrossGroupValuePrebuilt(routingQuestion, wcIntent)
    ) {
      const prebuiltInputs = await resolveWcCrossGroupPrebuiltInputs(Date.now()).catch(() => ({
        teamStats: wcContext?.tournamentSimResults?.teamStats,
        bdlFutures: wcContext?.bdlFuturesPayload,
      }));
      const prebuilt = buildWcCrossGroupValuePrebuiltStructured({
        teamStats: prebuiltInputs.teamStats || wcContext?.tournamentSimResults?.teamStats,
        bdlFutures: prebuiltInputs.bdlFutures || wcContext?.bdlFuturesPayload,
        question: routingQuestion,
        nowMs: prebuiltInputs.nowMs,
      });
      if (prebuilt) {
        structuredResponse = prebuilt;
        responseText = formatWcCompactDisplayText(prebuilt, prebuilt.lean);
        responseDeep = null;
        responseFormat = effectiveStructuredModeRequested ? "structured" : "plain";
        wcGroupSlatePassUsed = true;
        console.log(
          JSON.stringify({
            event: "ur_take_wc_cross_group_value_pass",
            sport: "worldcup",
            wcIntent,
            groupLetter: prebuilt.groupLetter,
            pickAbbr: prebuilt.groupLetter,
          }),
        );
      }
    }

    if (
      sportHint === "worldcup" &&
      !wcRunnerUpFollowUpQuestion &&
      !isConversationFollowUp &&
      !wcPlayerMarketPassUsed &&
      !wcGroupSlatePassUsed &&
      shouldUseWcGroupSlatePrebuilt(routingQuestion, wcIntent)
    ) {
      const prebuilt = buildWcGroupSlatePrebuiltStructured({
        groupLetter: "D",
        pickAbbr: "PAR",
        pickMarket: "to advance",
      });
      if (prebuilt) {
        structuredResponse = prebuilt;
        responseText = formatWcCompactDisplayText(prebuilt, prebuilt.lean);
        responseDeep = null;
        responseFormat = effectiveStructuredModeRequested ? "structured" : "plain";
        wcGroupSlatePassUsed = true;
        console.log(
          JSON.stringify({
            event: "ur_take_wc_group_slate_pass",
            sport: "worldcup",
            wcIntent,
            groupLetter: "D",
            pickAbbr: "PAR",
          }),
        );
      }
    }

    if (
      sportHint === "worldcup" &&
      !wcRunnerUpFollowUpQuestion &&
      !wcPlayerMarketPassUsed &&
      !wcGroupSlatePassUsed &&
      !wcRunnerUpFollowUpPassUsed &&
      (wcFixtureMatchupPrebuiltEarly ||
        wcFixtureAltFollowUpPrebuiltEarly ||
        (!isConversationFollowUp &&
          shouldUseWcFixtureMatchupPrebuilt(routingQuestion, wcIntent, {
            isConversationFollowUp,
            wcRunnerUpFollowUpQuestion,
            mentionedTeams: wcRelevanceLog.mentionedTeams,
            wcEventId: wcRelevanceLog.wcEventId,
            hasKvFixture: Boolean(wcContext?.matchDetails?.length),
          })) ||
        (isConversationFollowUp &&
          shouldUseWcFixtureMatchupAltFollowUpPrebuilt(routingQuestion, wcIntent, {
            isConversationFollowUp,
            wcRunnerUpFollowUpQuestion,
            mentionedTeams: wcRelevanceLog.mentionedTeams,
            wcEventId: wcRelevanceLog.wcEventId,
            hasKvFixture: Boolean(wcContext?.matchDetails?.length),
            history: normalizedUrTakeHistoryForGate,
          })))
    ) {
      const prebuilt =
        wcFixtureMatchupPrebuiltEarly ||
        wcFixtureAltFollowUpPrebuiltEarly ||
        (await buildWcFixtureMatchupPrebuiltFromInputs({
          question: String(question || ""),
          mentionedTeams: wcRelevanceLog.mentionedTeams,
          wcEventId: wcRelevanceLog.wcEventId,
          history: normalizedUrTakeHistoryForGate,
        }).catch(() => null));
      if (prebuilt) {
        structuredResponse = prebuilt;
        responseText = formatWcCompactDisplayText(prebuilt, prebuilt.lean);
        responseDeep = null;
        responseFormat = effectiveStructuredModeRequested ? "structured" : "plain";
        wcFixtureMatchupPassUsed = true;
        console.log(
          JSON.stringify({
            event: "ur_take_wc_fixture_matchup_pass",
            sport: "worldcup",
            wcIntent,
            home: prebuilt.fixtureHome,
            away: prebuilt.fixtureAway,
            early: Boolean(wcFixtureMatchupPrebuiltEarly || wcFixtureAltFollowUpPrebuiltEarly),
            altFollowUp: Boolean(wcFixtureAltFollowUpPrebuiltEarly),
          }),
        );
      }
    }

    if (
      structuredModeRequested &&
      sportHint === "nba" &&
      nbaContext &&
      nbaMatchup &&
      nbaMatchupPool
    ) {
      const redirectStructured = tryBuildNbaGroundingRedirectStructured({
        question: String(question || ""),
        nbaContext,
        nbaMatchup,
        nbaMatchupPool,
        nbaGroundingSnapshot,
        finalsMode: Boolean(nbaFinalsModeMeta?.finalsMode || nbaContext?.finalsMode),
      });
      if (redirectStructured) {
        structuredResponse = redirectStructured;
        nbaGroundingRedirectUsed = true;
        console.log(
          JSON.stringify({
            event: "ur_take_nba_grounding_redirect",
            sport: "nba",
            matchup: nbaMatchup?.label || null,
          }),
        );
      }
    }

    for (let qaAttempt = 0; qaAttempt < 2; qaAttempt++) {
      qaAttemptCount = qaAttempt + 1;
      const previousStructured = structuredResponse;
      if (
        !nbaGroundingRedirectUsed &&
        !wcPlayerMarketPassUsed &&
        !wcGroupSlatePassUsed &&
        !wcFixtureMatchupPassUsed &&
        !wcRunnerUpFollowUpPassUsed &&
        !wcGroupValuePushBackPassUsed
      ) {
        structuredResponse = null;
      }
      const broToneRepairSuffix =
        qaAttempt > 0 &&
        prevQaCriticalCodes.some((c) => String(c || "").startsWith("bro_tone_"))
          ? BRO_TONE_REGENERATION_SUFFIX
          : "";
      const universalStructuralRepairSuffix =
        qaAttempt > 0 &&
        !broToneRepairSuffix &&
        prevQaCriticalCodes.some((c) => String(c || "").startsWith("structural_"))
          ? UNIVERSAL_STRUCTURAL_REGENERATION_SUFFIX
          : "";
      const nbaStructuralRepairSuffix =
        sportHint === "nba" &&
        qaAttempt > 0 &&
        !broToneRepairSuffix &&
        !universalStructuralRepairSuffix &&
        prevQaCriticalCodes.some((c) => String(c || "").startsWith("nba_structural"))
          ? NBA_STRUCTURAL_REGENERATION_SUFFIX
          : "";
      const nbaGroundingRepairSuffix =
        sportHint === "nba" &&
        qaAttempt > 0 &&
        !nbaStructuralRepairSuffix &&
        prevQaCriticalCodes.some((c) => {
          const s = String(c || "");
          return s.startsWith("nba_grounding") || s === "nba_unverified_out_claim";
        })
          ? NBA_GROUNDING_REGENERATION_SUFFIX
          : "";
      const wcQaRepairSuffix =
        sportHint === "worldcup" && qaAttempt > 0
          ? `${WC_QA_REGENERATION_SUFFIX}${
              prevQaCriticalCodes.includes("wc_player_question_team_lead")
                ? WC_PLAYER_MARKET_QA_SUFFIX
                : ""
            }${
              prevQaCriticalCodes.includes("wc_group_math_mismatch")
                ? WC_GROUP_MATH_QA_SUFFIX
                : ""
            }${
              prevQaCriticalCodes.includes("wc_group_roster_mismatch")
                ? WC_GROUP_ROSTER_QA_SUFFIX
                : ""
            }${
              prevQaCriticalCodes.includes("wc_group_winner_outright_bleed")
                ? WC_GROUP_WINNER_QA_SUFFIX
                : ""
            }${
              prevQaCriticalCodes.includes("wc_predictions_roundup_incomplete")
                ? WC_PREDICTIONS_ROUNDUP_QA_SUFFIX
                : ""
            }${
              prevQaCriticalCodes.some((c) =>
                ["wc_invented_xg_claim", "wc_invented_possession_claim"].includes(c),
              )
                ? WC_GROUNDING_REGEN_SUFFIX
                : ""
            }${
              prevQaCriticalCodes.includes("wc_roundup_cross_market_bleed")
                ? WC_ROUNDUP_CROSS_MARKET_BLEED_QA_SUFFIX
                : ""
            }${
              prevQaCriticalCodes.includes("wc_roundup_scorer_lean_contradiction")
                ? WC_ROUNDUP_SCORER_LEAN_CONTRADICTION_QA_SUFFIX
                : ""
            }${
              prevQaCriticalCodes.includes("wc_roundup_unnamed_market_odds")
                ? WC_ROUNDUP_UNNAMED_MARKET_ODDS_QA_SUFFIX
                : ""
            }${
              prevQaCriticalCodes.includes("wc_missing_sim_attribution")
                ? WC_NEEDS_ATTRIBUTION_QA_SUFFIX
                : ""
            }${
              prevQaCriticalCodes.includes("wc_dedup_watch_for")
                ? WC_NEEDS_DEDUP_QA_SUFFIX
                : ""
            }${
              prevQaCriticalCodes.includes("wc_missing_comparative_proof")
                ? WC_NEEDS_COMPARATIVE_QA_SUFFIX
                : ""
            }${
              prevQaCriticalCodes.includes("wc_card_face_missing_numeric_why")
                ? WC_NEEDS_NUMERIC_WHY_QA_SUFFIX
                : ""
            }${
              prevQaCriticalCodes.includes("wc_advancement_lean_direction_mismatch")
                ? WC_NEEDS_LEAN_DIRECTION_QA_SUFFIX
                : ""
            }${
              prevQaCriticalCodes.includes("wc_pushback_robotic_concession")
                ? WC_PUSHBACK_VOICE_QA_SUFFIX
                : ""
            }${
              prevQaCriticalCodes.includes("wc_matchup_pass_only_no_alt")
                ? WC_MATCH_PASS_ONLY_QA_SUFFIX
                : ""
            }${
              prevQaCriticalCodes.includes("wc_matchup_missing_winner_line")
                ? WC_MATCH_MISSING_WINNER_QA_SUFFIX
                : ""
            }${
              prevQaCriticalCodes.includes("wc_matchup_alt_followup_ml_headline")
                ? WC_MATCH_ALT_FOLLOWUP_QA_SUFFIX
                : ""
            }${
              prevQaCriticalCodes.includes("wc_player_not_in_squad") ||
              prevQaCriticalCodes.includes("wc_player_role_mislabel")
                ? WC_PLAYER_MARKET_QA_SUFFIX
                : ""
            }`
          : "";
      const nbaPredictionsRoundupRepairSuffix =
        sportHint === "nba" &&
        qaAttempt > 0 &&
        prevQaCriticalCodes.some((c) =>
          [
            "nba_predictions_roundup_incomplete",
            "nba_roundup_series_championship_bleed",
            "nba_roundup_unnamed_market_odds",
            "nba_invented_xg_claim",
          ].includes(c),
        )
          ? NBA_PREDICTIONS_ROUNDUP_QA_SUFFIX
          : "";
      const nbaFinalsStructuredRepairSuffix =
        sportHint === "nba" &&
        nbaFinalsModeMeta?.finalsMode &&
        qaAttempt > 0 &&
        prevQaCriticalCodes.includes("nba_finals_structured_invalid")
          ? NBA_FINALS_STRUCTURED_REGENERATION_SUFFIX
          : "";
      if (nbaGroundingRedirectUsed && structuredResponse) {
        responseText = formatStructuredResponseAsUrTakeProse(structuredResponse);
        responseDeep = null;
        responseFormat = "plain";
        const qaOptsRedirect = {
          ...qaPostOptsBase,
          structuredLean: String(structuredResponse.lean || ""),
        };
        lastQaPost = runUnderReviewPostProcess(responseText, qaOptsRedirect);
        responseText = lastQaPost.text;
        if (structuredResponse?.lean) {
          structuredResponse.lean = sanitizeLeanBroTone(structuredResponse.lean);
        }
        prevQaCriticalCodes = lastQaPost.qa.criticalRegenerationCodes || [];
        break;
      }

      if (
        (wcPlayerMarketPassUsed ||
          wcGroupSlatePassUsed ||
          wcFixtureMatchupPassUsed ||
          wcRunnerUpFollowUpPassUsed ||
          wcGroupValuePushBackPassUsed) &&
        structuredResponse
      ) {
        responseText =
          responseText || formatStructuredResponseAsUrTakeProse(structuredResponse);
        responseDeep = null;
        responseFormat = effectiveStructuredModeRequested ? "structured" : "plain";
        lastQaPost = runUnderReviewPostProcess(responseText, {
          ...qaPostOptsBase,
          structuredLean: String(structuredResponse.lean || ""),
        });
        responseText = lastQaPost.text;
        const wcPassQa = runWcUrTakeQA({
          responseText,
          structured: resolveWcQaStructured({
            question: String(question || ""),
            wcIntent,
            summary: responseText,
            deep: responseDeep,
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
        wcRelevanceLog.qaEntityMatch = wcPassQa.qaEntityMatch;
        wcRelevanceLog.qaIntentMatch = wcPassQa.qaIntentMatch;
        wcRelevanceLog.qaPlayerMatch = wcPassQa.qaPlayerMatch;
        break;
      }

      let systemForAttempt =
        qaAttempt === 0
          ? systemPromptWithProAppendix
          : `${systemPromptWithProAppendix}${QA_REGENERATION_SYSTEM_SUFFIX}${broToneRepairSuffix}${universalStructuralRepairSuffix}${nbaStructuralRepairSuffix}${nbaGroundingRepairSuffix}${wcQaRepairSuffix}${nbaPredictionsRoundupRepairSuffix}${nbaFinalsStructuredRepairSuffix}`;
      if (effectiveStructuredModeRequested) {
        systemForAttempt += getStructuredURTakePrompt();
        if (isConversationFollowUp) {
          systemForAttempt += `

[FOLLOW-UP + STRUCTURED — OUTPUT CHANNEL]
Structured JSON mode overrides the follow-up "3–5 sentences / no headers" prose rules.
Respond with ONLY the JSON object from STRUCTURED RESPONSE MODE. Answer the follow-up inside whyNow, edge, and analysis fields (keep each field tight; all required keys must be present).
- whyNow: sim% vs market% delta OR plain statement that live odds are missing — never roster-only ("Group X is four teams…").
- Do NOT repeat the prior card headline; answer only the new push-back question.
`;
        }
      }
      const temperatureForAttempt =
        qaAttempt === 0 ? selectedTemperature : Math.min(selectedTemperature, 0.28);

      const systemPromptChars = systemForAttempt.length;
      const contextPayloadChars = contextPayloadJson.length;
      const messagesChars = messagesJson.length;
      /** Sum requested for audits; note userPrompt is duplicated inside `messages`, so this overstates unique bytes. */
      const totalChars = systemPromptChars + contextPayloadChars + messagesChars;
      /** Closer to Anthropic request body text volume: system + messages only (user prompt counted once). */
      const anthropicWireApproxChars = systemPromptChars + messagesChars;
      console.log("[UR_TAKE_REQUEST_SIZE]", {
        qaAttempt: qaAttempt + 1,
        sportHint: String(sportHint || "unknown"),
        intent: String(intent || ""),
        isConversationFollowUp,
        systemPromptChars,
        contextPayloadChars,
        messagesChars,
        totalChars,
        anthropicWireApproxChars,
        estimatedTokens: Math.ceil(totalChars / 4),
        estimatedTokensAnthropicWire: Math.ceil(anthropicWireApproxChars / 4),
        userPromptChars: userPromptCharCount,
        ...(nbaCtxJsonChars != null ? { nbaContextJsonChars: nbaCtxJsonChars } : {}),
      });

      if (sportHint === "nba") {
        logNbaUrTakeAuditIfDev({
          phase: "pre_model",
          qaAttempt: qaAttempt + 1,
          sportHint: String(sportHint || "unknown"),
          matchup: nbaMatchup
            ? {
                awayAbbr: nbaMatchup.awayAbbr,
                homeAbbr: nbaMatchup.homeAbbr,
                label: nbaMatchup.label,
              }
            : null,
          injuryRowsForModel: (nbaContextForModel?.injuries || []).slice(0, 80).map((r) => ({
            player: r?.player,
            team: r?.team,
            status: r?.status,
          })),
          injuryRowCount: Array.isArray(nbaContextForModel?.injuries) ? nbaContextForModel.injuries.length : 0,
          playerStatsCount: Array.isArray(nbaContextForModel?.playerStats) ? nbaContextForModel.playerStats.length : 0,
          propLinesCount: Array.isArray(nbaContextForModel?.propLines) ? nbaContextForModel.propLines.length : 0,
          questionCharCount: String(question || "").length,
        });
      }

      const anthropicT0 = Date.now();
      const result = await callAnthropic({
        apiKey: ANTHROPIC_API_KEY,
        model: ANTHROPIC_MODEL,
        system: systemForAttempt,
        messages,
        temperature: temperatureForAttempt,
        max_tokens: tokenBudget,
      });
      anthropicMs += Date.now() - anthropicT0;

      if (!result.ok) {
        if (result.rateLimitedExhausted) {
          const exhaustedFallbackReason = "upstream_rate_limit";
          console.error("[ur-take] upstream retries exhausted", {
            requestId,
            providerRequestId: result.requestId,
            status: result.status,
            upstreamError: result.data?.error ?? null,
            data: result.data,
            fallbackReason: exhaustedFallbackReason,
          });
          return res.status(503).json({
            error: "Couldn't complete that read. Try again.",
            code: "upstream_unavailable",
            fallbackReason: exhaustedFallbackReason,
            requestId,
            providerRequestId: result.requestId,
          });
        }

        console.error("Anthropic error:", {
          requestId,
          providerRequestId: result.requestId,
          status: result.status,
          model: ANTHROPIC_MODEL,
          data: result.data,
        });

        const upstreamType = result.data?.error?.type || "anthropic_error";
        console.error("[ur-take] upstream Anthropic error:", {
          requestId,
          providerRequestId: result.requestId,
          status: result.status,
          type: upstreamType,
          message: result.data?.error?.message || result.data?.message || null,
        });

        let rawSlice = null;
        try {
          rawSlice = JSON.stringify(result.data).slice(0, 1200);
        } catch {
          rawSlice = String(result.data).slice(0, 1200);
        }
        return feedSnagResponse(sportHint, "provider_non_ok", {
          questionLength: String(question || "").length,
          providerStatus: result.status,
          providerErrorName: upstreamType,
          providerErrorMessage:
            result.data?.error?.message || result.data?.message || `HTTP ${result.status}`,
          rawModelText: rawSlice,
          extra: { providerRequestId: result.requestId },
        });
      }

      // If structured mode was requested, extract and validate JSON
      if (effectiveStructuredModeRequested) {
        try {
          const responseTextRaw = extractAnthropicText(result.data).trim();
          const parsedObj =
            tryParseJsonObject(responseTextRaw) ||
            extractBalancedJsonObject(responseTextRaw);
          if (
            !parsedObj ||
            typeof parsedObj !== "object" ||
            Array.isArray(parsedObj)
          ) {
            throw new Error("structured_response_not_json_object");
          }
          structuredResponse = normalizeStructuredUrTakeResponse(parsedObj, sportHint);
          structuredResponse = repairStructuredForDelivery(structuredResponse, sportHint);
          if (sportHint === "worldcup" && structuredResponse) {
            structuredResponse = normalizeWcStructuredForDelivery(
              structuredResponse,
              wcIntent,
              String(question || ""),
              wcRequiredEntities,
            );
            if (isWcPlayerMarketIntent(wcIntent) && structuredResponse) {
              structuredResponse.playerMarketTier =
                wcRelevanceLog.playerMarketTier || wcContext?.playerMarketTier || null;
            }
            if (wcIntent === WC_INTENT.ENTITY_PRICING) {
              const sessionPrices = extractSessionAmericanOdds(incomingHistory);
              structuredResponse = stripWcStructuredSessionPrices(
                structuredResponse,
                String(question || ""),
                sessionPrices,
              );
            }
          }
          if (structuredResponse?.lean) {
            structuredResponse.lean = sanitizeLeanBroTone(structuredResponse.lean);
          }
          if (sportHint === "nba" && nbaContext) {
            structuredResponse = applyNbaPropRecentFormContradiction(structuredResponse, {
              question,
              nbaContext,
            });
          }

          // Validate
          const validation = validateStructuredURTakeResponse(structuredResponse);
          logLeanContractIfMissing(structuredResponse);
          if (!validation.valid) {
            console.error("[STRUCTURED_UR_TAKE_VALIDATION_ERROR]", {
              requestId,
              errors: validation.errors,
            });
            logUrTakeApiFallback({
              requestId,
              fallbackReason: "response_shape_validation_failed",
              sport: sportHint || "unknown",
              validationErrors: validation.errors,
              rawModelText: String(responseTextRaw || "").slice(0, 4000),
              questionLength: String(question || "").length,
              structuredKeys:
                structuredResponse && typeof structuredResponse === "object"
                  ? Object.keys(structuredResponse)
                  : null,
            });

            try {
              globalThis.Sentry?.captureException(new Error("Structured UR Take validation failed"), {
                tags: { phase: "structured_response_validation", sport: sportHint },
                extra: { validationErrors: validation.errors },
                level: "error",
              });
            } catch (e) {
              // Sentry error, skip
            }

            // Invalid structured response — fall back to prose for this attempt (QA may retry)
            structuredResponse = null;
          }
        } catch (parseError) {
          console.error("[STRUCTURED_UR_TAKE_PARSE_ERROR]", {
            requestId,
            error: parseError.message,
            responsePreview: extractAnthropicText(result.data).slice(0, 200),
          });
          logUrTakeApiFallback({
            requestId,
            fallbackReason: "model_parse_failed",
            sport: sportHint || "unknown",
            parseErrorMessage: parseError?.message,
            rawModelText: extractAnthropicText(result.data).slice(0, 4000),
            questionLength: String(question || "").length,
          });

          try {
            globalThis.Sentry?.captureException(parseError, {
              tags: { phase: "structured_response_parse", sport: sportHint },
              extra: {
                responsePreview: extractAnthropicText(result.data).slice(0, 500),
              },
              level: "error",
            });
          } catch (e) {
            // Sentry error, skip
          }

          structuredResponse = null;
        }
      }

      if (effectiveStructuredModeRequested && !structuredResponse && previousStructured) {
        structuredResponse = previousStructured;
      }

      let text = stripBrokenQuoteFragments(extractAnthropicText(result.data));

      if (
        effectiveStructuredModeRequested &&
        !structuredResponse &&
        sportHint === "nba" &&
        nbaContext &&
        nbaMatchup &&
        nbaMatchupPool &&
        isNbaGroundingProseRefusal(text)
      ) {
        const proseRedirect = tryBuildNbaGroundingRedirectStructured({
          question: String(question || ""),
          nbaContext,
          nbaMatchup,
          nbaMatchupPool,
          nbaGroundingSnapshot,
          finalsMode: Boolean(nbaFinalsModeMeta?.finalsMode || nbaContext?.finalsMode),
        });
        if (proseRedirect) {
          structuredResponse = proseRedirect;
          text = formatStructuredResponseAsUrTakeProse(proseRedirect);
          console.log(
            JSON.stringify({
              event: "ur_take_nba_grounding_redirect",
              sport: "nba",
              source: "prose_refusal_interceptor",
              matchup: nbaMatchup?.label || null,
            }),
          );
        }
      }

      if (text && String(text).trim()) {
        lastNonEmptyRawModelText = String(text).trim();
      }

      if (!text) {
        let rawSlice = null;
        try {
          rawSlice = JSON.stringify(result.data).slice(0, 1200);
        } catch {
          rawSlice = String(result?.data).slice(0, 1200);
        }
        const blockTypes = Array.isArray(result.data?.content)
          ? result.data.content.map((b) => b?.type).filter(Boolean)
          : [];
        return feedSnagResponse(sportHint, "model_empty_text", {
          questionLength: String(question || "").length,
          providerStatus: result.status,
          providerErrorName: result.data?.stop_reason || null,
          rawModelText: rawSlice,
          extra: { contentBlockTypes: blockTypes },
        });
      }

      responseText = text;
      responseDeep = null;
      responseFormat = "plain";
      responseStatusShift = null;
      if (structuredResponse && typeof structuredResponse === "object") {
        if (isNbaFinalsStructured(structuredResponse)) {
          responseText = formatNbaFinalsStructuredDisplayText(structuredResponse);
          responseDeep = null;
          responseFormat = "nba_finals_json";
        } else if (sportHint === "worldcup" && wcIntent === WC_INTENT.RULES) {
          structuredResponse = null;
        } else if (sportHint === "worldcup") {
          responseText = formatWcCompactDisplayText(structuredResponse, text);
          responseDeep = null;
          responseFormat = "plain";
        } else {
          const formatted = formatStructuredResponseAsUrTakeProse(structuredResponse);
          responseText = formatted.trim() ? formatted : text;
          responseDeep = null;
          responseFormat = "plain";
        }
      } else if (outputJsonMode !== "plain") {
        const parsed = tryParseJsonObject(text) || tryExtractSummaryDeepFromLooseText(text);
        if (parsed && typeof parsed.summary === "string" && parsed.summary.trim()) {
          const normalized = normalizeSummaryDeepPayload(parsed.summary, parsed.deep);
          responseText = normalized.summary;
          responseDeep = normalized.deep;
          if (typeof parsed.statusShift === "string" && parsed.statusShift.trim()) {
            responseStatusShift = parsed.statusShift.trim();
          }
          responseFormat = outputJsonMode;
        } else if (sportHint === "worldcup" && wcIntent === WC_INTENT.RULES) {
          const coerced = coerceWcRulesModelText(text, null);
          responseText = coerced.text;
          responseDeep = coerced.deep;
          responseFormat = outputJsonMode;
        } else if (outputJsonMode === "nba_finals_json") {
          const parsedFinals = tryParseJsonObject(text);
          const fields = normalizeNbaFinalsStructuredFields(parsedFinals);
          const finalsValidation = validateNbaFinalsStructuredResponse(fields);
          if (finalsValidation.valid && fields) {
            structuredResponse = buildNbaFinalsStructuredForDelivery(
              fields,
              nbaFinalsModeMeta?.seriesState,
              String(question || ""),
            );
            responseText = formatNbaFinalsStructuredDisplayText(structuredResponse);
            responseDeep = null;
            responseFormat = "nba_finals_json";
            nbaFinalsStructuredParseFailed = false;
          } else {
            nbaFinalsStructuredParseFailed = true;
            console.error("[NBA_FINALS_STRUCTURED_VALIDATION]", {
              requestId,
              errors: finalsValidation.errors,
              preview: String(text || "").slice(0, 400),
            });
          }
        } else if (outputJsonMode === "tier2_5_json") {
          const normalized = normalizeSummaryDeepPayload(text, null);
          responseText = normalized.summary || text;
          responseDeep = normalized.deep;
        }
      } else if (sportHint === "worldcup" && wcIntent === WC_INTENT.RULES) {
        const coerced = coerceWcRulesModelText(text, null);
        responseText = coerced.text;
        responseDeep = coerced.deep;
      }

      if (sportHint === "nba") {
        responseText = stripNbaLeadInDisclosure(responseText);
        if (responseDeep) responseDeep = stripNbaLeadInDisclosure(responseDeep);
        responseText = stripNbaInternalControlLabels(responseText);
        if (responseDeep) responseDeep = stripNbaInternalControlLabels(responseDeep);
        if (isNbaNoMarketUpcomingSlate(nbaContext) && hasNbaNoMarketHardFail(responseText)) {
          responseText = buildNbaNoMarketHardFallback(question, nbaContext);
          responseDeep = null;
          responseFormat = "plain";
          nbaFallbackOrRepairUsed = true;
        }
        if (nbaInvalidation.requiresStatusAcknowledgement && !responseStatusShift && nbaStatusShiftLine) {
          responseStatusShift = nbaStatusShiftLine;
        }
        if (nbaDecisionMode === "conditional_wait" && !/\b(wait|contingen|status|confirm)\b/i.test(responseText)) {
          responseText = `Status is unresolved. Wait for final availability before locking a prop.\n\n${responseText}`;
        }
        if (
          nbaMatchupGroundingApplied &&
          nbaOffMatchupPromptAcknowledgement &&
          !responseText.includes(nbaOffMatchupPromptAcknowledgement)
        ) {
          responseText = `${nbaOffMatchupPromptAcknowledgement}\n\n${responseText}`;
        }
        if (nbaMatchup && nbaMatchupPool && nbaMatchupPool.allowedTeams.length === 2) {
          nbaPostValidationChecked = true;
          const allowedTeamSet = new Set(
            nbaMatchupPool.allowedTeams.map((t) => String(t || "").toUpperCase()),
          );
          const knownMap = nbaMatchupPool.knownPlayerToTeam;
          const mentionsSummary = extractMentionedPlayersFromOutput(responseText, knownMap);
          const mentionsDeep = extractMentionedPlayersFromOutput(responseDeep || "", knownMap);
          const invalidSummary = validatePlayersAgainstMatchup(
            mentionsSummary,
            allowedTeamSet,
            knownMap,
          );
          const invalidDeep = validatePlayersAgainstMatchup(
            mentionsDeep,
            allowedTeamSet,
            knownMap,
          );
          const invalidAll = [...invalidSummary, ...invalidDeep].filter(
            (v, i, arr) =>
              arr.findIndex(
                (x) => x.player.toLowerCase() === v.player.toLowerCase() && x.team === v.team,
              ) === i,
          );
          if (invalidAll.length > 0) {
            nbaPostValidationTriggered = true;
            nbaFallbackOrRepairUsed = true;
            const firstInvalid = invalidAll[0];
            const invalidKey = normalizePlayerNameKey(firstInvalid?.player);
            const redirectStructured =
              structuredModeRequested &&
              nbaMatchupPool &&
              invalidKey
                ? tryBuildNbaGroundingRedirectStructured({
                    question: String(question || ""),
                    nbaContext,
                    nbaMatchup,
                    nbaMatchupPool,
                    nbaGroundingSnapshot,
                    finalsMode: Boolean(nbaFinalsModeMeta?.finalsMode || nbaContext?.finalsMode),
                    forcedOffPlayer: {
                      playerKey: invalidKey,
                      teamAbbr: String(firstInvalid?.team || "").toUpperCase(),
                      reason: "off_matchup",
                    },
                  })
                : null;
            if (redirectStructured) {
              structuredResponse = redirectStructured;
              responseText = formatStructuredResponseAsUrTakeProse(redirectStructured);
              console.log(
                JSON.stringify({
                  event: "ur_take_nba_grounding_redirect",
                  sport: "nba",
                  source: "post_validation",
                  invalidPlayers: invalidAll.slice(0, 3),
                }),
              );
            } else {
              responseText = repairOrRegenerateInvalidMatchupOutput({
                matchup: nbaMatchup,
                pool: nbaMatchupPool,
                invalidPlayers: invalidAll,
              });
            }
            responseDeep = null;
            responseFormat = "plain";
            responseStatusShift = null;
          }
        }
      }

      responseText = stripBannedDataAvailabilityOpener(responseText);
      if (responseDeep) responseDeep = stripBannedDataAvailabilityOpener(responseDeep);
      responseText = stripBannedPerformanceTrackerLines(responseText);
      if (responseDeep) responseDeep = stripBannedPerformanceTrackerLines(responseDeep);

      const qaOptsThisAttempt = {
        ...qaPostOptsBase,
        structuredLean:
          structuredResponse && typeof structuredResponse === "object"
            ? String(structuredResponse.lean || "")
            : undefined,
      };
      lastQaPost = runUnderReviewPostProcess(responseText, qaOptsThisAttempt);
      responseText = lastQaPost.text;
      if (structuredResponse?.lean) {
        structuredResponse.lean = sanitizeLeanBroTone(structuredResponse.lean);
      }

      wcQaResult = null;
      let nbaPredictionsRoundupQaResult = null;
      if (sportHint === "worldcup") {
        wcQaResult = runWcUrTakeQA({
          responseText,
          structured: resolveWcQaStructured({
            question: String(question || ""),
            wcIntent,
            summary: responseText,
            deep: responseDeep,
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
        wcRelevanceLog.qaEntityMatch = wcQaResult.qaEntityMatch;
        wcRelevanceLog.qaIntentMatch = wcQaResult.qaIntentMatch;
        wcRelevanceLog.qaPlayerMatch = wcQaResult.qaPlayerMatch;
        if (!wcQaResult.passed) {
          console.log(
            JSON.stringify({
              event: "ur_take_wc_relevance_qa",
              sport: "worldcup",
              wcIntent,
              issueCodes: wcQaResult.issueCodes,
              qaEntityMatch: wcQaResult.qaEntityMatch,
              qaIntentMatch: wcQaResult.qaIntentMatch,
              qaPlayerMatch: wcQaResult.qaPlayerMatch,
              playerPropDetected: wcRelevanceLog.playerPropDetected,
              regenerationAttempt: qaAttempt,
              headlinePreview: wcQaResult.headlinePreview,
            }),
          );
        }
        if (isConversationFollowUp) {
          warnWcThinFollowUpWhy({
            whyNow: structuredResponse?.whyNow || responseText,
            question: String(question || ""),
            isFollowUp: true,
          });
        }
      }

      if (sportHint === "nba" && nbaIntentForHandler === NBA_INTENT.PREDICTIONS_ROUNDUP) {
        const roundupBody = [responseText, responseDeep].filter(Boolean).join("\n");
        nbaPredictionsRoundupQaResult = runNbaPredictionsRoundupQA({
          responseText: roundupBody,
          question: String(question || ""),
          nbaIntent: nbaIntentForHandler,
          structured: structuredResponse,
        });
        if (!nbaPredictionsRoundupQaResult.passed) {
          console.log(
            JSON.stringify({
              event: "ur_take_nba_predictions_roundup_qa",
              sport: "nba",
              nbaIntent: nbaIntentForHandler,
              issueCodes: nbaPredictionsRoundupQaResult.issueCodes,
              regenerationAttempt: qaAttempt,
            }),
          );
        }
      }

      const groundingEvents = lastQaPost.qa.groundingEvents || [];
      if (sportHint === "nba" && groundingEvents.length > 0) {
        console.log(
          JSON.stringify({
            event: "ur_take_nba_grounding_qa",
            sport: "nba",
            ruleCodes: [...new Set(groundingEvents.map((e) => e.ruleCode))],
            failures: groundingEvents,
            regenerationAttempted: qaAttempt > 0,
          }),
        );
      }
      prevQaCriticalCodes = lastQaPost.qa.criticalRegenerationCodes || [];
      if (sportHint === "nba") {
        logNbaUrTakeAuditIfDev({
          phase: "post_qa",
          qaAttempt: qaAttempt + 1,
          sportHint: "nba",
          qaCritical: prevQaCriticalCodes,
          groundingEvents: (lastQaPost.qa.groundingEvents || []).slice(0, 20),
          answerPreview: String(responseText || "").slice(0, 4000),
          answerLength: String(responseText || "").length,
        });
      }
      console.log(
        JSON.stringify({
          ...lastQaPost.qa.metricsLine,
          regenerationAttempt: qaAttempt,
          qaRegenerated: qaAttempt > 0,
        }),
      );

      if (responseDeep) {
        const deepPost = runUnderReviewPostProcess(responseDeep, {
          ...qaPostOptsBase,
          nbaInventedShadow: undefined,
        });
        responseDeep = deepPost.text;
      }

      if (!responseText || responseText.trim().length < 50) {
        responseText = responseDeep || responseText;
      }

      if (sportHint === "worldcup" && wcIntent === WC_INTENT.RULES) {
        const bleedForbidden = [...wcForbiddenEntities, ...wcRequiredEntities];
        const finalized = finalizeWcRulesDelivery({
          responseText,
          responseDeep,
          question: String(question || ""),
          bleedForbidden,
          structuredResponse,
        });
        responseText = finalized.responseText;
        responseDeep = finalized.responseDeep;
        structuredResponse = finalized.structuredResponse;
      }

      const nbaFinalsNeedsRegen =
        sportHint === "nba" &&
        nbaFinalsModeMeta?.finalsMode &&
        nbaFinalsStructuredParseFailed &&
        qaAttempt < 1;

      if (
        (!qaRequiresRegeneration(lastQaPost.qa) &&
          !wcQaRequiresRegeneration(wcQaResult) &&
          !nbaPredictionsRoundupQaRequiresRegeneration(nbaPredictionsRoundupQaResult) &&
          !nbaFinalsNeedsRegen) ||
        qaAttempt >= 1
      ) {
        break;
      }
      if (wcQaRequiresRegeneration(wcQaResult)) {
        prevQaCriticalCodes = [...prevQaCriticalCodes, ...(wcQaResult?.issueCodes || [])];
      }
      if (nbaPredictionsRoundupQaRequiresRegeneration(nbaPredictionsRoundupQaResult)) {
        prevQaCriticalCodes = [
          ...prevQaCriticalCodes,
          ...(nbaPredictionsRoundupQaResult?.issueCodes || []),
        ];
      }
      if (nbaFinalsNeedsRegen) {
        prevQaCriticalCodes = [...prevQaCriticalCodes, "nba_finals_structured_invalid"];
      }
    }

    if (lastQaPost && qaRequiresRegeneration(lastQaPost.qa)) {
      const fb = runUnderReviewPostProcess(responseText, {
        ...qaPostOptsBase,
        applySafeFallbackPrefix: true,
      });
      responseText = fb.text;
      lastQaPost = fb;
      qaFallbackApplied = true;
      console.log(
        JSON.stringify({
          event: "ur_take_qa_fallback",
          sport: sportHint || "generic",
          score: fb.qa?.score,
          criticalRegenerationCodes: fb.qa?.criticalRegenerationCodes,
        }),
      );
    }

    if (!responseText || responseText.trim().length < 50) {
      responseText = responseDeep || responseText;
    }

    if (
      sportHint === "worldcup" &&
      !wcRunnerUpFollowUpQuestion &&
      wcQaResult &&
      !wcQaResult.passed &&
      isWcGroupStructureQuestion(routingQuestion, wcIntent) &&
      (wcQaResult.issueCodes || []).includes("wc_group_math_mismatch")
    ) {
      const letter =
        extractGroupLetterFromQuestion(routingQuestion) || "D";
      const prebuilt = buildWcGroupSlatePrebuiltStructured({
        groupLetter: letter,
        pickAbbr: "PAR",
        pickMarket: "to advance",
      });
      if (prebuilt) {
        structuredResponse = prebuilt;
        responseText = formatWcCompactDisplayText(prebuilt, prebuilt.lean);
        responseDeep = null;
        wcQaResult = runWcUrTakeQA({
          responseText,
          structured: structuredResponse,
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
        console.log(
          JSON.stringify({
            event: "ur_take_wc_group_math_repair",
            sport: "worldcup",
            wcIntent,
            groupLetter: letter,
            passed: wcQaResult.passed,
          }),
        );
      }
    }

    if (
      sportHint === "worldcup" &&
      !wcRunnerUpFollowUpQuestion &&
      wcQaResult &&
      !wcQaResult.passed &&
      isWcGroupStructureQuestion(routingQuestion, wcIntent) &&
      (wcQaResult.issueCodes || []).includes("wc_group_roster_mismatch")
    ) {
      const letter =
        extractGroupLetterFromQuestion(routingQuestion) ||
        wcContext?.groupMispriceTopGroups?.[0] ||
        "K";
      const comp = getWcGroupComposition(letter);
      const pickAbbr = comp?.contender?.abbreviation || "COL";
      const prebuilt = buildWcGroupSlatePrebuiltStructured({
        groupLetter: letter,
        pickAbbr,
        pickMarket: "to advance",
      });
      if (prebuilt) {
        structuredResponse = prebuilt;
        responseText = formatWcCompactDisplayText(prebuilt, prebuilt.lean);
        responseDeep = null;
        wcQaResult = runWcUrTakeQA({
          responseText,
          structured: structuredResponse,
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
        console.log(
          JSON.stringify({
            event: "ur_take_wc_group_roster_repair",
            sport: "worldcup",
            wcIntent,
            groupLetter: letter,
            passed: wcQaResult.passed,
          }),
        );
      }
    }

    if (
      sportHint === "worldcup" &&
      isWcPlayerMarketIntent(wcIntent) &&
      wcQaResult &&
      !wcQaResult.passed &&
      ((wcQaResult.issueCodes || []).includes("wc_player_question_team_lead") ||
        (wcQaResult.issueCodes || []).includes("wc_player_missing_names"))
    ) {
      const tier = wcContext?.playerMarketTier || "market_only";
      const prebuilt = buildWcPlayerMarketPrebuiltStructured(
        String(question || ""),
        wcIntent,
        tier,
        wcContext?.playerMarketKv?.goldenBoot,
        {
          matchPlayerProps: wcContext?.playerMarketKv?.matchPlayerProps,
          wcEventId: wcRelevanceLog.wcEventId || wcContext?.wcEventId,
        },
      );
      if (prebuilt) {
        structuredResponse = prebuilt;
        responseText = formatWcCompactDisplayText(prebuilt, prebuilt.lean);
        responseDeep = null;
        wcRelevanceLog.qaPlayerMatch = "pass";
        wcRelevanceLog.playerMarketTier = prebuilt.playerMarketTier;
        console.log(
          JSON.stringify({
            event: "ur_take_wc_player_market_repair",
            sport: "worldcup",
            wcIntent,
            playerMarketTier: prebuilt.playerMarketTier,
            priorIssueCodes: wcQaResult.issueCodes,
          }),
        );
      }
    }

    if (sportHint === "worldcup" && wcIntent === WC_INTENT.RULES) {
      const bleedForbidden = [...wcForbiddenEntities, ...wcRequiredEntities];
      const finalized = finalizeWcRulesDelivery({
        responseText,
        responseDeep,
        question: String(question || ""),
        bleedForbidden,
        structuredResponse,
      });
      responseText = finalized.responseText;
      responseDeep = finalized.responseDeep;
      structuredResponse = finalized.structuredResponse;
    } else if (sportHint === "worldcup" && structuredResponse && typeof structuredResponse === "object") {
      if (wcIntent === WC_INTENT.ENTITY_PRICING) {
        const sessionPrices = extractSessionAmericanOdds(incomingHistory);
        structuredResponse = stripWcStructuredSessionPrices(
          structuredResponse,
          String(question || ""),
          sessionPrices,
        );
        responseText = stripSessionBleedPrices(
          responseText,
          String(question || ""),
          sessionPrices,
        );
        if (responseDeep) {
          responseDeep = stripSessionBleedPrices(
            responseDeep,
            String(question || ""),
            sessionPrices,
          );
        }
      }
    }

    if (
      sportHint === "nba" &&
      nbaFinalsModeMeta?.finalsMode &&
      !isNbaFinalsStructured(structuredResponse)
    ) {
      const fields = normalizeNbaFinalsStructuredFields(tryParseJsonObject(responseText));
      const finalsValidation = validateNbaFinalsStructuredResponse(fields);
      if (finalsValidation.valid && fields) {
        structuredResponse = buildNbaFinalsStructuredForDelivery(
          fields,
          nbaFinalsModeMeta?.seriesState,
          String(question || ""),
        );
        responseText = formatNbaFinalsStructuredDisplayText(structuredResponse);
        responseFormat = "nba_finals_json";
      }
    }

    if (sportHint === "worldcup") {
      const tier =
        wcContext?.playerMarketTier || wcRelevanceLog.playerMarketTier || null;
      structuredResponse = buildWcCompactStructured({
        question: String(question || ""),
        wcIntent,
        summary: responseText,
        deep: responseDeep,
        playerMarketTier: tier,
        structuredSeed: structuredResponse,
      });
      if (structuredResponse && typeof structuredResponse === "object") {
        structuredResponse = normalizeWcStructuredForDelivery(
          structuredResponse,
          wcIntent,
          String(question || ""),
          wcRequiredEntities,
        );
      }
      if (wcRunnerUpFollowUpQuestion) {
        const forcedRunnerUp = resolveWcRunnerUpFollowUpDelivery(
          String(question || ""),
          normalizedUrTakeHistoryForGate,
          {
            teamStats: wcContext?.tournamentSimResults?.teamStats,
            bdlFutures: wcContext?.bdlFuturesPayload,
            nowMs: Date.now(),
          },
        );
        if (forcedRunnerUp) {
          structuredResponse = normalizeWcStructuredForDelivery(
            forcedRunnerUp,
            wcIntent,
            String(question || ""),
            wcRequiredEntities,
          );
          responseText = formatWcCompactDisplayText(structuredResponse, structuredResponse.lean);
          responseDeep = null;
        }
      }
      responseText = formatWcCompactDisplayText(structuredResponse, responseText);
    }

    let takeRecord = extractTakeFromResponse({
      responseText,
      sport: sportHint || "generic",
      intent,
      question,
    });
    if (sportHint === "nba") {
      takeRecord = ensureNbaTakeConfidenceConsistency({
        takeRecord,
        decisionMode: nbaDecisionMode,
        derivedConfidence,
        confidenceModifier: nbaConfidenceModifier,
      });
      // Post-gen vocabulary normalizer — runs on every NBA response, not gated on missing confidence.
      responseText = normalizeConfidenceVocabularyInText(responseText);
      if (responseDeep) responseDeep = normalizeConfidenceVocabularyInText(responseDeep);
      if (takeRecord && typeof takeRecord === "object" && takeRecord.confidence) {
        takeRecord = {
          ...takeRecord,
          confidence: normalizeConfidenceVocabularyInText(String(takeRecord.confidence)),
        };
      }
    }

    responseText = stripUrTakeDeadEndCopy(responseText);
    if (responseDeep) responseDeep = stripUrTakeDeadEndCopy(responseDeep);

    const nbaMeta =
      sportHint === "nba"
        ? buildNbaObservabilityMeta({
            decisionMode: nbaDecisionMode,
            sport: "nba",
            matchupGroundingApplied: nbaMatchupGroundingApplied,
            postValidationChecked: nbaPostValidationChecked,
            postValidationTriggered: nbaPostValidationTriggered,
            fallbackOrRepairUsed: nbaFallbackOrRepairUsed,
          })
        : null;
    if (nbaMeta) logNbaObservability(nbaMeta);

    // Non-critical side effect: never fail the response if take logging fails.
    if (userEmail) {
      appendTakeForUser(userEmail, takeRecord).catch((e) => {
        console.warn("take logging failed:", e?.message || e);
      });
    }

    if (!responseText || responseText.trim().length === 0) {
      if (lastNonEmptyRawModelText.trim()) {
        console.error("[ur-take] recovered_empty_post_process", {
          requestId,
          sport: sportHint || "unknown",
          recoveredChars: lastNonEmptyRawModelText.length,
          questionLength: String(question || "").length,
        });
        responseText = lastNonEmptyRawModelText;
      } else {
        console.error("[ur-take] empty_response_after_processing", {
          requestId,
          questionHead: String(question || "").slice(0, 100),
        });
        return feedSnagResponse(sportHint, "empty_response_after_processing", {
          questionLength: String(question || "").length,
          rawModelText: "",
          structuredKeys: structuredResponse && typeof structuredResponse === "object" ? Object.keys(structuredResponse) : null,
        });
      }
    }

    if (userEmail && isPro && !isConversationFollowUp) {
      void (async () => {
        try {
          const src = String(responseText || "");
          const playMatch = src.match(/THE PLAY[:\s]+([^\n]{10,200})/i);
          const playText =
            (playMatch?.[1] && String(playMatch[1]).trim()) ||
            String(takeRecord?.playLine || "").trim();
          if (playText.length >= 10) {
            const confRaw = String(takeRecord?.confidence || "");
            const confidenceTier = /\bHigh\b/i.test(confRaw)
              ? "High"
              : /\bSpeculative\b/i.test(confRaw)
                ? "Speculative"
                : /\bMedium\b/i.test(confRaw)
                  ? "Medium"
                  : "Medium";
            const dateStr = new Date().toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
            });

            const { player, market, direction, line, anchor } = extractStructuredFromPlayText(playText);

            await saveSessionMemory(userEmail, [
              {
                v: 1,
                sport: String(sportHint || "unknown"),
                play: playText.slice(0, 200),
                player,
                market,
                direction,
                line,
                anchor,
                confidence: confidenceTier,
                date: dateStr,
              },
            ]);
          }
        } catch {
          /* never block */
        }
      })();
    }

    const qaSummaryForLog = lastQaPost?.qa
      ? {
          score: lastQaPost.qa.score,
          issueCodes: lastQaPost.qa.issueCodes,
          criticalRegenerationCodes: lastQaPost.qa.criticalRegenerationCodes,
          regenerationAttempts: qaAttemptCount,
          qaFallbackApplied,
          passedCriticalGates:
            !qaRequiresRegeneration(lastQaPost.qa) || qaFallbackApplied,
        }
      : null;

    /** Live-mode chips only: plain answer, effective live (keyword and/or board), not a conversation follow-up turn. */
    let followUpsField;
    if (
      shouldAttachLiveFollowUps({
        outputJsonMode,
        isEffectivelyLive: liveSignals?.isEffectivelyLive,
        hasLiveKeyword: liveSignals?.hasLiveKeyword,
        isConversationFollowUp,
      })
    ) {
      try {
        const haikuT0 = Date.now();
        const fus = await generateLiveFollowUpsWithHaiku(responseText, ANTHROPIC_API_KEY);
        haikuFollowUpsMs = Date.now() - haikuT0;
        if (Array.isArray(fus) && fus.length >= 2) {
          followUpsField = fus;
        }
      } catch (e) {
        console.warn("[ur-take] followUps:", e?.message || e);
      }
    }

    const liveModeFlag = Boolean(liveSignals?.isEffectivelyLive);

    const nbaPlayoffFocusLog =
      sportHint === "nba" && nbaContext?.urTakeParsing
        ? {
            playoffFocusMode: Boolean(nbaContext.urTakeParsing.playoffFocusMode),
            playoffFocusTeamCount: nbaContext.urTakeParsing.playoffFocusTeamCount ?? 0,
            playoffPrioritySource: nbaContext.urTakeParsing.playoffPrioritySource ?? "none",
            playoffSeriesRowsReturned: nbaContext.urTakeParsing.playoffSeriesRowsReturned ?? 0,
            playoffSeriesRowsScoreVisible:
              nbaContext.urTakeParsing.playoffSeriesRowsScoreVisible ?? 0,
            statsBundleAbbrevs: nbaContext.urTakeParsing.statsBundleAbbrevs ?? [],
            effectiveFocusAbbrevs: nbaContext.urTakeParsing.effectiveFocusAbbrevs ?? [],
            deepHydratedTeams: nbaContext.urTakeParsing.deepHydratedTeams ?? [],
            directTeamOverride: Boolean(nbaContext.urTakeParsing.directTeamOverride),
            nonPlayoffTeamRequested: Boolean(nbaContext.urTakeParsing.nonPlayoffTeamRequested),
          }
        : {};

    const nbaRelevanceLog =
      sportHint === "nba"
        ? buildNbaRelevanceLog({
            question: String(question || ""),
            history: incomingHistory,
            nbaContext,
            nbaContextFromClient,
            mustFetchNbaBoard: nbaRelevanceMustFetch,
            serverBoardFetched: nbaRelevanceServerBoardFetched,
            clientContextUsable: nbaRelevanceClientContextUsable,
            liveBoardRefreshForced: nbaLiveBoardRefreshForced,
            clientContextIgnored: nbaClientContextIgnored,
            outrightsInjected: Boolean(nbaFinalsOutrightsMeta?.outrightsInjected),
            seriesOutrightsStale: nbaFinalsOutrightsMeta?.seriesStale ?? null,
            mvpOutrightsStale: nbaFinalsOutrightsMeta?.mvpStale ?? null,
            seriesOutrightsAgeMinutes: nbaFinalsOutrightsMeta?.seriesAgeMinutes ?? null,
            mvpOutrightsAgeMinutes: nbaFinalsOutrightsMeta?.mvpAgeMinutes ?? null,
            finalsMode: nbaFinalsModeMeta?.finalsMode ?? null,
            finalsSeriesSummary: nbaFinalsModeMeta?.seriesState?.seriesScoreLabel ?? null,
            finalsGameNumber: nbaFinalsModeMeta?.seriesState?.gameNumber ?? null,
            finalsMatchupLabel: nbaFinalsModeMeta?.seriesState?.tonightMatchupLabel ?? null,
            finalsVenueLabel: nbaFinalsModeMeta?.seriesState?.venueLabel ?? null,
            finalsContextInjected: Boolean(nbaFinalsContextBlock),
            nbaMatchup,
            isConversationFollowUp,
            qaSummary: qaSummaryForLog,
          })
        : null;

    console.log(
      JSON.stringify({
        requestId,
        event: "ur_take_complete",
        sport: sportHint,
        mode: nbaDecisionMode || "standard",
        bettingStyle,
        oddsAvailable,
        fallback: nbaFallbackOrRepairUsed || false,
        confidenceTier: takeRecord?.confidence || "unknown",
        structuredInPayload: Boolean(structuredResponse),
        contextChars: userPromptCharCount,
        durationMs: Date.now() - requestStart,
        isFollowUp: isConversationFollowUp,
        isPro,
        qa: qaSummaryForLog,
        liveMode: liveModeFlag,
        hasLiveKeyword: Boolean(liveSignals?.hasLiveKeyword),
        isBoardLive: Boolean(liveSignals?.isBoardLive),
        isEffectivelyLive: Boolean(liveSignals?.isEffectivelyLive),
        followUpsAttached: Boolean(followUpsField?.length),
        followUpsCount: followUpsField?.length ?? 0,
        nbaBoardBuildMs,
        anthropicMs,
        haikuFollowUpsMs,
        ...nbaPlayoffFocusLog,
        ...(sportHint === "worldcup" ? { wcRelevance: wcRelevanceLog } : {}),
        ...(nbaRelevanceLog ? { nbaRelevance: nbaRelevanceLog } : {}),
      }),
    );

    const responseBody = {
      requestId,
      response: responseText,
      responseDeep,
      responseFormat,
      statusShift: responseStatusShift,
      decisionMode:
        sportHint === "nba"
          ? nbaDecisionMode
          : sportHint === "mlb"
            ? mlbDecisionMode
            : null,
      ...(nbaDebugEnabled && nbaMeta ? { nbaDebug: nbaMeta } : {}),
      sport: sportHint || "generic",
      intent,
      liveMode: liveModeFlag,
      take: takeClientPayload(takeRecord),
      ...(qaSummaryForLog ? { qaSummary: qaSummaryForLog } : {}),
      ...(followUpsField ? { followUps: followUpsField } : {}),
      ...(sportHint === "worldcup" && wcIntent
        ? { wcIntent, userQuestion: String(question || "").trim() }
        : {}),
    };

    if (structuredResponse) {
      responseBody.structured = structuredResponse;
    }

    if (nbaRelevanceLog) {
      responseBody.nbaRelevance = nbaRelevanceLog;
    }

    if (sportHint === "worldcup" && wcContext?.dataConfidence) {
      responseBody.dataConfidence = wcContext.dataConfidence;
    }
    if (sportHint === "worldcup" && structuredResponse?.playerMarketTier) {
      responseBody.playerMarketTier = structuredResponse.playerMarketTier;
    }

    gateQuotaDelivered = true;
    await attachFreeQuotaMirrorToUrTakeResponse(responseBody, {
      gateQuotaEmail,
      gateQuotaSessionId,
    });

    return res.status(200).json(responseBody);
  } catch (err) {
    console.error("[urTakeApiException]", {
      requestId,
      name: err?.name,
      message: err?.message,
      stack: err?.stack ? String(err.stack).slice(0, 2000) : undefined,
    });
    const s =
      req.body && typeof req.body.sportHint === "string" ? req.body.sportHint.trim() : null;
    return feedSnagResponse(s, "exception_caught", {
      questionLength: String(req.body?.question || "").length,
      err,
      providerErrorName: err?.name,
      providerErrorMessage: err?.message,
      rawModelText: "",
    });
  } finally {
    setActiveGoldenEvalCase(null);
    await releaseUrTakeGateQuotaIfNeeded(gateQuotaReservation, gateQuotaDelivered);
  }
}
