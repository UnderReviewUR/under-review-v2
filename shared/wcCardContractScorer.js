/**
 * Score a golden WC card-contract case against structured delivery + QA.
 */

import { classifyWcQuestionIntent } from "./wcUrTakeIntent.js";
import { runWcUrTakeQA } from "../api/_wcUrTakeQA.js";
import { scoreWcCardContractVoice, scoreWcCardSentenceCompleteness } from "./wcCardContractVoice.js";
import {
  scoreWcFollowUpExplainContract,
} from "./wcCardContractFollowUpScorer.js";
import { shouldUseWcFixtureMatchupAltFollowUpPrebuilt } from "./wcFixtureMatchupPrebuilt.js";
import { shouldRunWcPlayerPropsFastPath } from "../api/ur-take/wcPlayerPropsFastPath.js";

/**
 * @param {{
 *   question: string,
 *   expectedIntent: string,
 *   history?: Array<unknown>,
 *   wcIntent?: string,
 *   routingExpect?: { matchupAltPrebuilt?: boolean, playerPropsFastPath?: boolean },
 *   mentionedTeams?: string[],
 *   hasKvFixture?: boolean,
 * }} opts
 */
export function scoreWcFollowUpRouting(opts) {
  const routingExpect = opts.routingExpect;
  if (!routingExpect) return { passed: true, issues: [], skipped: true };

  const question = String(opts.question || "");
  const history = Array.isArray(opts.history) ? opts.history : [];
  const wcIntent = opts.wcIntent || classifyWcQuestionIntent(question, history);
  const gateOpts = {
    isConversationFollowUp: history.length > 0,
    history,
    mentionedTeams: opts.mentionedTeams,
    hasKvFixture: opts.hasKvFixture !== false,
  };

  /** @type {string[]} */
  const issues = [];

  if (routingExpect.matchupAltPrebuilt != null) {
    const actual = shouldUseWcFixtureMatchupAltFollowUpPrebuilt(question, wcIntent, gateOpts);
    if (actual !== routingExpect.matchupAltPrebuilt) {
      issues.push(
        routingExpect.matchupAltPrebuilt
          ? "wc_routing_missing_matchup_alt_prebuilt"
          : "wc_routing_unexpected_matchup_alt_prebuilt",
      );
    }
  }

  if (routingExpect.playerPropsFastPath != null) {
    const actual = shouldRunWcPlayerPropsFastPath(
      wcIntent,
      question,
      history,
      history.length > 0,
    );
    if (actual !== routingExpect.playerPropsFastPath) {
      issues.push(
        routingExpect.playerPropsFastPath
          ? "wc_routing_missing_player_props_fast_path"
          : "wc_routing_unexpected_player_props_fast_path",
      );
    }
  }

  return { passed: issues.length === 0, issues, skipped: false };
}

/**
 * @param {{
 *   question: string,
 *   expectedIntent: string,
 *   structured: Record<string, unknown>,
 *   wcIntent?: string,
 *   outrightsAvailable?: boolean,
 *   responseText?: string,
 *   history?: Array<unknown>,
 *   followUpExpect?: import("./wcCardContractFollowUpScorer.js").WcFollowUpExpect,
 *   routingExpect?: { matchupAltPrebuilt?: boolean, playerPropsFastPath?: boolean },
 * }} opts
 */
/**
 * @param {string} question
 * @param {string} expectedIntent
 */
export function scoreWcCardContractIntent(question, expectedIntent, history = []) {
  const actual = classifyWcQuestionIntent(question, history);
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
  const history = Array.isArray(opts.history) ? opts.history : [];
  const intentActual = opts.wcIntent || classifyWcQuestionIntent(question, history);
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

  if (opts.followUpExpect && structured) {
    const followUp = scoreWcFollowUpExplainContract({
      question,
      structured,
      history,
      expect: opts.followUpExpect,
    });
    issueCodes.push(...followUp.issues);
  }

  if (opts.routingExpect) {
    const routing = scoreWcFollowUpRouting({
      question,
      expectedIntent,
      history,
      wcIntent: intentActual,
      routingExpect: opts.routingExpect,
    });
    issueCodes.push(...routing.issues);
  }

  const deduped = [...new Set(issueCodes)];
  const followUpOk = !deduped.some((c) => c.startsWith("wc_follow_up_"));
  const routingOk = !deduped.some((c) => c.startsWith("wc_routing_"));

  const voicePassed = !deduped.some(
    (c) =>
      c.startsWith("wc_card_") ||
      c === "headline_over_18_words" ||
      c === "missing_line_delta" ||
      c === "wc_play_line_invalid",
  );

  return {
    passed: intentOk && qa.passed && followUpOk && routingOk,
    issueCodes: deduped,
    intentOk,
    intentActual,
    qaPassed: qa.passed,
    voicePassed,
    followUpPassed: followUpOk,
    routingPassed: routingOk,
  };
}
