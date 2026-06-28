/**
 * UR Take delivery mode — Take (structured card) vs Talk (short prose).
 * Gated by UR_TALK_MODE=1 on the server.
 */

import { detectParlayIntent } from "./detectParlayIntent.js";
import { isWcTomorrowOrSlateBetQuestion, isWcKnockoutSlateQuestion } from "./wcTakeRetentionQA.js";
import { isWcPlayerMarketIntent, isWcRulesQuestion, WC_INTENT } from "./wcUrTakeIntent.js";
import { isWcMatchWinnerQuestion } from "./wcMatchupWinnerLine.js";
import {
  isGenericWcPlayerPropQuestion,
  isWcFixtureScopedPlayerMarketQuestion,
  isWcNamedPlayerPropQuestion,
} from "./wcUrTakePlayerMarket.js";

/** @typedef {"take"|"talk"} UrTakeDeliveryMode */

/**
 * Simple opener — Haiku talk instead of Sonnet structured card when prebuilt misses.
 * @param {string} question
 */
export function isWcSimpleMatchupTalkOpener(question) {
  const q = String(question || "").trim();
  if (!q || !/\b(vs\.?|versus)\b/i.test(q)) return false;
  if (detectParlayIntent(q)) return false;
  if (
    /\b(mispric|parlay|prop|goalscorer|both teams to advance|over or under|best bet|moneyline|totals?\s+on|group context)\b/i.test(
      q,
    )
  ) {
    return false;
  }
  return isWcMatchWinnerQuestion(q) || /\bwho wins\b/i.test(q) || /\bpick to win\b/i.test(q);
}

export function isUrTalkModeEnabled() {
  const v = String(process.env.UR_TALK_MODE ?? "")
    .trim()
    .toLowerCase();
  return v === "1" || v === "true" || v === "yes" || v === "on";
}

/**
 * Player-prop turns need structured Take / props fast-path — not Haiku talk deflection.
 * @param {string} question
 * @param {string} [wcIntent]
 */
export function isWcPlayerPropBettingQuestion(question, wcIntent) {
  const q = String(question || "").trim();
  const intent = String(wcIntent || "").trim().toUpperCase();
  if (!q) return false;
  if (detectParlayIntent(q) && /\bplayer\b/i.test(q)) return true;
  if (isWcPlayerMarketIntent(intent) || intent === WC_INTENT.PLAYER_PROP) return true;
  if (isWcNamedPlayerPropQuestion(q)) return true;
  if (isGenericWcPlayerPropQuestion(q)) return true;
  if (isWcFixtureScopedPlayerMarketQuestion(q)) return true;
  if (
    /\b(first goal|first goalscorer|first to score|anytime scorer|goal scorer|player props?|goalscorer)\b/i.test(
      q,
    )
  ) {
    return true;
  }
  return false;
}

/**
 * Opening-turn or pivot asks that need a full Take card (not thread prose).
 * @param {{ question?: string, wcIntent?: string | null, isConversationFollowUp?: boolean }} opts
 */
export function isUrTakeNewBettingAsk(opts = {}) {
  const question = String(opts.question || "").trim();
  const wcIntent = String(opts.wcIntent || "").trim().toUpperCase();
  const isFollowUp = Boolean(opts.isConversationFollowUp);

  if (!question) return false;
  if (detectParlayIntent(question)) return true;
  if (isWcTomorrowOrSlateBetQuestion(question)) return true;
  if (isWcKnockoutSlateQuestion(question)) return true;
  if (isWcPlayerPropBettingQuestion(question, wcIntent)) return true;
  if (!isFollowUp && isWcPlayerMarketIntent(wcIntent)) return true;
  if (
    !isFollowUp &&
    (wcIntent === WC_INTENT.MATCHUP || wcIntent === WC_INTENT.SCORE_PREDICTION)
  ) {
    return true;
  }
  return false;
}

/**
 * @param {{
 *   sportHint?: string | null,
 *   wcIntent?: string | null,
 *   question?: string,
 *   history?: unknown[],
 *   isConversationFollowUp?: boolean,
 *   hasImage?: boolean,
 * }} opts
 * @returns {UrTakeDeliveryMode}
 */
export function resolveUrTakeDeliveryMode(opts = {}) {
  if (!isUrTalkModeEnabled()) return "take";

  const sport = String(opts.sportHint || "").trim().toLowerCase();
  const question = String(opts.question || "").trim();
  const history = Array.isArray(opts.history) ? opts.history : [];
  const wcIntent = String(opts.wcIntent || "").trim().toUpperCase();
  const isFollowUp = Boolean(opts.isConversationFollowUp);
  const hasImage = Boolean(opts.hasImage);

  if (!question || hasImage) return "take";

  if (
    sport === "worldcup" &&
    !isFollowUp &&
    isWcSimpleMatchupTalkOpener(question)
  ) {
    return "talk";
  }

  if (isUrTakeNewBettingAsk({ question, wcIntent, isConversationFollowUp: isFollowUp })) {
    return "take";
  }

  if (sport === "worldcup" && isWcPlayerPropBettingQuestion(question, wcIntent)) {
    return "take";
  }

  if (wcIntent === WC_INTENT.RULES || isWcRulesQuestion(question)) return "talk";

  if (isFollowUp && history.length > 0) return "talk";

  if (sport === "worldcup") return "take";

  return "take";
}
