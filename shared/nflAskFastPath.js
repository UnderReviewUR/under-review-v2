/**
 * NFL UR Take fast lane — scoped matchup + player prop asks (target ~10s e2e).
 */
import { shouldSkipNflLiveBoardForAsk } from "./nflAskBoardPolicy.js";

/**
 * @param {string} question
 */
export function isNflScopedPropFastPath(question) {
  const q = String(question || "").trim();
  if (!q || shouldSkipNflLiveBoardForAsk(q)) return false;

  const lower = q.toLowerCase();
  const hasPropSignal =
    /\b(passing|rushing|receiving|receptions?|yards?|tds?|touchdowns?|sacks?|tackles?|completions?|attempts?|carries?|anytime|props?)\b/.test(
      lower,
    ) || /\b\d+(\.\d+)?\b/.test(lower);
  const hasMatchup = /\b[A-Z]{2,4}\s*@\s*[A-Z]{2,4}\b/.test(q);
  const hasBetVerb = /\b(over|under|fade|lean|take|pass|play|hammer|love|hate|spread|total|ml|moneyline|dog)\b/.test(
    lower,
  );
  return (hasMatchup && (hasPropSignal || hasBetVerb)) || (hasBetVerb && hasPropSignal);
}

export const NFL_UR_TAKE_FAST_MODEL_DEFAULT = "claude-haiku-4-5-20251001";
