/**
 * NBA UR Take — question intent classification (instrumentation / Phase 0+).
 * Used for nbaRelevance logging, session-memory pivots, and regression fixtures.
 */

import { extractNbaTeamAbbrevsFromQuestion } from "./nbaTeamFromQuestion.js";
import { isNbaPredictionsRoundupQuestion } from "./nbaPredictionsRoundup.js";
import { extractLatestUserTurnForRouting } from "./urTakeSportRouting.js";

/** @typedef {"PREGAME_MATCHUP"|"LIVE_IN_GAME"|"SERIES_WINNER"|"FINALS_MVP"|"PROP_PLAYER"|"CONTINUATION"|"GENERAL"|"PREDICTIONS_ROUNDUP"|"UNCLASSIFIED"} NbaUrTakeIntent */

export const NBA_INTENT = {
  PREGAME_MATCHUP: "PREGAME_MATCHUP",
  LIVE_IN_GAME: "LIVE_IN_GAME",
  SERIES_WINNER: "SERIES_WINNER",
  FINALS_MVP: "FINALS_MVP",
  PROP_PLAYER: "PROP_PLAYER",
  CONTINUATION: "CONTINUATION",
  /** Default catch-all when no specialized NBA pattern matches. */
  GENERAL: "GENERAL",
  PREDICTIONS_ROUNDUP: "PREDICTIONS_ROUNDUP",
  UNCLASSIFIED: "UNCLASSIFIED",
};

const SERIES_SIGNAL_RE =
  /\b(who wins the series|win the (series|finals)|wins the (nba )?finals|series winner|to win the (nba )?finals|championship odds|series price|series line|mispriced.{0,40}(series|finals))\b/i;

const MVP_SIGNAL_RE =
  /\b(finals mvp|mvp odds|mvp value|mvp mispriced|mispriced.{0,40}mvp)\b/i;

const LIVE_SIGNAL_RE =
  /\b(live|right now|q[1-4]\b|quarter|halftime|second half|clock|score is|we're in)\b/i;

const LIVE_IN_GAME_PHRASE_RE = /\bin[- ]game\b/i;

/** Pregame phrasing like "in Game 3" must not trip live intent. */
const PREGAME_GAME_NUMBER_RE = /\bin\s+game\s+\d+\b/i;

const PRICING_SIGNAL_RE = /\b(mispriced|fairly priced|fair price|overpriced|underpriced|value at)\b/i;

const PROP_SIGNAL_RE =
  /\b(prop|points|rebounds|assists|threes|pra|double[- ]double|line opens|under \d|over \d)\b/i;

const PLAYER_PROP_FOCUS_RE =
  /\b(prop\s+angle|player prop|best prop|prop lean|prop play)\b/i;

const AVAILABILITY_SIGNAL_RE =
  /\b(is|are|will|does)\b[\s\S]{0,80}\b(play|playing|active|available|out|inactive|starting|start|dress)\b/i;

const STARTERS_SIGNAL_RE =
  /\b(who(?:'s| is| are) starting|starting lineup|starters tonight|confirmed starters)\b/i;

const CONTINUATION_SIGNAL_RE =
  /\b(what about|tell me more|go deeper|that take|follow[- ]?up|same game|still live|score (just )?updated|update)\b/i;

function isLiveInGameQuestion(ql) {
  if (PREGAME_GAME_NUMBER_RE.test(ql)) return false;
  if (LIVE_SIGNAL_RE.test(ql)) return true;
  if (LIVE_IN_GAME_PHRASE_RE.test(ql)) return true;
  return false;
}

/**
 * @param {string} question
 * @param {object[]} [history]
 * @returns {NbaUrTakeIntent}
 */
export function classifyNbaQuestionIntent(question, history = []) {
  const q = extractLatestUserTurnForRouting(String(question || "").trim());
  const ql = q.toLowerCase();
  if (!q) return NBA_INTENT.UNCLASSIFIED;

  if (isNbaPredictionsRoundupQuestion(q)) return NBA_INTENT.PREDICTIONS_ROUNDUP;
  if (MVP_SIGNAL_RE.test(ql)) return NBA_INTENT.FINALS_MVP;
  if (SERIES_SIGNAL_RE.test(ql) || (PRICING_SIGNAL_RE.test(ql) && /\b(series|finals)\b/i.test(ql))) {
    return NBA_INTENT.SERIES_WINNER;
  }
  if (STARTERS_SIGNAL_RE.test(ql)) return NBA_INTENT.GENERAL;
  if (AVAILABILITY_SIGNAL_RE.test(ql) && !PROP_SIGNAL_RE.test(ql)) return NBA_INTENT.GENERAL;
  if (isLiveInGameQuestion(ql)) return NBA_INTENT.LIVE_IN_GAME;
  if (/\bwhat kills (this )?edge\b/i.test(ql)) return NBA_INTENT.LIVE_IN_GAME;
  if (
    PROP_SIGNAL_RE.test(ql) &&
    (PLAYER_PROP_FOCUS_RE.test(ql) || /\b(on|for)\s+[A-Z][a-z]/i.test(q)) &&
    !/\b(sharpest angle|spread|total|who covers)\b/i.test(ql)
  ) {
    return NBA_INTENT.PROP_PLAYER;
  }
  if (
    /\b(nba finals|finals game|game \d|tonight|sharpest angle)\b/i.test(ql) &&
    /\b(spread|total|prop|angle)\b/i.test(ql)
  ) {
    return NBA_INTENT.PREGAME_MATCHUP;
  }
  if (CONTINUATION_SIGNAL_RE.test(ql) && Array.isArray(history) && history.length > 0) {
    return NBA_INTENT.CONTINUATION;
  }
  if (PROP_SIGNAL_RE.test(ql)) return NBA_INTENT.PROP_PLAYER;
  if (/\b(spread|total|angle|tonight|game \d|finals)\b/i.test(ql)) {
    return NBA_INTENT.PREGAME_MATCHUP;
  }
  if (PRICING_SIGNAL_RE.test(ql)) return NBA_INTENT.SERIES_WINNER;

  return NBA_INTENT.GENERAL;
}

/**
 * @param {string} question
 * @param {object[]} [history]
 * @param {NbaUrTakeIntent} [intent]
 * @returns {string[]}
 */
export function resolveRequiredNbaEntities(question, history = [], intent = null) {
  const routingQ = extractLatestUserTurnForRouting(String(question || "").trim());
  const resolvedIntent = intent || classifyNbaQuestionIntent(routingQ, history);
  const mentioned = extractNbaTeamAbbrevsFromQuestion(routingQ);
  if (mentioned.length > 0) return mentioned;

  if (resolvedIntent === NBA_INTENT.FINALS_MVP) {
    if (/\bwembanyama\b/i.test(routingQ)) return ["SAS"];
    if (/\bbrunson\b/i.test(routingQ)) return ["NYK"];
  }

  return [];
}
