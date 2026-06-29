/**
 * GROUP_SLATE lane — single source of truth for eligibility, reason, and delivery.
 *
 * All WC paths (turn planner, legacy fast path, turn delivery) should use these
 * helpers instead of duplicating shouldUseWc* guards or hardcoded PAR fallbacks.
 */

import {
  buildWcCrossGroupValuePrebuiltStructured,
  buildWcGroupSlatePrebuiltStructured,
  buildWcGroupUpsetScanPrebuiltStructured,
  extractGroupLetterFromQuestion,
  getWcGroupComposition,
  shouldUseWcCrossGroupValuePrebuilt,
  shouldUseWcGroupSlatePrebuilt,
  shouldUseWcGroupUpsetScanPrebuilt,
  wcGroupLetterForTeam,
} from "./wcGroupComposition.js";
import { isWcPlayerMarketIntent } from "./wcUrTakeIntent.js";
import { extractMentionedWcTeams } from "./wcUrTakeKeywords.js";
import {
  isWcTomorrowOrSlateBetQuestion,
  resolveWcSlateRoutingKind,
} from "./wcTakeRetentionQA.js";
import { buildWcTomorrowSlatePrebuiltStructured } from "./wcTomorrowSlatePrebuilt.js";

/** @readonly */
export const WC_GROUP_SLATE_VARIANT = {
  TOMORROW_SLATE: "tomorrow_slate",
  UPSET_SCAN: "upset_scan",
  CROSS_GROUP: "cross_group",
  FLAGSHIP_GROUP: "flagship_group",
};

/** Flagship demo card when the ask explicitly targets broad group-stage value (not a miss fallback). */
export const WC_FLAGSHIP_GROUP_SLATE = Object.freeze({
  groupLetter: "D",
  pickAbbr: "PAR",
  pickMarket: "to advance",
});

/**
 * @typedef {object} WcGroupSlateRoute
 * @property {boolean} eligible
 * @property {string | null} reason — matches WcTurnPlan.reason
 * @property {string | null} variant — WC_GROUP_SLATE_VARIANT value
 * @property {string | null} [slateKind] — resolveWcSlateRoutingKind when fixture-slate path
 */

/**
 * Lightweight observability for slate classifier hits vs fallback (especially fromWcTab).
 * @param {{
 *   question?: string,
 *   fromWcTab?: boolean,
 *   route?: WcGroupSlateRoute | null,
 *   plannerLane?: string | null,
 *   plannerReason?: string | null,
 * }} payload
 */
export function logWcSlateRoutingTrace(payload = {}) {
  const question = String(payload.question || "");
  const fromWcTab = Boolean(payload.fromWcTab);
  const route = payload.route || null;
  const slateKind =
    route?.slateKind ?? resolveWcSlateRoutingKind(question, { fromWcTab });
  if (!slateKind && !route?.eligible) return;
  console.log(
    JSON.stringify({
      event: "wc_slate_routing_trace",
      slateKind,
      routeEligible: Boolean(route?.eligible),
      routeVariant: route?.variant || null,
      routeReason: route?.reason || null,
      fromWcTab,
      plannerLane: payload.plannerLane || null,
      plannerReason: payload.plannerReason || null,
      questionHead: question.slice(0, 96),
    }),
  );
}

/**
 * Whether this opening turn should use GROUP_SLATE fast path (and which variant).
 * Priority: tomorrow/knockout slate → upset scan → cross-group → flagship group slate.
 * @param {{
 *   question?: string,
 *   intent?: string,
 *   isConversationFollowUp?: boolean,
 *   wcRunnerUpFollowUpQuestion?: boolean,
 *   fromWcTab?: boolean,
 * }} [opts]
 * @returns {WcGroupSlateRoute}
 */
export function resolveWcGroupSlatePrebuiltRoute(opts = {}) {
  const question = String(opts.question || "");
  const intent = opts.intent;
  const isConversationFollowUp = Boolean(opts.isConversationFollowUp);
  const wcRunnerUpFollowUpQuestion = Boolean(opts.wcRunnerUpFollowUpQuestion);
  const fromWcTab = Boolean(opts.fromWcTab);
  const slateKind = resolveWcSlateRoutingKind(question, { fromWcTab });

  if (wcRunnerUpFollowUpQuestion || isConversationFollowUp || isWcPlayerMarketIntent(intent)) {
    return { eligible: false, reason: null, variant: null, slateKind: null };
  }

  if (isWcTomorrowOrSlateBetQuestion(question, { fromWcTab })) {
    return {
      eligible: true,
      reason: "tomorrow_slate_question",
      variant: WC_GROUP_SLATE_VARIANT.TOMORROW_SLATE,
      slateKind,
    };
  }
  if (shouldUseWcGroupUpsetScanPrebuilt(question, intent)) {
    return {
      eligible: true,
      reason: "group_upset_scan",
      variant: WC_GROUP_SLATE_VARIANT.UPSET_SCAN,
      slateKind: null,
    };
  }
  if (shouldUseWcCrossGroupValuePrebuilt(question, intent)) {
    return {
      eligible: true,
      reason: "group_slate_prebuilt",
      variant: WC_GROUP_SLATE_VARIANT.CROSS_GROUP,
      slateKind: null,
    };
  }
  if (shouldUseWcGroupSlatePrebuilt(question, intent)) {
    return {
      eligible: true,
      reason: "group_slate_prebuilt",
      variant: WC_GROUP_SLATE_VARIANT.FLAGSHIP_GROUP,
      slateKind: null,
    };
  }

  return { eligible: false, reason: null, variant: null, slateKind: null };
}

/**
 * Resolve route from plan + question — planner reason is the fallback when guards drift.
 * @param {{ reason?: string, intent?: string }} plan
 * @param {string} question
 * @param {{ isConversationFollowUp?: boolean, wcRunnerUpFollowUpQuestion?: boolean }} [ctx]
 * @returns {WcGroupSlateRoute}
 */
export function resolveWcGroupSlateRouteForPlan(plan, question, ctx = {}) {
  const route = resolveWcGroupSlatePrebuiltRoute({
    question,
    intent: plan?.intent,
    isConversationFollowUp: ctx.isConversationFollowUp,
    wcRunnerUpFollowUpQuestion: ctx.wcRunnerUpFollowUpQuestion,
    fromWcTab: ctx.fromWcTab,
  });
  if (route.eligible) return route;

  const reason = String(plan?.reason || "");
  if (reason === "tomorrow_slate_question") {
    return {
      eligible: true,
      reason,
      variant: WC_GROUP_SLATE_VARIANT.TOMORROW_SLATE,
      slateKind: resolveWcSlateRoutingKind(question, { fromWcTab: ctx.fromWcTab }),
    };
  }
  if (reason === "group_upset_scan") {
    return {
      eligible: true,
      reason,
      variant: WC_GROUP_SLATE_VARIANT.UPSET_SCAN,
    };
  }
  if (reason === "group_slate_prebuilt") {
    return {
      eligible: true,
      reason,
      variant: shouldUseWcCrossGroupValuePrebuilt(question, plan?.intent)
        ? WC_GROUP_SLATE_VARIANT.CROSS_GROUP
        : WC_GROUP_SLATE_VARIANT.FLAGSHIP_GROUP,
    };
  }
  return { eligible: false, reason: null, variant: null };
}

/**
 * Derive group/pick for explicit flagship group-slate asks (never used as a routing miss fallback).
 * @param {string} question
 */
export function resolveWcFlagshipGroupSlatePick(question) {
  const q = String(question || "");
  const explicitGroup = extractGroupLetterFromQuestion(q);
  const mentioned = extractMentionedWcTeams(q);

  if (explicitGroup) {
    const comp = getWcGroupComposition(explicitGroup);
    const pickAbbr =
      mentioned.length === 1 &&
      comp?.teams.some((t) => String(t.abbreviation).toUpperCase() === mentioned[0])
        ? mentioned[0]
        : String(comp?.contender?.abbreviation || WC_FLAGSHIP_GROUP_SLATE.pickAbbr).toUpperCase();
    return { groupLetter: explicitGroup, pickAbbr };
  }

  if (mentioned.length === 1) {
    const letter = wcGroupLetterForTeam(mentioned[0]);
    if (letter) {
      return { groupLetter: letter, pickAbbr: mentioned[0] };
    }
  }

  return {
    groupLetter: WC_FLAGSHIP_GROUP_SLATE.groupLetter,
    pickAbbr: WC_FLAGSHIP_GROUP_SLATE.pickAbbr,
  };
}

/**
 * @param {string} question
 * @param {Record<string, unknown>} [opts]
 */
export function buildWcFlagshipGroupSlatePrebuilt(question, opts = {}) {
  const pick = resolveWcFlagshipGroupSlatePick(question);
  return buildWcGroupSlatePrebuiltStructured({
    groupLetter: pick.groupLetter,
    pickAbbr: pick.pickAbbr,
    pickMarket: WC_FLAGSHIP_GROUP_SLATE.pickMarket,
    ...opts,
  });
}

/**
 * Build structured output for a resolved GROUP_SLATE route.
 * Never substitutes PAR/Group D when cross-group or slate builders miss.
 * @param {{
 *   route: WcGroupSlateRoute,
 *   question?: string,
 *   intent?: string,
 *   matches?: Array<Record<string, unknown>>,
 *   teamStats?: Record<string, unknown>,
 *   bdlFutures?: Record<string, unknown>,
 *   simLastUpdated?: number | null,
 *   nowMs?: number,
 *   earlyPrebuilts?: Record<string, unknown>,
 *   loadTomorrowSlate?: () => Promise<Record<string, unknown> | null>,
 *   upsetScanExtras?: Record<string, unknown>,
 *   crossGroupExtras?: Record<string, unknown>,
 * }} opts
 * @returns {Promise<{ structured: Record<string, unknown>, passKind: string } | null>}
 */
export async function buildWcGroupSlateLaneStructured(opts = {}) {
  const route = opts.route;
  if (!route?.eligible || !route.variant) return null;

  const question = String(opts.question || "");
  const nowMs = Number(opts.nowMs) || Date.now();
  const teamStats = opts.teamStats;
  const bdlFutures = opts.bdlFutures;
  const simLastUpdated = opts.simLastUpdated ?? null;
  const early = opts.earlyPrebuilts || {};

  switch (route.variant) {
    case WC_GROUP_SLATE_VARIANT.TOMORROW_SLATE: {
      const structured =
        early.wcTomorrowSlatePrebuiltEarly ||
        early.tomorrowSlate ||
        (opts.loadTomorrowSlate ? await opts.loadTomorrowSlate().catch(() => null) : null) ||
        buildWcTomorrowSlatePrebuiltStructured({
          question,
          matches: Array.isArray(opts.matches) ? opts.matches : [],
          teamStats,
          simLastUpdated,
          nowMs,
        });
      return structured ? { structured, passKind: "tomorrow_slate" } : null;
    }
    case WC_GROUP_SLATE_VARIANT.UPSET_SCAN: {
      const structured =
        early.wcGroupUpsetScanPrebuiltEarly ||
        buildWcGroupUpsetScanPrebuiltStructured({
          teamStats,
          bdlFutures,
          question,
          nowMs,
          simLastUpdated,
          ...(opts.upsetScanExtras || {}),
        });
      return structured ? { structured, passKind: "upset_scan" } : null;
    }
    case WC_GROUP_SLATE_VARIANT.CROSS_GROUP: {
      const structured =
        early.wcCrossGroupPrebuiltEarly ||
        buildWcCrossGroupValuePrebuiltStructured({
          teamStats,
          bdlFutures,
          question,
          nowMs,
          simLastUpdated,
          ...(opts.crossGroupExtras || {}),
        });
      return structured ? { structured, passKind: "cross_group" } : null;
    }
    case WC_GROUP_SLATE_VARIANT.FLAGSHIP_GROUP: {
      const structured = buildWcFlagshipGroupSlatePrebuilt(question, {
        teamStats,
        bdlFutures,
        nowMs,
        simLastUpdated,
      });
      return structured ? { structured, passKind: "group_slate" } : null;
    }
    default:
      return null;
  }
}
