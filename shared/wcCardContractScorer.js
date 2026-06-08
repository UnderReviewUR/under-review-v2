/**
 * Score a golden WC card-contract case against structured delivery + QA.
 */

import { classifyWcQuestionIntent } from "./wcUrTakeIntent.js";
import { runWcUrTakeQA } from "../api/_wcUrTakeQA.js";
import { scoreWcCardContractVoice, scoreWcCardSentenceCompleteness } from "./wcCardContractVoice.js";

/**
 * @param {{
 *   question: string,
 *   expectedIntent: string,
 *   structured: Record<string, unknown>,
 *   wcIntent?: string,
 *   outrightsAvailable?: boolean,
 *   responseText?: string,
 * }} opts
 */
/**
 * @param {string} question
 * @param {string} expectedIntent
 */
export function scoreWcCardContractIntent(question, expectedIntent) {
  const actual = classifyWcQuestionIntent(question);
  return {
    passed: actual === expectedIntent,
    actual,
    expected: expectedIntent,
  };
}

/**
 * @param {Record<string, unknown> | null | undefined} structured
 */
export function scoreWcCardContractLayout(structured) {
  return scoreWcCardSentenceCompleteness(structured);
}

export { scoreWcCardContractVoice };

export function scoreWcCardContractCase(opts) {
  const question = String(opts.question || "");
  const expectedIntent = String(opts.expectedIntent || "");
  const structured = opts.structured;
  const intentActual = opts.wcIntent || classifyWcQuestionIntent(question);
  const intentOk = intentActual === expectedIntent;

  const responseText =
    String(opts.responseText || "").trim() ||
    [structured?.call, structured?.lean, structured?.whyNow, structured?.edge]
      .filter(Boolean)
      .join("\n");

  const qa = runWcUrTakeQA({
    responseText,
    structured,
    question,
    wcIntent: intentActual,
    outrightsAvailable: Boolean(opts.outrightsAvailable),
  });

  /** @type {string[]} */
  const issueCodes = [...(qa.issueCodes || [])];
  if (!intentOk) issueCodes.unshift("intent_mismatch");

  const voicePassed = !issueCodes.some(
    (c) =>
      c.startsWith("wc_card_") ||
      c === "headline_over_18_words" ||
      c === "missing_line_delta" ||
      c === "wc_play_line_invalid",
  );

  return {
    passed: intentOk && qa.passed,
    issueCodes,
    intentOk,
    intentActual,
    qaPassed: qa.passed,
    voicePassed,
  };
}
