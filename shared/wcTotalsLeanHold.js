/**
 * Hold prior Over/Under lean on hypothetical totals follow-ups (no obliging flip).
 */

import { parseTotalsLeanFromText } from "./wcCardContractFollowUpScorer.js";
import {
  extractPriorTotalsLeanFromHistory,
  formatTotalsLeanHeadline,
} from "./wcFixtureMatchupPrebuilt.js";
import { isWcTotalsHoldPriorLeanFollowUp } from "./wcMatchBettingPrompt.js";
import { extractWcMatchupPlayHeadline } from "./wcMatchupWinnerLine.js";

/**
 * @param {Record<string, unknown> | null | undefined} structured
 * @param {string} question
 * @param {Array<unknown>} [history]
 */
export function repairWcTotalsHoldPriorLeanFollowUp(structured, question, history = []) {
  if (!structured || typeof structured !== "object") return structured;
  if (!isWcTotalsHoldPriorLeanFollowUp(question)) return structured;

  const prior = extractPriorTotalsLeanFromHistory(history);
  if (!prior?.line) return structured;

  const nextTotals = parseTotalsLeanFromText(
    String(structured.lean || structured.call || ""),
  );
  if (!nextTotals) return structured;

  const priorLine = Number(prior.line);
  const nextLine = Number(nextTotals.line);
  const sameSide = nextTotals.side === prior.kind;
  const sameLine =
    Number.isFinite(priorLine) &&
    Number.isFinite(nextLine) &&
    (priorLine === nextLine || Math.abs(priorLine - nextLine) < 0.01);
  if (sameSide && sameLine) return structured;

  const headline = formatTotalsLeanHeadline(prior.kind, prior.line);
  const playHeadline =
    extractWcMatchupPlayHeadline(headline) ||
    headline.replace(/^lean:\s*/i, "").trim();
  const out = { ...structured };
  const hadPassOnMl = /\bpass on ml\b/i.test(String(out.lean || ""));
  out.lean = hadPassOnMl ? `Pass on ML — ${headline}` : headline;
  out.call = playHeadline.slice(0, 100);
  return out;
}
