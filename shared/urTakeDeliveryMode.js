/**
 * UR Take delivery mode — Take (structured card) vs Talk (short prose).
 * Gated by UR_TALK_MODE=1 on the server.
 */

import { detectParlayIntent } from "./detectParlayIntent.js";
import { isWcTomorrowOrSlateBetQuestion } from "./wcTakeRetentionQA.js";
import { isWcPlayerMarketIntent, isWcRulesQuestion, WC_INTENT } from "./wcUrTakeIntent.js";

/** @typedef {"take"|"talk"} UrTakeDeliveryMode */

export function isUrTalkModeEnabled() {
  const v = String(process.env.UR_TALK_MODE ?? "")
    .trim()
    .toLowerCase();
  return v === "1" || v === "true" || v === "yes" || v === "on";
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

  if (isUrTakeNewBettingAsk({ question, wcIntent, isConversationFollowUp: isFollowUp })) {
    return "take";
  }

  if (wcIntent === WC_INTENT.RULES || isWcRulesQuestion(question)) return "talk";

  if (isFollowUp && history.length > 0) return "talk";

  if (sport === "worldcup") return "take";

  return "take";
}
