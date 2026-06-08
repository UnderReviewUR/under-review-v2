/**
 * Inject minutes-weighted Golden Boot table into WC UR Take context (roundups + scorer intents).
 */

import { WC_INTENT } from "./wcUrTakeIntent.js";
import { isWcPlayerMarketIntent } from "./wcUrTakePlayerMarket.js";
import { isWcPredictionsRoundupQuestion } from "./wcPredictionsRoundup.js";
import { adjustGoldenBootOdds, formatAdjustedGoldenBootForPrompt } from "./wcGoldenBootAdjusted.js";
import { goldenBootRowsFromKv } from "./wcPlayerOddsFreshness.js";

/**
 * @param {string | null | undefined} wcIntent
 * @param {string} [question]
 */
export function shouldInjectAdjustedGoldenBoot(wcIntent, question = "") {
  const intent = String(wcIntent || "");
  if (intent === WC_INTENT.PREDICTIONS_ROUNDUP) return true;
  if (isWcPlayerMarketIntent(intent)) return true;
  if (
    intent === WC_INTENT.GOLDEN_BOOT ||
    intent === WC_INTENT.TOP_SCORER ||
    intent === WC_INTENT.TOP_GOALSCORERS_LIST
  ) {
    return true;
  }
  if (isWcPredictionsRoundupQuestion(question)) return true;
  return false;
}

/**
 * @param {{
 *   goldenBootKv?: object | null,
 *   playersKv?: object | null,
 *   tournamentSimResults?: object | null,
 *   maxRows?: number,
 * }} input
 */
export function buildAdjustedGoldenBootPromptBlock(input = {}) {
  const gbRows = goldenBootRowsFromKv(input.goldenBootKv, 20);
  if (!gbRows.length) return "";

  const adjusted = adjustGoldenBootOdds(gbRows, {
    teamStats: input.tournamentSimResults?.teamStats || {},
    playerRegistry: input.playersKv?.teams || {},
  });

  const block = formatAdjustedGoldenBootForPrompt(adjusted, input.maxRows ?? 10);
  if (!block) return "";

  return [
    block,
    "  TOP GOALSCORER RULE (binding): Pick Top goalscorer / Golden Boot from ranks 1–10 above unless Pass.",
    "  Never select primary creators (CM/DM) — FW/ST/RW/LW tier only. Cite adjustedOdds when claiming value.",
  ].join("\n");
}
