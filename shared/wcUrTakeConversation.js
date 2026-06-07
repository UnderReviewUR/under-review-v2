/**
 * World Cup UR Take — conversation pivot helpers (delegates to cross-sport urTakeConversation).
 */

import { WC_INTENT } from "./wcUrTakeIntent.js";
import { isWcPlayerMarketIntent } from "./wcUrTakePlayerMarket.js";
import {
  buildConversationTransitionBlock,
  filterPriorTakesOnConversationPivot,
  softenPriorTakesInstructions,
  urTakeConversationPivotMeta,
} from "./urTakeConversation.js";

export { softenPriorTakesInstructions };

/**
 * @param {string} intent
 */
export function wcIntentFamily(intent) {
  const i = String(intent || "");
  if (i === WC_INTENT.RULES) return "rules";
  if (i === WC_INTENT.SCORE_PREDICTION) return "scorelines";
  if (i === WC_INTENT.TOP_GOALSCORERS_LIST) return "goalscorers_list";
  if (isWcPlayerMarketIntent(i)) return "player_market_single";
  if (i === WC_INTENT.MATCHUP) return "matchup";
  if (i === WC_INTENT.ENTITY_PRICING) return "pricing";
  if (i === WC_INTENT.STRUCTURAL) return "group";
  if (i === WC_INTENT.CONTINUATION) return "continuation";
  if (i === WC_INTENT.GENERAL || i === WC_INTENT.UNCLASSIFIED) return "general";
  return "other";
}

/**
 * @param {string} question
 * @param {object[]} history
 * @param {string} [currentIntent]
 */
export function wcConversationPivotMeta(question, history, currentIntent) {
  return urTakeConversationPivotMeta("worldcup", question, history, currentIntent);
}

/**
 * @param {string} priorSummary
 * @param {string} question
 * @param {object[]} history
 * @param {string} [wcIntent]
 */
export function filterPriorTakesOnWcConversationPivot(priorSummary, question, history, wcIntent) {
  return filterPriorTakesOnConversationPivot(
    priorSummary,
    "worldcup",
    question,
    history,
    wcIntent,
  );
}

/**
 * @param {string} question
 * @param {object[]} history
 * @param {string} [wcIntent]
 */
export function buildWcConversationTransitionBlock(question, history, wcIntent) {
  return buildConversationTransitionBlock("worldcup", question, history, wcIntent);
}
