/**
 * World Cup Card Contract scorer — layout + intent checks on structured payloads.
 */

import { classifyWcQuestionIntent } from "./wcUrTakeIntent.js";
import { runWcUrTakeQA } from "../api/_wcUrTakeQA.js";

const RULES_BLEED_RE =
  /\b(extra time|penalty shootout|penalties|90.?minute|single elimination)\b/i;

/**
 * @param {string} text
 * @param {number} [maxWords]
 */
export function wcHeadlineWordCount(text, maxWords = 12) {
  const words = String(text || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  return { count: words.length, withinCap: words.length <= maxWords };
}

/**
 * @param {Record<string, unknown> | null | undefined} structured
 */
export function scoreWcCardContractLayout(structured) {
  const call = String(structured?.call || "").trim();
  const confidence = String(structured?.confidence || "").trim();
  const why = String(structured?.whyNow || "").trim();
  const edge = String(structured?.edge || "").trim();
  const lean = String(structured?.lean || "").trim();
  const callType = String(structured?.callType || "").toLowerCase();

  const headline = call && call !== "—" ? call : lean;
  const headlineCap = wcHeadlineWordCount(headline, 12);

  const issues = [];
  if (!headline || headline === "—") issues.push("missing_headline");
  if (!headlineCap.withinCap) issues.push("headline_over_12_words");
  if (!confidence) issues.push("missing_confidence");
  if (callType !== "rules" && !why) issues.push("missing_why");
  if (callType !== "rules" && !edge) issues.push("missing_watch_for_edge");
  if (!call || call === "—") issues.push("missing_line_call");

  return {
    passed: issues.length === 0,
    issues,
    headlineWordCount: headlineCap.count,
    hasConfidence: Boolean(confidence),
    hasWhy: Boolean(why),
    hasWatchFor: Boolean(edge),
    hasLine: Boolean(call && call !== "—"),
  };
}

/**
 * @param {string} question
 * @param {string} expectedIntent
 */
export function scoreWcCardContractIntent(question, expectedIntent) {
  const actual = classifyWcQuestionIntent(question);
  return {
    passed: actual === expectedIntent,
    expected: expectedIntent,
    actual,
  };
}

/**
 * @param {{
 *   question: string,
 *   expectedIntent: string,
 *   structured: Record<string, unknown>,
 *   wcIntent?: string,
 * }} opts
 */
export function scoreWcCardContractCase(opts) {
  const question = String(opts.question || "");
  const intent = scoreWcCardContractIntent(question, opts.expectedIntent);
  const layout = scoreWcCardContractLayout(opts.structured);
  const body = [
    opts.structured?.lean,
    opts.structured?.whyNow,
    opts.structured?.edge,
    opts.structured?.call,
  ]
    .filter(Boolean)
    .join("\n");

  const rulesBleed =
    opts.expectedIntent === "RULES"
      ? false
      : RULES_BLEED_RE.test(String(opts.structured?.lean || "")) &&
        !/\b(vs|advance|group|outright|prop|boot|scorer)\b/i.test(question);

  const qa = runWcUrTakeQA({
    responseText: body,
    structured: opts.structured,
    question,
    wcIntent: opts.wcIntent || intent.actual,
  });

  const issueCodes = [
    ...(intent.passed ? [] : ["intent_mismatch"]),
    ...layout.issues,
    ...(rulesBleed ? ["rules_bleed_headline"] : []),
    ...(qa.passed ? [] : qa.issueCodes || []),
  ];

  return {
    passed: issueCodes.length === 0,
    issueCodes,
    intent,
    layout,
    qaPassed: qa.passed,
  };
}
