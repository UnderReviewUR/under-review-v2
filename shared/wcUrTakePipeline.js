/**
 * Phase 2 — unified WC UR Take pipeline guards (Resolve → Fetch → Answer).
 * V2 deliver defaults ON when GOAT primary; shadow with WC_PROPS_ROUTE_V2_DELIVER=0.
 */

import { isWcGoatPrimaryEnabled } from "./wcBdlPolicy.js";
import { routeWcPropsTurn } from "./wcPropsRouteTurn.js";
import { resolveWcThreadFixtureContext } from "./wcThreadFixtureContext.js";
import {
  shouldUseWcFixtureMatchupMoneylineRepeatPrebuilt,
  resolveWcFixturePairFromHistory,
} from "./wcFixtureMatchupPrebuilt.js";
import { classifyWcQuestionIntent } from "./wcUrTakeIntent.js";

/** @typedef {"props" | "matchup_ml" | "legacy"} WcUrTakeV2Lane */

/**
 * @param {{ routeHeader?: string, deliverHeader?: string }} [opts]
 * @returns {boolean}
 */
export function isWcUrTakeV2DeliverEnabled(opts = {}) {
  const deliverHeader = String(opts.deliverHeader ?? "").trim();
  if (deliverHeader === "0") return false;
  if (deliverHeader === "1") return true;
  const envFlag = String(process.env.WC_PROPS_ROUTE_V2_DELIVER ?? "").trim().toLowerCase();
  if (envFlag === "0" || envFlag === "false" || envFlag === "no") return false;
  if (envFlag === "1" || envFlag === "true" || envFlag === "yes") return true;
  return isWcGoatPrimaryEnabled();
}

/**
 * @param {object} params
 * @param {string} [params.question]
 * @param {object[]} [params.history]
 * @param {object[]} [params.matches]
 * @param {string | null} [params.incomingWcEventId]
 * @param {boolean} [params.hasImage]
 * @param {string | null} [params.wcIntent]
 * @param {string} [params.routeHeader]
 */
export function resolveWcUrTakeV2Turn(params) {
  const question = String(params.question || "").trim();
  const history = Array.isArray(params.history) ? params.history : [];
  const matches = Array.isArray(params.matches) ? params.matches : [];
  const propsRoute = routeWcPropsTurn({
    question,
    history,
    matches,
    incomingWcEventId: params.incomingWcEventId ?? null,
    hasImage: Boolean(params.hasImage),
    wcIntent: params.wcIntent ?? null,
    routeHeader: params.routeHeader,
  });

  if (propsRoute.applyRoute) {
    return {
      lane: /** @type {WcUrTakeV2Lane} */ ("props"),
      propsRoute,
      matchupMl: null,
      applyDeliver: true,
    };
  }

  const wcIntent =
    params.wcIntent ?? classifyWcQuestionIntent(question, history);
  const isFollowUp = history.length > 0;
  const thread = resolveWcThreadFixtureContext({
    question,
    history,
    matches,
    incomingWcEventId: params.incomingWcEventId ?? null,
  });

  const moneylineRepeat = shouldUseWcFixtureMatchupMoneylineRepeatPrebuilt(
    question,
    wcIntent,
    {
      isConversationFollowUp: isFollowUp,
      history,
      mentionedTeams: [],
      wcEventId:
        thread.pinned?.eventId ||
        params.incomingWcEventId ||
        resolveWcFixturePairFromHistory(history)?.eventId ||
        null,
      hasKvFixture: Boolean(thread.pinned?.eventId || params.incomingWcEventId),
    },
  );

  const explicitWhoWins =
    isFollowUp && /\bwho wins\b/i.test(question) && !/\bgroup context\b/i.test(question);

  if (moneylineRepeat || (explicitWhoWins && thread.pinned?.eventId)) {
    return {
      lane: /** @type {WcUrTakeV2Lane} */ ("matchup_ml"),
      propsRoute,
      matchupMl: {
        wcEventId: thread.pinned?.eventId ?? null,
        fixtureHome: thread.pinned?.home ?? null,
        fixtureAway: thread.pinned?.away ?? null,
        pinMethod: thread.pinned?.pinMethod ?? "thread_fixture",
        moneylineRepeat,
        explicitWhoWins,
      },
      applyDeliver: true,
    };
  }

  return {
    lane: /** @type {WcUrTakeV2Lane} */ ("legacy"),
    propsRoute,
    matchupMl: null,
    applyDeliver: false,
  };
}

/**
 * When V2 deliver is on, fixture alt follow-up must not steal explicit ML / who-wins threads.
 * @param {object} params
 * @param {string} [params.question]
 * @param {object[]} [params.history]
 * @param {string | null} [params.wcIntent]
 * @param {boolean} [params.v2Deliver]
 */
export function shouldSuppressWcFixtureAltFollowUpPrebuilt(params) {
  if (!params.v2Deliver) return false;
  const question = String(params.question || "").trim();
  const history = Array.isArray(params.history) ? params.history : [];
  const wcIntent = params.wcIntent ?? classifyWcQuestionIntent(question, history);
  return shouldUseWcFixtureMatchupMoneylineRepeatPrebuilt(question, wcIntent, {
    isConversationFollowUp: history.length > 0,
    history,
    wcEventId: resolveWcFixturePairFromHistory(history)?.eventId ?? null,
    hasKvFixture: Boolean(resolveWcFixturePairFromHistory(history)?.eventId),
  });
}
