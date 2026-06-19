/**
 * WC turn planner — intent resolution and lite-context policy.
 * Extracted from wcTurnPlanner.js so routing vs delivery stay separate.
 */

import { extractMentionedWcTeams } from "./wcUrTakeKeywords.js";
import {
  classifyWcQuestionIntent,
  isWcMatchTotalsQuestion,
  isWcPlayerMarketIntent,
  WC_INTENT,
} from "./wcUrTakeIntent.js";
import {
  classifyWcFollowUpIntent,
  isWcPlayerPropFollowUpExplain,
  resolveWcFollowUpSubject,
} from "./wcFollowUpExplain.js";
import {
  isWcFixtureScopedPlayerMarketQuestion,
} from "./wcUrTakePlayerMarket.js";
import {
  isWcMatchupAltMarketFollowUp,
  isWcMatchupOtherSideFollowUp,
  isWcTotalsExplainFollowUp,
} from "./wcMatchBettingPrompt.js";
import { WC_TURN_LANE } from "./wcTurnConstants.js";

/** @typedef {import("./wcUrTakeIntent.js").WcUrTakeIntent} WcUrTakeIntent */

/**
 * @param {Record<string, unknown> | null | undefined} priorLean
 */
export function priorLaneHintFromStructured(priorLean) {
  if (!priorLean || typeof priorLean !== "object") return null;
  const ct = String(priorLean.callType || "").toLowerCase();
  const lean = String(priorLean.lean || "").toLowerCase();
  if (ct.includes("live") || /\b2 live leans\b/i.test(lean)) return WC_TURN_LANE.LIVE_IN_PLAY;
  if (ct.startsWith("player_market")) return WC_TURN_LANE.PROPS_FAST;
  if (ct === "matchup" || ct === "tomorrow_slate") return WC_TURN_LANE.MATCHUP_PREBUILT;
  if (/\bto win\b/i.test(lean)) return WC_TURN_LANE.MATCHUP_PREBUILT;
  return null;
}

/**
 * Conditional scenario follow-up on a pinned fixture thread ("if USA scores early…").
 * @param {string} question
 * @param {Record<string, unknown> | null | undefined} priorLean
 */
export function isWcConditionalMatchupFollowUp(question, priorLean) {
  const q = String(question || "").trim();
  if (!q || !priorLean) return false;
  const conditional =
    /\b(if|when|once|after)\b/i.test(q) &&
    /\b(score|scores|goal|go up|take the lead|go ahead|early|first)\b/i.test(q);
  if (!conditional && !isWcMatchupOtherSideFollowUp(q)) return false;
  const priorLane = priorLaneHintFromStructured(priorLean);
  return (
    priorLane === WC_TURN_LANE.LIVE_IN_PLAY ||
    priorLane === WC_TURN_LANE.MATCHUP_PREBUILT ||
    priorLane === WC_TURN_LANE.MATCHUP_ALT_FOLLOWUP ||
    String(priorLean.callType || "").toLowerCase() === "matchup"
  );
}

/**
 * Planner intent — wraps legacy classifiers and fixes known disconnect patterns.
 * @param {string} question
 * @param {object[]} history
 * @param {boolean} isFollowUp
 * @param {Record<string, unknown> | null | undefined} priorLean
 */
export function resolveWcTurnIntent(question, history, isFollowUp, priorLean) {
  const followUpIntent = classifyWcFollowUpIntent(question, history);
  if (followUpIntent) return /** @type {WcUrTakeIntent} */ (followUpIntent);

  if (isFollowUp && priorLean) {
    if (isWcPlayerPropFollowUpExplain(question, history)) {
      return WC_INTENT.PLAYER_PROP;
    }
    const subject = resolveWcFollowUpSubject(history, question);
    if (
      subject.kind === "totals" ||
      isWcTotalsExplainFollowUp(question) ||
      isWcMatchupAltMarketFollowUp(question) ||
      isWcConditionalMatchupFollowUp(question, priorLean)
    ) {
      return WC_INTENT.MATCHUP;
    }
  }

  if (/\bmispric/i.test(String(question || "")) && extractMentionedWcTeams(question).length >= 1) {
    return WC_INTENT.ENTITY_PRICING;
  }

  const legacy = classifyWcQuestionIntent(question, history);

  if (
    isFollowUp &&
    legacy === WC_INTENT.CONTINUATION &&
    priorLean &&
    (isWcMatchupAltMarketFollowUp(question) || isWcConditionalMatchupFollowUp(question, priorLean))
  ) {
    return WC_INTENT.MATCHUP;
  }

  if (
    !isWcPlayerMarketIntent(legacy) &&
    !isWcMatchTotalsQuestion(question) &&
    isWcFixtureScopedPlayerMarketQuestion(question) &&
    isFollowUp
  ) {
    return WC_INTENT.PLAYER_PROP;
  }

  return legacy;
}

/**
 * Lite context is disabled whenever a structured prior lean exists on the thread.
 * @param {object} params
 */
export function resolveWcTurnUseLiteContext(params) {
  const {
    lane,
    intent,
    isFollowUp,
    priorLean,
    pinnedEventId,
  } = params;

  if (!isFollowUp) return false;
  if (priorLean) return false;
  if (pinnedEventId) return false;
  if (isWcPlayerMarketIntent(intent)) return false;
  if (lane === WC_TURN_LANE.LLM_THREAD) return false;
  if (
    lane === WC_TURN_LANE.GROUP_SLATE ||
    lane === WC_TURN_LANE.RUNNER_UP_FOLLOWUP ||
    lane === WC_TURN_LANE.RULES_LLM
  ) {
    return false;
  }
  if (intent === WC_INTENT.RULES) return false;
  return intent === WC_INTENT.CONTINUATION || intent === WC_INTENT.GENERAL;
}
