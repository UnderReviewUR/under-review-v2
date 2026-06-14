/**
 * World Cup match probability / chances questions — team totals, draw, live state.
 */

const PROBABILITY_CUE_RE =
  /\b(chances|likelihood|probability|what are the odds|odds of|how likely|percent chance|%\s*chance)\b/i;

const MATCH_OUTCOME_RE =
  /\b(score|scoring|goals?|win|draw|tie|concede|winner|clean sheet|btts|both teams to score|ends?\s+in|level|equalizer|equaliser)\b/i;

const LIVE_STATE_RE =
  /\b(\d+\s*[-–]\s*\d+|\d+(?:st|nd|rd|th)?\s+minute|\d+\s+mins?\s+left|minutes?\s+left|mins?\s+to\s+go|time\s+left)\b/i;

const TEAM_GOAL_THRESHOLD_RE =
  /\b(more than|over|at least|less than|under|exactly)\s+\d+\.?\d*\s*goals?\b/i;

/**
 * Team/match probability — "chances Ecuador scores 2+ vs Ivory Coast", live draw odds, etc.
 * @param {string} question
 */
export function isWcMatchProbabilityQuestion(question) {
  const q = String(question || "").trim();
  if (!q) return false;
  if (!PROBABILITY_CUE_RE.test(q)) return false;
  if (TEAM_GOAL_THRESHOLD_RE.test(q)) return true;
  if (LIVE_STATE_RE.test(q) && MATCH_OUTCOME_RE.test(q)) return true;
  if (MATCH_OUTCOME_RE.test(q) && /\b(vs\.?|versus|against)\b/i.test(q)) return true;
  if (/\b(gets?|concedes?|scores?)\s+(?:a\s+)?(?:winner|goal|equalizer|equaliser)\b/i.test(q)) {
    return true;
  }
  return false;
}

/**
 * In-play probability anchored on score/minute (not pre-kickoff template).
 * @param {string} question
 */
export function isWcLiveMatchProbabilityQuestion(question) {
  const q = String(question || "").trim();
  if (!q || !isWcMatchProbabilityQuestion(q)) return false;
  return LIVE_STATE_RE.test(q);
}

/**
 * Ranked parlay slate prompts — best/traps/top N player parlays today.
 * @param {string} question
 */
export function isWcPlayerParlaySlateQuestion(question) {
  const q = String(question || "").trim();
  if (!q) return false;
  if (!/\b(player parlays?|parlay props?)\b/i.test(q)) return false;
  return (
    /\b(today|tonight|slate|schedule|matches|remaining|world cup|this matchday)\b/i.test(q) ||
    /\b(best|rank|top|traps?|under.?the radar|no one|nobody|overlooked|sleeping on)\b/i.test(q)
  );
}

/**
 * Extract requested ranked parlay ticket count (e.g. rank 5 player parlays).
 * @param {string} question
 */
export function extractWcPlayerParlayRankCount(question) {
  const q = String(question || "").toLowerCase();
  const m =
    q.match(/\brank(?:\s+the)?\s+best\s+(\d+)\s+player\s+parlays?\b/) ||
    q.match(/\btop\s+(\d+)\s+player\s+parlays?\b/) ||
    q.match(/\b(\d+)\s+best\s+player\s+parlays?\b/);
  if (!m) return null;
  const n = Number.parseInt(m[1], 10);
  if (!Number.isFinite(n)) return null;
  return Math.min(8, Math.max(1, n));
}
