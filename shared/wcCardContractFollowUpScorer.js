/**
 * World Cup Card Contract — follow-up / explain thread scoring (Phase 1 golden gate).
 */

import { endsWithEllipsisTruncation } from "./wcSentenceBoundaries.js";
import { isWcTotalsExplainFollowUp } from "./wcMatchBettingPrompt.js";
import { extractPriorTotalsLeanFromHistory } from "./wcFixtureMatchupPrebuilt.js";
import { parseWcMatchGoalsOverUnder } from "./wcMatchupWinnerLine.js";
import { wcSentenceSimilarity } from "./wcTakeRetentionQA.js";

/** @typedef {{
 *   explainKind?: "totals"|"player_prop"|"parlay_leg"|"continuation"|null,
 *   priorTotalsSide?: "over"|"under"|null,
 *   priorTotalsLine?: number | null,
 *   requireDistinctWhy?: boolean,
 *   requireBreakdownExpanded?: boolean,
 *   forbidLeanFlip?: boolean,
 *   allowLeanFlip?: boolean,
 *   expectedCallType?: string,
 *   forbidCallTypes?: string[],
 * }} WcFollowUpExpect */

/**
 * @param {string} question
 */
export function isWcCardContractExplainFollowUp(question) {
  const q = String(question || "").trim();
  if (!q) return false;
  if (isWcTotalsExplainFollowUp(q)) return true;
  if (
    /\b(?:why|how come|explain|help me understand|walk me through|break down)\b/i.test(q) &&
    /\b(?:pick|leg\s*\d|#\d|second|third|fourth|fifth|that play|this prop|the parlay)\b/i.test(
      q,
    )
  ) {
    return true;
  }
  if (/\bwhy\s+(?:not|isn't|isnt)\b/i.test(q)) return true;
  if (/\bgo\s+deeper\b/i.test(q)) return true;
  return false;
}

/**
 * @param {Array<{ role?: string, structured?: Record<string, unknown>, content?: string }>} history
 * @param {{ callType?: string }} [opts]
 */
export function extractLastAssistantStructured(history, opts = {}) {
  if (!Array.isArray(history)) return null;
  const wantCallType = String(opts.callType || "").trim().toLowerCase();
  for (let i = history.length - 1; i >= 0; i -= 1) {
    const turn = history[i];
    if (turn?.role === "assistant" && turn.structured && typeof turn.structured === "object") {
      if (wantCallType) {
        const ct = String(turn.structured.callType || "").trim().toLowerCase();
        if (ct !== wantCallType) continue;
      }
      return turn.structured;
    }
  }
  return null;
}

/**
 * @param {string} lean
 * @returns {{ side: "over"|"under", line: number } | null}
 */
export function parseTotalsLeanFromText(lean) {
  const blob = String(lean || "").trim();
  if (!blob) return null;
  const parsed = parseWcMatchGoalsOverUnder(blob);
  if (!parsed?.side || parsed.line == null) return null;
  const side = String(parsed.side).toLowerCase();
  if (side !== "over" && side !== "under") return null;
  return { side, line: Number(parsed.line) };
}

/**
 * @param {Record<string, unknown> | null | undefined} structured
 */
export function scoreWcCardFaceNoEllipsis(structured) {
  /** @type {string[]} */
  const issues = [];
  for (const field of ["call", "whyNow", "edge", "lean"]) {
    const val = String(structured?.[field] || "").trim();
    if (val && endsWithEllipsisTruncation(val)) {
      issues.push(`wc_follow_up_face_ellipsis_${field}`);
    }
  }
  return { passed: issues.length === 0, issues };
}

/**
 * Score explain follow-up delivery against prior assistant turn.
 * @param {{
 *   question: string,
 *   structured: Record<string, unknown> | null | undefined,
 *   history?: Array<unknown>,
 *   expect?: WcFollowUpExpect,
 * }} opts
 */
export function scoreWcFollowUpExplainContract(opts) {
  const question = String(opts.question || "").trim();
  const structured = opts.structured || {};
  const expect = opts.expect || {};
  const history = Array.isArray(opts.history) ? opts.history : [];
  const prior = extractLastAssistantStructured(history);
  const explainKind = expect.explainKind;
  const priorForWhy =
    explainKind === "totals"
      ? extractLastAssistantStructured(history, { callType: "matchup" }) || prior
      : explainKind === "player_prop" || explainKind === "parlay_leg"
        ? extractLastAssistantStructured(history, { callType: "player_market_verified" }) ||
          prior
        : prior;

  /** @type {string[]} */
  const issues = [];

  const ellipsis = scoreWcCardFaceNoEllipsis(structured);
  issues.push(...ellipsis.issues);

  const expectedCallType = String(expect.expectedCallType || "").trim().toLowerCase();
  const actualCallType = String(structured.callType || "").trim().toLowerCase();
  if (expectedCallType && actualCallType && actualCallType !== expectedCallType) {
    issues.push("wc_follow_up_wrong_call_type");
  }
  for (const forbidden of expect.forbidCallTypes || []) {
    const f = String(forbidden || "").trim().toLowerCase();
    if (f && actualCallType === f) issues.push(`wc_follow_up_forbidden_call_type_${f}`);
  }

  const priorWhy = String(priorForWhy?.whyNow || "").trim();
  const nextWhy = String(structured.whyNow || "").trim();
  if (expect.requireDistinctWhy && priorWhy && nextWhy) {
    if (wcSentenceSimilarity(priorWhy, nextWhy) >= 0.72) {
      issues.push("wc_follow_up_why_repeats_prior");
    }
  }

  if (expect.requireBreakdownExpanded && !structured.breakdownDefaultExpanded) {
    issues.push("wc_follow_up_missing_breakdown_expanded");
  }

  const nextLean = String(structured.lean || "").trim();
  const nextTotals = parseTotalsLeanFromText(nextLean);
  const priorTotalsFromHistory = extractPriorTotalsLeanFromHistory(history);
  const priorLean = String(prior?.lean || "").trim();
  const priorTotalsImmediate = parseTotalsLeanFromText(priorLean);
  const priorTotals =
    explainKind === "totals" && priorTotalsFromHistory
      ? {
          side: priorTotalsFromHistory.kind,
          line: Number(priorTotalsFromHistory.line),
        }
      : priorTotalsImmediate;

  if (expect.forbidLeanFlip && priorTotals && nextTotals) {
    if (priorTotals.side !== nextTotals.side || priorTotals.line !== nextTotals.line) {
      issues.push("wc_follow_up_totals_lean_flipped");
    }
  }

  if (expect.allowLeanFlip && priorTotals && nextTotals) {
    if (priorTotals.side === nextTotals.side && priorTotals.line === nextTotals.line) {
      issues.push("wc_follow_up_totals_lean_not_flipped");
    }
  }

  if (expect.priorTotalsSide && nextTotals) {
    const want = String(expect.priorTotalsSide).toLowerCase();
    if (!expect.allowLeanFlip && nextTotals.side !== want) {
      issues.push("wc_follow_up_totals_side_mismatch");
    }
  }

  if (isWcCardContractExplainFollowUp(question) && !nextWhy) {
    issues.push("wc_follow_up_missing_why");
  }

  return {
    passed: issues.length === 0,
    issues,
    priorStructured: prior,
  };
}

/**
 * @param {{
 *   question: string,
 *   expectedIntent: string,
 *   history?: Array<unknown>,
 *   classifyIntent: (q: string, h?: Array<unknown>) => string,
 * }} opts
 */
export function scoreWcThreadIntent(opts) {
  const actual = opts.classifyIntent(opts.question, opts.history || []);
  return {
    passed: actual === opts.expectedIntent,
    actual,
    expected: opts.expectedIntent,
  };
}
