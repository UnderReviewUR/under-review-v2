/**
 * NBA predictions roundup — deterministic QA + regeneration signal.
 */

import {
  detectNbaRoundupUnnamedMarketOdds,
  detectNbaSeriesChampionshipBleed,
  expectedNbaPredictionSlots,
  nbaPredictionsRoundupMissingSlots,
  parseNbaPredictionSlots,
  NBA_PREDICTIONS_ROUNDUP_QA_SUFFIX,
} from "../shared/nbaPredictionsRoundup.js";
import { NBA_INTENT } from "../shared/nbaUrTakeIntent.js";

export { NBA_PREDICTIONS_ROUNDUP_QA_SUFFIX };

/**
 * @param {{
 *   responseText?: string,
 *   question?: string,
 *   nbaIntent?: string,
 *   structured?: Record<string, unknown> | null,
 * }} opts
 */
export function runNbaPredictionsRoundupQA(opts = {}) {
  const nbaIntent = String(opts.nbaIntent || "");
  const question = String(opts.question || "");
  const body = String(opts.responseText || "").trim();
  /** @type {string[]} */
  const issueCodes = [];

  if (nbaIntent !== NBA_INTENT.PREDICTIONS_ROUNDUP) {
    return { passed: true, issueCodes, qaIntentMatch: true };
  }

  const slots =
    Array.isArray(opts.structured?.predictionSlots) && opts.structured.predictionSlots.length
      ? opts.structured.predictionSlots
      : parseNbaPredictionSlots(body);

  const missing = nbaPredictionsRoundupMissingSlots(question, slots);
  if (missing.length > 0) {
    issueCodes.push("nba_predictions_roundup_incomplete");
  }

  const seriesSlot = slots.find((s) => s.key === "seriesFavorites");
  if (seriesSlot && detectNbaSeriesChampionshipBleed(seriesSlot.value)) {
    issueCodes.push("nba_roundup_series_championship_bleed");
  }

  if (detectNbaRoundupUnnamedMarketOdds(slots)) {
    issueCodes.push("nba_roundup_unnamed_market_odds");
  }

  if (/\bexpected goals?\b/i.test(body)) {
    issueCodes.push("nba_invented_xg_claim");
  }

  const expected = expectedNbaPredictionSlots(question);
  return {
    passed: issueCodes.length === 0,
    issueCodes,
    qaIntentMatch: expected.length > 0,
    slotCount: slots.length,
    expectedSlotCount: expected.length,
  };
}

/**
 * @param {{ passed?: boolean, issueCodes?: string[] }} qaResult
 */
export function nbaPredictionsRoundupQaRequiresRegeneration(qaResult) {
  if (!qaResult || qaResult.passed) return false;
  return (qaResult.issueCodes || []).some((c) =>
    [
      "nba_predictions_roundup_incomplete",
      "nba_roundup_series_championship_bleed",
      "nba_roundup_unnamed_market_odds",
      "nba_invented_xg_claim",
    ].includes(c),
  );
}
