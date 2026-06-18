/**
 * World Cup match probability / chances questions — team totals, draw, live state.
 */

import { isWcLiveMatchStatus } from "./wcFeaturedMatch.js";

const PROBABILITY_CUE_RE =
  /\b(chances|likelihood|probability|what are the odds|odds of|how likely|percent chance|chance of)\b/i;

const MATCH_OUTCOME_RE =
  /\b(score|scoring|goals?|win|draw|tie|concede|winner|clean sheet|btts|both teams to score|ends?\s+in|level|equalizer|equaliser)\b/i;

const DRAW_PROBABILITY_RE =
  /\b(end(?:s|ing)?\s+in\s+a\s+draw|chance(?:s)?\s+of\s+(?:a\s+)?draw|%\s*chance\b.*\bdraw\b|\bdraw\b.*%\s*chance)\b/i;

const WIN_OR_DRAW_RE =
  /\b(most likely to win|likely to win|who(?:'s| is)\s+(?:going to|gonna)\s+win)\b.*\bdraw\b|\bdraw\b.*\b(most likely to win|likely to win)\b/i;

const LIVE_STATE_RE =
  /\b(\d+\s*[-–]\s*\d+|\d+(?:st|nd|rd|th)?\s+minute|\d+\s+mins?\s+left|minutes?\s+left|mins?\s+to\s+go|time\s+left)\b/i;

const TEAM_GOAL_THRESHOLD_RE =
  /\b(more than|over|at least|less than|under|exactly)\s+\d+\.?\d*\s*goals?\b/i;

/** @param {string} q */
function hasWcProbabilityCue(q) {
  return PROBABILITY_CUE_RE.test(q) || /%\s*chance\b/i.test(q);
}

/** @param {Record<string, unknown> | null | undefined} match */
function isWcLiveProbabilityMatchRow(match) {
  if (!match || typeof match !== "object") return false;
  if (isWcLiveMatchStatus(match.status)) return true;
  const hs = Number(match.homeScore);
  const as = Number(match.awayScore);
  return Number.isFinite(hs) && Number.isFinite(as);
}

/**
 * Team/match probability — "chances Ecuador scores 2+ vs Ivory Coast", live draw odds, etc.
 * @param {string} question
 */
export function isWcMatchProbabilityQuestion(question) {
  const q = String(question || "").trim();
  if (!q) return false;
  if (DRAW_PROBABILITY_RE.test(q) || WIN_OR_DRAW_RE.test(q)) return true;
  if (/\b(will|could|going to)\s+it\s+end\s+in\s+a\s+draw\b/i.test(q)) return true;
  if (!hasWcProbabilityCue(q)) return false;
  if (TEAM_GOAL_THRESHOLD_RE.test(q)) return true;
  if (LIVE_STATE_RE.test(q) && MATCH_OUTCOME_RE.test(q)) return true;
  if (MATCH_OUTCOME_RE.test(q) && /\b(vs\.?|versus|against)\b/i.test(q)) return true;
  if (/\b(gets?|concedes?|scores?)\s+(?:a\s+)?(?:winner|goal|equalizer|equaliser)\b/i.test(q)) {
    return true;
  }
  if (MATCH_OUTCOME_RE.test(q)) return true;
  return false;
}

/**
 * In-play probability anchored on score/minute (not pre-kickoff template).
 * @param {string} question
 * @param {{ isConversationFollowUp?: boolean, match?: Record<string, unknown> | null }} [opts]
 */
export function isWcLiveMatchProbabilityQuestion(question, opts = {}) {
  const q = String(question || "").trim();
  if (!q || !isWcMatchProbabilityQuestion(q)) return false;
  if (LIVE_STATE_RE.test(q)) return true;
  if (opts.isConversationFollowUp && isWcLiveProbabilityMatchRow(opts.match)) return true;
  return false;
}

/**
 * Infer live fixture row from prior UR Take structured cards in thread.
 * @param {object[]} history
 */
export function resolveWcLiveProbabilityMatchFromThread(history = []) {
  if (!Array.isArray(history)) return null;
  for (let i = history.length - 1; i >= 0; i -= 1) {
    const structured = history[i]?.structured;
    if (!structured || typeof structured !== "object") continue;
    const home = String(structured.fixtureHome || "").trim().toUpperCase();
    const away = String(structured.fixtureAway || "").trim().toUpperCase();
    if (!home || !away) continue;
    const text = `${structured.whyNow || ""} ${structured.lean || ""} ${structured.call || ""}`;
    const score = text.match(/(\d+)\s*[-–]\s*(\d+)/);
    if (structured.liveMode || score || /\blive\b/i.test(text)) {
      return {
        homeTeam: home,
        awayTeam: away,
        status: "1H",
        homeScore: score ? Number(score[1]) : 0,
        awayScore: score ? Number(score[2]) : 0,
      };
    }
  }
  return null;
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

const MATCHUP_LEAN_DRIFT_RE =
  /\b(pass on ml|both teams to advance|lean both teams|moneyline best bet)\b/i;

const TOTALS_LEAN_WITHOUT_DRAW_RE = /\b(under|over)\s+\d+(?:\.\d+)?\s*goals?\b/i;

const PROBABILITY_ANSWER_SIGNAL_RE =
  /\b(draw|%\s*chance|percent|probability|implied|odds imply|no draw|0%|~\d+(?:\.\d+)?%|\d+(?:\.\d+)?%\s*(?:chance|implied|probability)|chance of a draw)\b/i;

/** @param {string} text */
function scoreProbabilityAnswerSentence(text) {
  const t = String(text || "").trim();
  if (!t) return 0;
  let score = 0;
  if (/\d+(?:\.\d+)?%/.test(t)) score += 4;
  if (/\bdraw\b/i.test(t)) score += 3;
  if (/\bimplied|probability|chance|odds\b/i.test(t)) score += 2;
  if (/\bfinal|live|0-0|\d+\s*[-–]\s*\d+/.test(t)) score += 1;
  return score;
}

/**
 * True when lean still carries matchup boilerplate instead of a probability read.
 * @param {string} lean
 * @param {string} question
 */
export function isWcMatchProbabilityLeanDrift(lean, question) {
  const l = String(lean || "").trim();
  if (!isWcMatchProbabilityQuestion(question)) return false;
  if (!l) return true;
  if (MATCHUP_LEAN_DRIFT_RE.test(l)) return true;

  const asksDraw = DRAW_PROBABILITY_RE.test(question) || /\bdraw\b/i.test(question);
  if (asksDraw) {
    if (TOTALS_LEAN_WITHOUT_DRAW_RE.test(l) && !/\bdraw\b/i.test(l)) return true;
    if (!PROBABILITY_ANSWER_SIGNAL_RE.test(l)) return true;
    return false;
  }

  if (PROBABILITY_ANSWER_SIGNAL_RE.test(l) && !MATCHUP_LEAN_DRIFT_RE.test(l)) return false;
  if (TOTALS_LEAN_WITHOUT_DRAW_RE.test(l) && !PROBABILITY_ANSWER_SIGNAL_RE.test(l)) return true;
  return !PROBABILITY_ANSWER_SIGNAL_RE.test(l);
}

/**
 * @param {{ call?: string, line?: string, whyNow?: string }} fields
 */
export function wcMatchProbabilityAnswerFieldsHaveSignal(fields = {}) {
  return PROBABILITY_ANSWER_SIGNAL_RE.test(
    `${fields.call || ""} ${fields.line || ""} ${fields.whyNow || ""}`,
  );
}

/**
 * @param {string} text
 */
function formatWcMatchProbabilityLean(text) {
  const t = String(text || "").replace(/\s+/g, " ").trim();
  if (!t) return "";
  const lean = /^lean:/i.test(t) ? t : `Lean: ${t.replace(/^lean:\s*/i, "")}`;
  return lean.length > 500 ? `${lean.slice(0, 497)}...` : lean;
}

/**
 * Derive THE PLAY from probability fields when Claude answered in call/line/whyNow only.
 * @param {{ call?: string, line?: string, whyNow?: string, question?: string }} opts
 */
export function deriveWcMatchProbabilityLean(opts = {}) {
  const question = String(opts.question || "");
  const call = String(opts.call || "").trim();
  const line = String(opts.line || "").trim();
  const whyNow = String(opts.whyNow || "").trim();
  const sentences = whyNow.match(/[^.!?]+[.!?]+/g) || [];
  const candidates = [line, call, ...sentences.map((s) => s.trim())].filter(Boolean);
  const ranked = [...new Set(candidates)].sort(
    (a, b) => scoreProbabilityAnswerSentence(b) - scoreProbabilityAnswerSentence(a),
  );
  const best = ranked[0];
  if (!best || scoreProbabilityAnswerSentence(best) === 0) {
    const combo = [call, line].filter(Boolean).join(" — ");
    return PROBABILITY_ANSWER_SIGNAL_RE.test(combo) ? formatWcMatchProbabilityLean(combo) : "";
  }

  const asksDraw = DRAW_PROBABILITY_RE.test(question) || /\bdraw\b/i.test(question);
  if (asksDraw) {
    const drawHit =
      ranked.find((s) => /\bdraw\b/i.test(s) && /\d|%|implied|no draw|0%|impossible/i.test(s)) ||
      ranked.find((s) => /\bdraw\b/i.test(s)) ||
      best;
    return formatWcMatchProbabilityLean(drawHit);
  }

  return formatWcMatchProbabilityLean(best);
}
