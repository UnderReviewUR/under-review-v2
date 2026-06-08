/**
 * Golden eval Anthropic fixture injection — handler runs full WC pipeline without live LLM.
 */

import { getGoldenEvalFixtureById } from "../shared/wcGoldenEval.fixtures.js";

/** @type {string | null} */
let activeEvalCaseId = null;

/**
 * @param {string | null} caseId
 */
export function setActiveGoldenEvalCase(caseId) {
  activeEvalCaseId = caseId ? String(caseId) : null;
}

export function isGoldenEvalMode() {
  return process.env.UR_TAKE_GOLDEN_EVAL === "1";
}

/**
 * @returns {import("../api/_anthropicRetry.js").fetchAnthropicMessages extends (...args: any) => Promise<infer R> ? R : never | null}
 */
export function resolveGoldenEvalAnthropicResponse() {
  if (!isGoldenEvalMode() || !activeEvalCaseId) return null;
  const row = getGoldenEvalFixtureById(activeEvalCaseId);
  if (!row?.anthropicPayload) return null;
  return {
    ok: true,
    status: 200,
    requestId: `golden-eval-${activeEvalCaseId}`,
    data: row.anthropicPayload,
    rateLimitedExhausted: false,
  };
}
