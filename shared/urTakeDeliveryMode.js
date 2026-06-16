/**
 * UR Take delivery mode — Take (structured card) vs Talk (short prose).
 * Gated by UR_TALK_MODE=1 on the server.
 */

import { isWcCardContractExplainFollowUp } from "./wcCardContractFollowUpScorer.js";
import { detectParlayIntent } from "./detectParlayIntent.js";
import { isWcTomorrowOrSlateBetQuestion } from "./wcTakeRetentionQA.js";
import { isWcPlayerMarketIntent, WC_INTENT } from "./wcUrTakeIntent.js";

/** @typedef {"take"|"talk"} UrTakeDeliveryMode */

export function isUrTalkModeEnabled() {
  const v = String(process.env.UR_TALK_MODE ?? "")
    .trim()
    .toLowerCase();
  return v === "1" || v === "true" || v === "yes" || v === "on";
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

  // Phase 1: World Cup only.
  if (sport !== "worldcup") return "take";

  // New betting asks always stay on the Take card pipeline.
  if (detectParlayIntent(question)) return "take";
  if (isWcTomorrowOrSlateBetQuestion(question)) return "take";
  if (!isFollowUp && isWcPlayerMarketIntent(wcIntent)) return "take";
  if (!isFollowUp && (wcIntent === WC_INTENT.MATCHUP || wcIntent === WC_INTENT.SCORE_PREDICTION)) {
    return "take";
  }

  if (wcIntent === WC_INTENT.RULES) return "talk";

  if (isFollowUp && history.length > 0 && isWcCardContractExplainFollowUp(question)) {
    return "talk";
  }

  return "take";
}
