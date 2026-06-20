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
import { wcMatchupTeamDisplayName } from "./wcMatchupWinnerLine.js";
import { capWcCharsAtWord } from "./wcSentenceBoundaries.js";
import {
  buildWcPostedGenericPropsFollowUpPromptBlock,
  formatWcLiveMatchStatePhrase,
} from "./wcLivePropsBoardPrompt.js";
import { hasMatchPlayerPropRows } from "./wcMatchPlayerProps.js";

/** Lanes where prior lean must block cold generic PASS copy. */
const WC_THREAD_PRIOR_LEAN_LANES = new Set([
  WC_TURN_LANE.LLM_THREAD,
  WC_TURN_LANE.LLM_FULL,
  WC_TURN_LANE.LLM_LITE,
  WC_TURN_LANE.MATCHUP_ALT_FOLLOWUP,
]);

/**
 * @param {import("./wcTurnConstants.js").WcTurnPlan | null | undefined} plan
 */
export function wcTurnUsesThreadPassPolicy(plan) {
  if (!plan?.priorLean || !plan.isConversationFollowUp) return false;
  return WC_THREAD_PRIOR_LEAN_LANES.has(plan.lane);
}

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
    "PASS POLICY: Only say PASS if you truly have zero edge and the prior lean no longer applies. Prefer holding/extending the prior lean with updated live reasoning. Never output cold generic \"Pass — no actionable line yet; see Watch For before locking a bet.\"",
    JSON.stringify(payload, null, 2),
  ].join("\n");
}

/**
 * Live score/state snippet from prior structured card (whyNow, line, lean).
 * @param {Record<string, unknown> | null | undefined} priorLean
 */
export function extractWcPriorLiveScoreSnippet(priorLean) {
  if (!priorLean || typeof priorLean !== "object") return "";
  const blob = [priorLean.whyNow, priorLean.line, priorLean.lean, priorLean.call]
    .map((s) => String(s || "").trim())
    .filter(Boolean)
    .join(" ");
  if (!blob) return "";

  const teamLeads = blob.match(
    /([A-Za-z][A-Za-z\s.'-]{1,28})\s+leads?\s+(\d+)\s*[-–]\s*(\d+)/i,
  );
  if (teamLeads) {
    return `${teamLeads[1].trim()} leads ${teamLeads[2]}-${teamLeads[3]}`;
  }

  const liveScore = blob.match(/(\d+)\s*[-–]\s*(\d+)\s+live\b/i);
  if (liveScore) {
    const home = String(priorLean.fixtureHome || "").trim();
    const away = String(priorLean.fixtureAway || "").trim();
    if (home && away) {
      const h = Number(liveScore[1]);
      const a = Number(liveScore[2]);
      if (h > a) return `${home} leads ${h}-${a}`;
      if (a > h) return `${away} leads ${a}-${h}`;
    }
    return `${liveScore[1]}-${liveScore[2]} live`;
  }

  const atScore = blob.match(/\bat\s+(\d+)\s*[-–]\s*(\d+)/i);
  if (atScore) {
    const home = String(priorLean.fixtureHome || "").trim();
    const away = String(priorLean.fixtureAway || "").trim();
    const h = Number(atScore[1]);
    const a = Number(atScore[2]);
    if (home && away) {
      if (h > a) return `${home} leads ${h}-${a}`;
      if (a > h) return `${away} leads ${a}-${h}`;
    }
    return `${atScore[1]}-${atScore[2]}`;
  }

  return "";
}

/**
 * Phrase for the prior totals lean (e.g. "Under 3.5 lean").
 * @param {Record<string, unknown> | null | undefined} priorLean
 */
function extractWcPriorTotalsLeanPhrase(priorLean) {
  const raw = String(priorLean?.lean || priorLean?.call || "")
    .trim()
    .replace(/^lean:\s*/i, "");
  const totals = raw.match(/\b(Under|Over)\s+[\d.]+(?:\s+goals?)?/i);
  if (totals) {
    const side = totals[1];
    const line = totals[0].match(/[\d.]+/)?.[0] || "";
    return `${side} ${line} lean`;
  }
  return "";
}

/**
 * Extra binding for vague props follow-ups after a live/matchup prebuilt.
 * Branches on whether BDL props KV has posted lines for the pinned fixture.
 * @param {import("./wcTurnConstants.js").WcTurnPlan | null | undefined} plan
 * @param {{ homeName?: string, awayName?: string }} [fixture]
 * @param {{ match?: Record<string, unknown> | null, propsPayload?: Record<string, unknown> | null, question?: string }} [opts]
 */
export function buildWcGenericPropsFollowUpPromptBlock(plan, fixture = {}, opts = {}) {
  if (plan?.reason !== "generic_props_followup_after_prebuilt" || !plan.priorLean) return "";

  const propsPayload = opts.propsPayload ?? null;
  const match = opts.match ?? null;
  const question = String(opts.question || "").trim();

  if (hasMatchPlayerPropRows(propsPayload)) {
    return buildWcPostedGenericPropsFollowUpPromptBlock(plan, fixture, {
      ...opts,
      propsPayload,
      match,
      question,
    });
  }

  const homeRaw = String(fixture.homeName || plan.pinnedHome || "").trim();
  const awayRaw = String(fixture.awayName || plan.pinnedAway || "").trim();
  const homeName = homeRaw.length <= 4 ? wcMatchupTeamDisplayName(homeRaw) : homeRaw;
  const awayName = awayRaw.length <= 4 ? wcMatchupTeamDisplayName(awayRaw) : awayRaw;
  const fixtureLabel =
    homeName && awayName ? `${homeName} vs ${awayName}` : "this fixture";
  const totalsPhrase = extractWcPriorTotalsLeanPhrase(plan.priorLean);
  const liveSnippet =
    formatWcLiveMatchStatePhrase(
      match,
      String(plan.pinnedHome || "").trim(),
      String(plan.pinnedAway || "").trim(),
    ) || extractWcPriorLiveScoreSnippet(plan.priorLean);
  const targetLean = buildWcThreadAwareNoPropsFallback(plan.priorLean, {
    homeName,
    awayName,
  });

  return [
    "WC GENERIC PROPS FOLLOW-UP — NO LINES POSTED (binding; do not cold-start a props board)",
    `Fixture: ${fixtureLabel}. Player prop markets are NOT posted for this match yet.`,
    totalsPhrase
      ? `Prior match lean to preserve: ${totalsPhrase}.`
      : `Prior match lean to preserve: ${String(plan.priorLean.lean || plan.priorLean.call || "").trim()}.`,
    liveSnippet ? `Live state to reference: ${liveSnippet}.` : "",
    "REQUIRED: (1) say props aren't posted yet, (2) explicitly hold the prior lean, (3) mention live score if known, (4) no 'Not posted' market inventory.",
    `Target lean line (use or closely match): "${targetLean}"`,
  ]
    .filter(Boolean)
    .join("\n");
}

/**
 * Inject prior structured lean into WC context prompt block for LLM_THREAD lanes.
 * @param {Record<string, unknown> | null | undefined} wcContext
 * @param {import("./wcTurnConstants.js").WcTurnPlan | null | undefined} plan
 */
function resolveLlmThreadPropsContext(wcContext, plan, packet = null) {
  const matches = Array.isArray(wcContext?.allMatches)
    ? wcContext.allMatches
    : Array.isArray(packet?.allMatches)
      ? packet.allMatches
      : [];
  let match = resolveDeliveryMatch(plan, { wcContext, matches });
  if (!match && packet?.pinnedFixture) {
    const pf = packet.pinnedFixture;
    match =
      matches.find((m) => String(m.id) === String(pf.eventId)) ||
      /** @type {Record<string, unknown>} */ ({
        id: pf.eventId,
        homeTeam: pf.home,
        awayTeam: pf.away,
        status: pf.status,
        minute: pf.clockDisplay,
      });
  }
  const propsPayload =
    wcContext?.playerMarketKv?.matchPlayerProps ||
    wcContext?.matchPlayerProps ||
    packet?.matchPlayerProps ||
    null;
  const question = String(
    wcContext?.routingQuestion ||
      wcContext?.question ||
      packet?.ask?.question ||
      "",
  ).trim();
  return { match, propsPayload, question };
}

export function applyWcLlmThreadPriorLeanToContext(wcContext, plan) {
  if (!wcContext || typeof wcContext !== "object") return wcContext;
  if (!wcTurnUsesThreadPassPolicy(plan)) return wcContext;
  const priorBlock = buildWcPriorLeanPromptBlock(plan.priorLean);
  if (!priorBlock) return wcContext;
  const { match, propsPayload, question } = resolveLlmThreadPropsContext(wcContext, plan);
  const genericPropsBlock =
    plan.reason === "generic_props_followup_after_prebuilt"
      ? buildWcGenericPropsFollowUpPromptBlock(
          plan,
          {
            homeName: plan.pinnedHome,
            awayName: plan.pinnedAway,
          },
          { match, propsPayload, question },
        )
      : "";
  const passPolicyBlock = buildWcThreadPassPolicyPromptBlock(plan, { question, match });
  const block = [priorBlock, passPolicyBlock, genericPropsBlock].filter(Boolean).join("\n\n");
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
  if (!wcTurnUsesThreadPassPolicy(plan)) return packet;
  packet.priorStructuredLean = plan.priorLean;
  if (!packet.views || typeof packet.views !== "object") packet.views = {};
  if (!packet.views.claude || typeof packet.views.claude !== "object") {
    packet.views.claude = {};
  }
  packet.views.claude.priorStructuredLean = plan.priorLean;
  const { match, propsPayload, question } = resolveLlmThreadPropsContext(
    null,
    plan,
    packet,
  );
  const genericPropsBlock =
    plan.reason === "generic_props_followup_after_prebuilt"
      ? buildWcGenericPropsFollowUpPromptBlock(
          plan,
          {
            homeName: plan.pinnedHome,
            awayName: plan.pinnedAway,
          },
          {
            match,
            propsPayload: packet?.matchPlayerProps || propsPayload,
            question,
          },
        )
      : "";
  const reconcileLine =
    "Reconcile with priorStructuredLean when answering — do not ignore the prior card.";
  const passLine =
    "Only say PASS if you truly have zero edge. Prefer holding/extending the prior lean — never cold generic PASS copy.";
  const propsLine = genericPropsBlock
    ? genericPropsBlock.includes("LINES POSTED")
      ? "For vague props asks with posted lines: lead with live score/clock, name 2–3 specific legs with American odds and chalk/value/script reasoning."
      : "For vague props asks with no posted lines: hold the prior lean, cite live score, no props inventory board."
    : "";
  const instructions = String(packet.views.claude.instructions || "").trim();
  const extra = [reconcileLine, passLine, propsLine].filter(Boolean).join("\n");
  packet.views.claude.instructions = instructions ? `${instructions}\n${extra}` : extra;
  return packet;
}

const GENERIC_WC_PASS_FALLBACK =
  "Pass — no actionable line yet; see Watch For before locking a bet.";

/**
 * Cold generic PASS copy that should never appear when a prior lean anchors the thread.
 * @param {string} lean
 */
export function isGenericWcPassLean(lean) {
  const s = String(lean || "").trim();
  if (!s) return true;
  return (
    /^pass\s*[—-]\s*no actionable line yet/i.test(s) ||
    /^pass\s*[—-]\s*no verified/i.test(s) ||
    /^pass\s*[—-]\s*thesis only until/i.test(s) ||
    /\bno actionable line yet\b.*\bwatch for\b/i.test(s) ||
    s === GENERIC_WC_PASS_FALLBACK ||
    s === GENERIC_WC_PASS_FALLBACK.replace(/—/g, "-")
  );
}

/**
 * Softer thread continuation when prior lean exists — avoids cold PASS.
 * @param {Record<string, unknown> | null | undefined} priorLean
 * @param {{ question?: string, match?: Record<string, unknown> | null, liveSnippet?: string }} [opts]
 */
export function buildWcThreadContinuationFallback(priorLean, opts = {}) {
  if (!priorLean || typeof priorLean !== "object") return GENERIC_WC_PASS_FALLBACK;

  const question = String(opts.question || "").trim();
  const liveSnippet =
    String(opts.liveSnippet || "").trim() ||
    (opts.match
      ? formatWcLiveMatchStatePhrase(
          opts.match,
          String(priorLean.fixtureHome || opts.match.homeTeam || ""),
          String(priorLean.fixtureAway || opts.match.awayTeam || ""),
        )
      : "") ||
    extractWcPriorLiveScoreSnippet(priorLean);
  const whileLive = liveSnippet ? ` while ${liveSnippet}` : "";

  const totalsPhrase = extractWcPriorTotalsLeanPhrase(priorLean);
  if (totalsPhrase) {
    const sideMatch = totalsPhrase.match(/\b(Under|Over)\b/i);
    const lineMatch = totalsPhrase.match(/[\d.]+/);
    const side = sideMatch ? sideMatch[1] : "Under";
    const line = lineMatch ? lineMatch[0] : "";
    const q = question.toLowerCase();
    if (
      /\b(sitting deep|low block|defensive|park the bus|flip.*under|flip this to under|supports the under|even more under)\b/i.test(
        q,
      )
    ) {
      return `The ${side} ${line} still looks solid${whileLive} — a low block keeps shot volume down and reinforces the under thesis.`;
    }
    if (/\b(open up|more goals|flip.*over|over instead|attacking|high line)\b/i.test(q)) {
      return `Still leaning ${side} ${line}${whileLive}, but I'd downgrade if both teams open up in the second half.`;
    }
    return `Still like the ${side} ${line}${whileLive} — holding the prior lean with the live script.`;
  }

  const raw = String(priorLean.lean || priorLean.call || "")
    .trim()
    .replace(/^lean:\s*/i, "");
  const ml = raw.match(/([^;·]+?\s+[-+]\d+\s+to win)/i);
  if (ml) {
    return `Still backing ${ml[1].trim()}${whileLive} — extending the prior lean unless the live script flips.`;
  }

  const liveLeans = raw.match(/\b2 live leans at\b/i);
  if (liveLeans) {
    const tail = raw.replace(/^2 live leans at[^:]*:\s*/i, "").trim();
    return tail
      ? `Still aligned with the live lean (${tail})${whileLive}.`
      : `Still aligned with the prior live lean${whileLive}.`;
  }

  const snippet = capWcCharsAtWord(raw.split(/[;·]/)[0].trim(), 120);
  if (snippet) {
    return `Still aligned with the prior lean (${snippet})${whileLive} — no reason to cold-pass yet.`;
  }

  return GENERIC_WC_PASS_FALLBACK;
}

/**
 * Binding PASS policy for thread lanes — inject alongside prior lean block.
 * @param {import("./wcTurnConstants.js").WcTurnPlan | null | undefined} plan
 * @param {{ question?: string, match?: Record<string, unknown> | null }} [opts]
 */
export function buildWcThreadPassPolicyPromptBlock(plan, opts = {}) {
  if (!wcTurnUsesThreadPassPolicy(plan)) return "";
  const target = buildWcThreadContinuationFallback(plan.priorLean, {
    question: opts.question,
    match: opts.match,
  });
  if (isGenericWcPassLean(target)) return "";

  return [
    "WC THREAD PASS POLICY (binding)",
    "Only say PASS if you truly have zero edge and the prior lean is invalidated.",
    "Prefer holding/extending the prior lean with updated live reasoning — never the cold generic PASS.",
    `Target continuation lean (use or closely match): "${target}"`,
  ].join("\n");
}

/**
 * Rewrite cold generic PASS on structured output when a prior lean exists.
 * @param {Record<string, unknown> | null | undefined} structured
 * @param {object} [opts]
 */
export function applyWcThreadPriorLeanPassRewrite(structured, opts = {}) {
  if (!structured || typeof structured !== "object") return structured;
  const priorLean =
    opts.priorLean ||
    opts.wcTurnPlan?.priorLean ||
    null;
  if (!priorLean) return structured;

  const lean = String(structured.lean || "").trim();
  if (!isGenericWcPassLean(lean)) return structured;

  const hasThreadContext =
    Boolean(opts.history?.length) ||
    Boolean(opts.isConversationFollowUp) ||
    wcTurnUsesThreadPassPolicy(opts.wcTurnPlan || null);
  if (!hasThreadContext) return structured;

  const rewritten = buildWcThreadContinuationFallback(priorLean, {
    question: opts.question,
    match: opts.match,
  });
  if (isGenericWcPassLean(rewritten)) return structured;

  const call = String(structured.call || "").trim();
  return {
    ...structured,
    lean: rewritten,
    call: !call || isGenericWcPassLean(call) ? rewritten : call,
  };
}

/**
 * Thread-aware PASS fallback when a structured prior lean exists on the thread.
 * @param {Record<string, unknown> | null | undefined} priorLean
 * @param {{ question?: string, match?: Record<string, unknown> | null }} [opts]
 */
export function buildWcThreadAwarePassFallback(priorLean, opts = {}) {
  if (priorLean && typeof priorLean === "object") {
    const continuation = buildWcThreadContinuationFallback(priorLean, opts);
    if (!isGenericWcPassLean(continuation)) return continuation;
  }
  return GENERIC_WC_PASS_FALLBACK;
}

/**
 * Thread-aware fallback when fixture player props are not posted yet.
 * @param {Record<string, unknown> | null | undefined} priorLean
 * @param {{ homeName?: string, awayName?: string }} [fixture]
 */
export function buildWcThreadAwareNoPropsFallback(priorLean, fixture = {}) {
  const homeName = String(fixture.homeName || "").trim();
  const awayName = String(fixture.awayName || "").trim();
  const fixtureLabel =
    homeName && awayName ? `${homeName} vs ${awayName}` : "this match";
  const liveSnippet = extractWcPriorLiveScoreSnippet(priorLean);
  const whileLive = liveSnippet ? ` while ${liveSnippet}` : "";
  const closing = " We'll update you as soon as lines drop.";

  if (!priorLean || typeof priorLean !== "object") {
    return `No player prop lines posted yet for ${fixtureLabel} — books typically publish closer to kickoff once lineups are confirmed.${closing.trim()}`;
  }

  const totalsPhrase = extractWcPriorTotalsLeanPhrase(priorLean);
  if (totalsPhrase) {
    return `No player props posted yet for ${fixtureLabel} — sticking with the ${totalsPhrase}${whileLive}.${closing}`;
  }

  const raw = String(priorLean.lean || priorLean.call || "")
    .trim()
    .replace(/^lean:\s*/i, "");
  const ml = raw.match(/([^;·]+?\s+[-+]\d+\s+to win)/i);
  if (ml) {
    return `No player props posted yet for ${fixtureLabel} — sticking with ${ml[1].trim()}${whileLive}.${closing}`;
  }
  const passFallback = buildWcThreadAwarePassFallback(priorLean);
  if (passFallback !== GENERIC_WC_PASS_FALLBACK) {
    const thesis = passFallback
      .replace(/^Pass for now — building on /i, "")
      .replace(/; no new actionable line yet\.?$/i, "");
    return `No player props posted yet for ${fixtureLabel} — sticking with ${thesis}${whileLive}.${closing}`;
  }
  const snippet = capWcCharsAtWord(raw.split(/[;·]/)[0].trim(), 96);
  return snippet
    ? `No player props posted yet for ${fixtureLabel} — sticking with prior lean (${snippet})${whileLive}.${closing}`
    : `No player props posted yet for ${fixtureLabel} — hold the prior match lean until lines post.${closing}`;
}

export { WC_TURN_LANE, WC_TURN_FAST_PATH_LANES };
