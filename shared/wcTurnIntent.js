/**
 * WC turn planner — intent resolution and lite-context policy.
 * Extracted from wcTurnPlanner.js so routing vs delivery stay separate.
 */

import { extractLastAssistantStructured } from "./wcCardContractFollowUpScorer.js";
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
import { detectParlayIntent } from "./detectParlayIntent.js";
import {
  isWcFixtureScopedPlayerMarketQuestion,
  isGenericWcPlayerPropQuestion,
  isWcFixturePlayerPropsQuestion,
  isWcNamedPlayerPropQuestion,
} from "./wcUrTakePlayerMarket.js";
import {
  isWcMatchupAltMarketFollowUp,
  isWcMatchupOtherSideFollowUp,
  isWcTotalsExplainFollowUp,
} from "./wcMatchBettingPrompt.js";
import { WC_TURN_LANE } from "./wcTurnConstants.js";

/** Lanes where a structured prebuilt card anchors the thread. */
const WC_PRIOR_PREBUILT_THREAD_LANES = new Set([
  WC_TURN_LANE.LIVE_IN_PLAY,
  WC_TURN_LANE.LIVE_BET_TIMING,
  WC_TURN_LANE.LIVE_MATCH_WINNER,
  WC_TURN_LANE.MATCHUP_PREBUILT,
  WC_TURN_LANE.MATCHUP_ALT_FOLLOWUP,
  WC_TURN_LANE.MATCHUP_ML_REPEAT,
]);

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
  if (/\b(under|over)\s+[\d.]+\s*goals?\b/i.test(lean)) return WC_TURN_LANE.LIVE_IN_PLAY;
  if (/\bto win\b/i.test(lean)) return WC_TURN_LANE.MATCHUP_PREBUILT;
  return null;
}

/**
 * Prior turn delivered a fixture-scoped prebuilt (live angle, matchup ML/totals, etc.).
 * @param {Record<string, unknown> | null | undefined} priorLean
 */
export function isWcPriorPrebuiltThreadLean(priorLean) {
  const hint = priorLaneHintFromStructured(priorLean);
  if (hint && WC_PRIOR_PREBUILT_THREAD_LANES.has(hint)) return true;
  const ct = String(priorLean?.callType || "").toLowerCase();
  return ct === "matchup" && Boolean(priorLean?.fixtureHome && priorLean?.fixtureAway);
}

/**
 * Last assistant prebuilt lean for thread routing — prefers structured, falls back to
 * wcMatchTeams + prose when the client omits structured on history rows.
 * @param {object[]} history
 */
export function extractWcPriorThreadLeanFromHistory(history) {
  if (!Array.isArray(history)) return null;

  const fromStructured = extractLastAssistantStructured(history);
  if (fromStructured && isWcPriorPrebuiltThreadLean(fromStructured)) {
    return fromStructured;
  }

  for (let i = history.length - 1; i >= 0; i -= 1) {
    const turn = history[i];
    const role = String(turn?.role || "").toLowerCase();
    if (role !== "assistant" && role !== "ai") continue;

    const s = turn.structured && typeof turn.structured === "object" ? turn.structured : null;
    const ctRaw = String(s?.callType || "").trim().toLowerCase();
    if (ctRaw.startsWith("player_market")) continue;

    const home = String(s?.fixtureHome || turn.wcMatchTeams?.home || "")
      .trim()
      .toUpperCase();
    const away = String(s?.fixtureAway || turn.wcMatchTeams?.away || "")
      .trim()
      .toUpperCase();
    const lean = String(s?.lean || s?.call || turn.content || "").trim();
    if (!lean || !home || !away) continue;

    /** @type {Record<string, unknown>} */
    const reconstructed = {
      ...(s || {}),
      callType: ctRaw || "matchup",
      fixtureHome: home,
      fixtureAway: away,
      lean,
      call: String(s?.call || lean).slice(0, 400),
    };
    const eventId = turn.wcEventId ?? s?.wcEventId;
    if (eventId != null && String(eventId).trim()) {
      reconstructed.wcEventId = String(eventId).trim();
    }
    if (isWcPriorPrebuiltThreadLean(reconstructed)) return reconstructed;
  }

  return fromStructured;
}

/**
 * Thread continues when follow-up gate fires OR a prebuilt lean anchors fixture context.
 * @param {object} params
 */
export function isWcThreadAnchoredFollowUp(params) {
  const {
    isConversationFollowUp = false,
    priorLean = null,
    pinnedEventId = null,
    pinnedHome = null,
    pinnedAway = null,
    history = [],
  } = params;
  if (isConversationFollowUp) return true;
  if (!priorLean || !isWcPriorPrebuiltThreadLean(priorLean)) return false;
  if (pinnedEventId || (pinnedHome && pinnedAway)) return true;
  if (
    Array.isArray(history) &&
    history.some((t) => {
      const role = String(t?.role || "").toLowerCase();
      return role === "assistant" || role === "ai";
    })
  ) {
    return true;
  }
  return false;
}

/**
 * Vague fixture-thread props ask after a prebuilt lean — not explicit "Team A vs Team B player props".
 * @param {string} question
 * @param {object[]} history
 * @param {Record<string, unknown> | null | undefined} priorLean
 */
export function isWcGenericPlayerPropsThreadFollowUp(question, history, priorLean) {
  const q = String(question || "").trim();
  if (!q || !priorLean || !isWcPriorPrebuiltThreadLean(priorLean)) return false;
  if (isWcNamedPlayerPropQuestion(q)) return false;
  if (detectParlayIntent(q) && /\bplayer\b/i.test(q)) return false;
  if (isWcPlayerPropFollowUpExplain(q, history)) return false;
  if (isWcFixturePlayerPropsQuestion(q)) return false;
  if (extractMentionedWcTeams(q).length >= 2) return false;

  return (
    isGenericWcPlayerPropQuestion(q) ||
    /\b(any\s+bets?\s+on\s+players?|props?\s+for\s+this\s+match|player props?\s+to\s+consider|got\s+any\s+player props?|what\s+player props?)\b/i.test(
      q,
    ) ||
    /^\s*player props?\??\s*$/i.test(q)
  );
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
  const prior =
    priorLean && isWcPriorPrebuiltThreadLean(priorLean)
      ? priorLean
      : extractWcPriorThreadLeanFromHistory(history);
  const threadAnchored =
    isFollowUp || Boolean(prior && isWcPriorPrebuiltThreadLean(prior));

  const followUpIntent = classifyWcFollowUpIntent(question, history);
  if (followUpIntent) return /** @type {WcUrTakeIntent} */ (followUpIntent);

  if (threadAnchored && prior) {
    if (isWcGenericPlayerPropsThreadFollowUp(question, history, prior)) {
      return WC_INTENT.MATCHUP;
    }
    if (isWcPlayerPropFollowUpExplain(question, history)) {
      return WC_INTENT.PLAYER_PROP;
    }
    const subject = resolveWcFollowUpSubject(history, question);
    if (
      subject.kind === "totals" ||
      isWcTotalsExplainFollowUp(question) ||
      isWcMatchupAltMarketFollowUp(question) ||
      isWcConditionalMatchupFollowUp(question, prior)
    ) {
      return WC_INTENT.MATCHUP;
    }
  }

  if (/\bmispric/i.test(String(question || "")) && extractMentionedWcTeams(question).length >= 1) {
    return WC_INTENT.ENTITY_PRICING;
  }

  const legacy = classifyWcQuestionIntent(question, history);

  if (
    threadAnchored &&
    legacy === WC_INTENT.CONTINUATION &&
    prior &&
    (isWcMatchupAltMarketFollowUp(question) || isWcConditionalMatchupFollowUp(question, prior))
  ) {
    return WC_INTENT.MATCHUP;
  }

  if (
    !isWcPlayerMarketIntent(legacy) &&
    !isWcMatchTotalsQuestion(question) &&
    isWcFixtureScopedPlayerMarketQuestion(question) &&
    threadAnchored &&
    !(prior && isWcGenericPlayerPropsThreadFollowUp(question, history, prior))
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
