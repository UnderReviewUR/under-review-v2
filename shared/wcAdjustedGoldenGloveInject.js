/**
 * Inject Golden Glove odds + adjusted GK path model into WC UR Take context.
 */

import { WC_INTENT } from "./wcUrTakeIntent.js";
import { isWcPredictionsRoundupQuestion } from "./wcPredictionsRoundup.js";
import { adjustGoldenGloveOdds, formatAdjustedGoldenGloveForPrompt, formatGoldenGloveOddsForPrompt } from "./wcGoldenGloveAdjusted.js";
import { goldenGloveRowsFromKv } from "./wcPlayerOddsFreshness.js";

/**
 * @param {string | null | undefined} wcIntent
 * @param {string} [question]
 */
export function shouldInjectGoldenGloveBlocks(wcIntent, question = "") {
  const intent = String(wcIntent || "");
  if (intent === WC_INTENT.PREDICTIONS_ROUNDUP || intent === WC_INTENT.GOLDEN_GLOVE) return true;
  if (isWcPredictionsRoundupQuestion(question)) return true;
  if (/\b(golden\s+glove|best\s+goalkeeper|glove winner)\b/i.test(String(question || ""))) return true;
  return false;
}

/**
 * @param {{
 *   goldenGloveKv?: object | null,
 *   playersKv?: object | null,
 *   tournamentSimResults?: object | null,
 *   maxRows?: number,
 * }} input
 */
export function buildGoldenGlovePromptBlocks(input = {}) {
  const gbRows = goldenGloveRowsFromKv(input.goldenGloveKv, 20);
  const oddsBlock = formatGoldenGloveOddsForPrompt(input.goldenGloveKv, input.maxRows ?? 12);
  if (!gbRows.length) {
    return { oddsBlock, adjustedBlock: null };
  }

  const adjusted = adjustGoldenGloveOdds(gbRows, {
    teamStats: input.tournamentSimResults?.teamStats || {},
    playerRegistry: input.playersKv?.teams || {},
  });
  const adjustedBlock = formatAdjustedGoldenGloveForPrompt(adjusted, input.maxRows ?? 10);
  return { oddsBlock, adjustedBlock };
}
