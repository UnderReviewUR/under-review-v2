/**
 * WC turn delivery — lane-driven fast-path dispatch (Phase 2).
 *
 * When the turn planner flag is ON, handler and fast-path modules consult these
 * helpers instead of scattered shouldUseWc* guards.
 */

import { WC_TURN_LANE, WC_TURN_FAST_PATH_LANES } from "./wcTurnConstants.js";
import {
  buildWcFixtureMatchupPrebuiltStructured,
  buildWcLiveBetTimingPrebuiltStructured,
  buildWcLiveInPlayBetsPrebuiltStructured,
  buildWcLiveMatchWinnerPrebuiltStructured,
  isDuplicateWcStructuredCard,
} from "./wcFixtureMatchupPrebuilt.js";
import {
  buildWcCrossGroupValuePrebuiltStructured,
  buildWcGroupSlatePrebuiltStructured,
  buildWcGroupUpsetScanPrebuiltStructured,
  buildWcRunnerUpFollowUpPrebuiltStructured,
  shouldUseWcCrossGroupValuePrebuilt,
} from "./wcGroupComposition.js";
import {
  extractWcRunnerUpFromHistory,
  isWcTomorrowOrSlateBetQuestion,
} from "./wcTakeRetentionQA.js";

/** @typedef {import("./wcTurnConstants.js").WcTurnPlan} WcTurnPlan */

/** @readonly */
export const WC_TURN_PASS_KIND = {
  LIVE_IN_PLAY: "live_in_play_bets",
  LIVE_BET_TIMING: "live_bet_timing",
  LIVE_MATCH_WINNER: "live_match_winner",
  FIXTURE_MATCHUP: "fixture_matchup",
  FIXTURE_ALT_FOLLOWUP: "fixture_alt_follow_up",
  RUNNER_UP_FOLLOWUP: "runner_up_follow_up",
  GROUP_SLATE: "group_slate",
  UPSET_SCAN: "upset_scan",
  CROSS_GROUP: "cross_group",
  TOMORROW_SLATE: "tomorrow_slate",
  PROPS_FAST: "props_fast",
};

/**
 * @param {string} lane
 */
export function wcTurnLaneToPassKind(lane) {
  switch (lane) {
    case WC_TURN_LANE.LIVE_IN_PLAY:
      return WC_TURN_PASS_KIND.LIVE_IN_PLAY;
    case WC_TURN_LANE.LIVE_BET_TIMING:
      return WC_TURN_PASS_KIND.LIVE_BET_TIMING;
    case WC_TURN_LANE.LIVE_MATCH_WINNER:
      return WC_TURN_PASS_KIND.LIVE_MATCH_WINNER;
    case WC_TURN_LANE.MATCHUP_ALT_FOLLOWUP:
      return WC_TURN_PASS_KIND.FIXTURE_ALT_FOLLOWUP;
    case WC_TURN_LANE.MATCHUP_ML_REPEAT:
    case WC_TURN_LANE.MATCHUP_PREBUILT:
      return WC_TURN_PASS_KIND.FIXTURE_MATCHUP;
    case WC_TURN_LANE.RUNNER_UP_FOLLOWUP:
      return WC_TURN_PASS_KIND.RUNNER_UP_FOLLOWUP;
    case WC_TURN_LANE.GROUP_SLATE:
      return WC_TURN_PASS_KIND.GROUP_SLATE;
    case WC_TURN_LANE.PROPS_FAST:
      return WC_TURN_PASS_KIND.PROPS_FAST;
    default:
      return String(lane || "unknown");
  }
}

/**
 * True when the planner owns delivery decisions for this turn.
 * @param {boolean} plannerEnabled
 * @param {WcTurnPlan | null | undefined} plan
 */
export function isWcPlannerDrivingDelivery(plannerEnabled, plan) {
  return Boolean(plannerEnabled && plan && typeof plan === "object");
}

/**
 * When planner drives delivery: lane string, false (LLM), or null (use legacy guards).
 * @param {boolean} plannerEnabled
 * @param {WcTurnPlan | null | undefined} plan
 * @returns {string | false | null}
 */
export function wcPlannerDeliveryLane(plannerEnabled, plan) {
  if (!isWcPlannerDrivingDelivery(plannerEnabled, plan)) return null;
  if (!plan.shouldUseFastPath) return false;
  return plan.lane;
}

/**
 * Prefer plan.lane when planner is enabled; otherwise fall back to legacy predicate.
 * @param {boolean} plannerEnabled
 * @param {WcTurnPlan | null | undefined} plan
 * @param {string} lane
 * @param {() => boolean} legacyPredicate
 */
export function shouldActivateWcPrebuiltLane(plannerEnabled, plan, lane, legacyPredicate) {
  const driven = wcPlannerDeliveryLane(plannerEnabled, plan);
  if (driven === null) return legacyPredicate();
  if (driven === false) return false;
  return driven === lane;
}

/**
 * Any fixture-scoped prebuilt lane (live + matchup family).
 * @param {boolean} plannerEnabled
 * @param {WcTurnPlan | null | undefined} plan
 * @param {() => boolean} legacyPredicate
 */
export function shouldActivateWcFixturePrebuiltBlock(plannerEnabled, plan, legacyPredicate) {
  const driven = wcPlannerDeliveryLane(plannerEnabled, plan);
  if (driven === null) return legacyPredicate();
  if (driven === false) return false;
  return (
    driven === WC_TURN_LANE.LIVE_IN_PLAY ||
    driven === WC_TURN_LANE.LIVE_BET_TIMING ||
    driven === WC_TURN_LANE.LIVE_MATCH_WINNER ||
    driven === WC_TURN_LANE.MATCHUP_PREBUILT ||
    driven === WC_TURN_LANE.MATCHUP_ALT_FOLLOWUP ||
    driven === WC_TURN_LANE.MATCHUP_ML_REPEAT
  );
}

/**
 * Skip legacy shouldUseWc* guard evaluation when planner already decided LLM path.
 * @param {boolean} plannerEnabled
 * @param {WcTurnPlan | null | undefined} plan
 */
export function shouldRunLegacyWcPrebuiltGuards(plannerEnabled, plan) {
  return !isWcPlannerDrivingDelivery(plannerEnabled, plan);
}

/**
 * Props fast path — planner lane props_fast only.
 * @param {boolean} plannerEnabled
 * @param {WcTurnPlan | null | undefined} plan
 * @param {() => boolean} legacyPredicate
 */
export function shouldActivateWcPropsFastPath(plannerEnabled, plan, legacyPredicate) {
  const driven = wcPlannerDeliveryLane(plannerEnabled, plan);
  if (driven === null) return legacyPredicate();
  if (driven === false) return false;
  return driven === WC_TURN_LANE.PROPS_FAST;
}

/**
 * @param {WcTurnPlan | null | undefined} plan
 * @param {object} ctx
 * @returns {Record<string, unknown> | null}
 */
function resolveDeliveryMatch(plan, ctx) {
  const matches = Array.isArray(ctx.matches)
    ? ctx.matches
    : Array.isArray(ctx.wcContext?.allMatches)
      ? ctx.wcContext.allMatches
      : [];
  if (plan?.pinnedEventId) {
    const hit = matches.find((m) => String(m.id) === String(plan.pinnedEventId));
    if (hit) return hit;
  }
  if (Array.isArray(ctx.wcContext?.matchDetails) && ctx.wcContext.matchDetails[0]) {
    return ctx.wcContext.matchDetails[0];
  }
  const home = String(plan?.pinnedHome || "").toUpperCase();
  const away = String(plan?.pinnedAway || "").toUpperCase();
  if (home && away) {
    return (
      matches.find(
        (m) =>
          String(m.homeTeam || "").toUpperCase() === home &&
          String(m.awayTeam || "").toUpperCase() === away,
      ) || null
    );
  }
  return null;
}

/**
 * @param {WcTurnPlan} plan
 * @param {object} early
 */
function pickEarlyPrebuiltForLane(plan, early = {}) {
  switch (plan.lane) {
    case WC_TURN_LANE.LIVE_IN_PLAY:
      return early.liveInPlay || early.wcLiveInPlayBetsPrebuiltEarly || null;
    case WC_TURN_LANE.LIVE_BET_TIMING:
      return early.liveBetTiming || early.wcLiveBetTimingPrebuiltEarly || null;
    case WC_TURN_LANE.LIVE_MATCH_WINNER:
      return early.liveMatchWinner || early.wcLiveMatchWinnerPrebuiltEarly || null;
    case WC_TURN_LANE.MATCHUP_ALT_FOLLOWUP:
      return early.fixtureAltFollowUp || early.wcFixtureAltFollowUpPrebuiltEarly || null;
    case WC_TURN_LANE.MATCHUP_ML_REPEAT:
    case WC_TURN_LANE.MATCHUP_PREBUILT:
      return (
        early.fixtureMatchup ||
        early.wcFixtureMatchupPrebuiltEarly ||
        early.fixtureAltFollowUp ||
        early.wcFixtureAltFollowUpPrebuiltEarly ||
        null
      );
    case WC_TURN_LANE.GROUP_SLATE:
      return (
        early.tomorrowSlate ||
        early.wcTomorrowSlatePrebuiltEarly ||
        early.upsetScan ||
        early.wcGroupUpsetScanPrebuiltEarly ||
        early.crossGroup ||
        early.wcCrossGroupPrebuiltEarly ||
        null
      );
    default:
      return null;
  }
}

/**
 * Build structured card for a planner fast-path lane (testable without HTTP).
 * Returns null for LLM lanes or props_fast (handled by props module).
 *
 * @param {WcTurnPlan} plan
 * @param {object} ctx
 * @returns {Promise<{ structured: Record<string, unknown>, passKind: string } | null>}
 */
export async function buildWcStructuredForPlan(plan, ctx = {}) {
  if (!plan?.shouldUseFastPath || !WC_TURN_FAST_PATH_LANES.has(plan.lane)) {
    return null;
  }
  if (plan.lane === WC_TURN_LANE.PROPS_FAST || plan.lane === WC_TURN_LANE.PROPS_CLAUDE) {
    return null;
  }

  const early = ctx.earlyPrebuilts || ctx;
  const earlyHit = pickEarlyPrebuiltForLane(plan, early);
  if (earlyHit) {
    return {
      structured: earlyHit,
      passKind: wcTurnLaneToPassKind(plan.lane),
    };
  }

  const question = String(ctx.question || ctx.routingQuestion || "");
  const history = ctx.history || ctx.normalizedUrTakeHistoryForGate || [];
  const nowMs = ctx.nowMs || Date.now();
  const match = resolveDeliveryMatch(plan, ctx);
  const home = String(plan.pinnedHome || match?.homeTeam || "").toUpperCase();
  const away = String(plan.pinnedAway || match?.awayTeam || "").toUpperCase();
  const teamStats = ctx.wcContext?.tournamentSimResults?.teamStats;
  const simLastUpdated = ctx.wcContext?.tournamentSimResults?.lastUpdated ?? null;
  const bdlFutures = ctx.wcContext?.bdlFuturesPayload;

  if (plan.lane === WC_TURN_LANE.RUNNER_UP_FOLLOWUP) {
    const { group, teamAbbr } = extractWcRunnerUpFromHistory(history);
    if (!group) return null;
    const structured = buildWcRunnerUpFollowUpPrebuiltStructured({
      groupLetter: group,
      pickAbbr: teamAbbr,
      teamStats,
      bdlFutures,
      question,
    });
    return structured
      ? { structured, passKind: WC_TURN_PASS_KIND.RUNNER_UP_FOLLOWUP }
      : null;
  }

  if (plan.lane === WC_TURN_LANE.GROUP_SLATE) {
    if (plan.reason === "tomorrow_slate_question" || isWcTomorrowOrSlateBetQuestion(question)) {
      return null;
    }
    if (plan.reason === "group_upset_scan") {
      const structured = buildWcGroupUpsetScanPrebuiltStructured({
        teamStats,
        bdlFutures,
        question,
        nowMs,
        simLastUpdated,
      });
      return structured
        ? { structured, passKind: WC_TURN_PASS_KIND.UPSET_SCAN }
        : null;
    }
    const structured =
      buildWcCrossGroupValuePrebuiltStructured({
        teamStats,
        bdlFutures,
        question,
        nowMs,
        simLastUpdated,
      }) ||
      buildWcGroupSlatePrebuiltStructured({
        groupLetter: "D",
        pickAbbr: "PAR",
        pickMarket: "to advance",
      });
    return structured
      ? {
          structured,
          passKind: shouldUseWcCrossGroupValuePrebuilt(question, plan.intent)
            ? WC_TURN_PASS_KIND.CROSS_GROUP
            : WC_TURN_PASS_KIND.GROUP_SLATE,
        }
      : null;
  }

  if (!home || !away) return null;

  const fixtureCommon = {
    home,
    away,
    group: match?.group,
    question,
    match,
    teamStats,
    simLastUpdated,
    nowMs,
    history,
  };

  /** @type {Record<string, unknown> | null} */
  let structured = null;
  switch (plan.lane) {
    case WC_TURN_LANE.LIVE_IN_PLAY:
      structured = buildWcLiveInPlayBetsPrebuiltStructured({
        ...fixtureCommon,
        liveChanceQuality: ctx.liveChanceQuality || null,
        playerProps: ctx.playerProps || null,
        eventId: plan.pinnedEventId,
      });
      break;
    case WC_TURN_LANE.LIVE_BET_TIMING:
      structured = buildWcLiveBetTimingPrebuiltStructured(fixtureCommon);
      break;
    case WC_TURN_LANE.LIVE_MATCH_WINNER:
      structured = buildWcLiveMatchWinnerPrebuiltStructured(fixtureCommon);
      break;
    case WC_TURN_LANE.MATCHUP_ALT_FOLLOWUP:
    case WC_TURN_LANE.MATCHUP_ML_REPEAT:
    case WC_TURN_LANE.MATCHUP_PREBUILT:
      structured = buildWcFixtureMatchupPrebuiltStructured(fixtureCommon);
      break;
    default:
      return null;
  }

  if (!structured) return null;
  return {
    structured,
    passKind: wcTurnLaneToPassKind(plan.lane),
  };
}

/**
 * Whether a built card should be suppressed as duplicate on follow-up threads.
 * @param {WcTurnPlan} plan
 * @param {Record<string, unknown>} structured
 * @param {object[]} history
 */
export function shouldSuppressWcPlanDeliveryDuplicate(plan, structured, history) {
  if (!plan?.isConversationFollowUp) return false;
  return isDuplicateWcStructuredCard(structured, history);
}

/**
 * Binding prompt slice for LLM_THREAD turns — preserves structured card continuity.
 * @param {Record<string, unknown> | null | undefined} priorLean
 */
export function buildWcPriorLeanPromptBlock(priorLean) {
  if (!priorLean || typeof priorLean !== "object") return "";
  /** @type {Record<string, unknown>} */
  const payload = {};
  for (const key of [
    "callType",
    "fixtureHome",
    "fixtureAway",
    "wcEventId",
    "call",
    "lean",
    "whyNow",
    "edge",
    "confidence",
    "groupLetter",
    "playerMarketTier",
  ]) {
    const val = priorLean[key];
    if (val != null && String(val).trim()) payload[key] = val;
  }
  if (!Object.keys(payload).length) return "";
  return [
    "WC PRIOR TURN — STRUCTURED LEAN (binding thread continuity; extend this thesis — do not cold-start, contradict, or PASS without reconciling)",
    JSON.stringify(payload, null, 2),
  ].join("\n");
}

/**
 * Inject prior structured lean into WC context prompt block for LLM_THREAD lanes.
 * @param {Record<string, unknown> | null | undefined} wcContext
 * @param {import("./wcTurnConstants.js").WcTurnPlan | null | undefined} plan
 */
export function applyWcLlmThreadPriorLeanToContext(wcContext, plan) {
  if (!wcContext || typeof wcContext !== "object") return wcContext;
  if (plan?.lane !== WC_TURN_LANE.LLM_THREAD || !plan.priorLean) return wcContext;
  const block = buildWcPriorLeanPromptBlock(plan.priorLean);
  if (!block) return wcContext;
  wcContext.wcPriorLeanBlock = block;
  if (typeof wcContext.promptBlock === "string" && wcContext.promptBlock.trim()) {
    if (!wcContext.promptBlock.includes("WC PRIOR TURN — STRUCTURED LEAN")) {
      wcContext.promptBlock = `${block}\n\n${wcContext.promptBlock}`;
    }
  } else {
    wcContext.promptBlock = block;
  }
  return wcContext;
}

/**
 * Attach prior lean to grounding packet views for LLM_THREAD continuity.
 * @param {Record<string, unknown> | null | undefined} packet
 * @param {import("./wcTurnConstants.js").WcTurnPlan | null | undefined} plan
 */
export function applyWcLlmThreadPriorLeanToGroundingPacket(packet, plan) {
  if (!packet || typeof packet !== "object") return packet;
  if (plan?.lane !== WC_TURN_LANE.LLM_THREAD || !plan.priorLean) return packet;
  packet.priorStructuredLean = plan.priorLean;
  if (!packet.views || typeof packet.views !== "object") packet.views = {};
  if (!packet.views.claude || typeof packet.views.claude !== "object") {
    packet.views.claude = {};
  }
  packet.views.claude.priorStructuredLean = plan.priorLean;
  const instructions = String(packet.views.claude.instructions || "").trim();
  packet.views.claude.instructions = instructions
    ? `${instructions}\nReconcile with priorStructuredLean when answering — do not ignore the prior card.`
    : "Reconcile with priorStructuredLean when answering — do not ignore the prior card.";
  return packet;
}

const GENERIC_WC_PASS_FALLBACK =
  "Pass — no actionable line yet; see Watch For before locking a bet.";

/**
 * Thread-aware PASS fallback when a structured prior lean exists on the thread.
 * @param {Record<string, unknown> | null | undefined} priorLean
 */
export function buildWcThreadAwarePassFallback(priorLean) {
  if (!priorLean || typeof priorLean !== "object") return GENERIC_WC_PASS_FALLBACK;
  const raw = String(priorLean.lean || priorLean.call || "").trim();
  if (!raw) return GENERIC_WC_PASS_FALLBACK;
  const normalized = raw.replace(/^lean:\s*/i, "").trim();
  const totals = normalized.match(/\b(Under|Over)\s+[\d.]+(?:\s+goals?)?/i);
  if (totals) {
    const side = totals[1];
    const line = totals[0].match(/[\d.]+/)?.[0] || "";
    return `Pass for now — building on the ${side} ${line} lean; no new actionable line yet.`;
  }
  const ml = normalized.match(/([^;·]+?\s+[-+]\d+\s+to win)/i);
  if (ml) {
    return `Pass for now — building on ${ml[1].trim()}; no new actionable line yet.`;
  }
  const snippet = normalized.split(/[;·]/)[0].trim().slice(0, 72);
  return snippet
    ? `Pass for now — building on prior lean (${snippet}); no new actionable line yet.`
    : GENERIC_WC_PASS_FALLBACK;
}

export { WC_TURN_LANE, WC_TURN_FAST_PATH_LANES };
