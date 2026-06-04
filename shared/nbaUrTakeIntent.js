/**
 * NBA UR Take — question intent classification (instrumentation / Phase 0+).
 * No prompt behavior changes; used for nbaRelevance logging and regression fixtures.
 */

import { extractNbaTeamAbbrevsFromQuestion } from "../api/nba.js";

/** @typedef {"PREGAME_MATCHUP"|"LIVE_IN_GAME"|"SERIES_WINNER"|"FINALS_MVP"|"PROP_PLAYER"|"CONTINUATION"|"UNCLASSIFIED"} NbaUrTakeIntent */

export const NBA_INTENT = {
  PREGAME_MATCHUP: "PREGAME_MATCHUP",
  LIVE_IN_GAME: "LIVE_IN_GAME",
  SERIES_WINNER: "SERIES_WINNER",
  FINALS_MVP: "FINALS_MVP",
  PROP_PLAYER: "PROP_PLAYER",
  CONTINUATION: "CONTINUATION",
  UNCLASSIFIED: "UNCLASSIFIED",
};

const SERIES_SIGNAL_RE =
  /\b(who wins the series|win the (series|finals)|wins the (nba )?finals|series winner|to win the (nba )?finals|championship odds|series price|series line|mispriced.{0,40}(series|finals))\b/i;

const MVP_SIGNAL_RE =
  /\b(finals mvp|mvp odds|mvp value|mvp mispriced|mispriced.{0,40}mvp)\b/i;

const LIVE_SIGNAL_RE =
  /\b(live|in[- ]game|right now|q[1-4]\b|quarter|halftime|second half|clock|score is|we're in)\b/i;

const PRICING_SIGNAL_RE = /\b(mispriced|fairly priced|fair price|overpriced|underpriced|value at)\b/i;

const PROP_SIGNAL_RE =
  /\b(prop|points|rebounds|assists|threes|pra|double[- ]double|line opens|under \d|over \d)\b/i;

const CONTINUATION_SIGNAL_RE =
  /\b(what about|tell me more|go deeper|that take|follow[- ]?up|same game|still live|score (just )?updated|update)\b/i;

/**
 * @param {string} question
 * @param {object[]} [history]
 * @returns {NbaUrTakeIntent}
 */
export function classifyNbaQuestionIntent(question, history = []) {
  const q = String(question || "").trim();
  const ql = q.toLowerCase();
  if (!q) return NBA_INTENT.UNCLASSIFIED;

  if (MVP_SIGNAL_RE.test(ql)) return NBA_INTENT.FINALS_MVP;
  if (SERIES_SIGNAL_RE.test(ql) || (PRICING_SIGNAL_RE.test(ql) && /\b(series|finals)\b/i.test(ql))) {
    return NBA_INTENT.SERIES_WINNER;
  }
  if (LIVE_SIGNAL_RE.test(ql)) return NBA_INTENT.LIVE_IN_GAME;
  if (/\bwhat kills (this )?edge\b/i.test(ql)) return NBA_INTENT.LIVE_IN_GAME;
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

  return NBA_INTENT.UNCLASSIFIED;
}

/**
 * @param {string} question
 * @param {object[]} [history]
 * @param {NbaUrTakeIntent} [intent]
 * @returns {string[]}
 */
export function resolveRequiredNbaEntities(question, history = [], intent = null) {
  const resolvedIntent = intent || classifyNbaQuestionIntent(question, history);
  const mentioned = extractNbaTeamAbbrevsFromQuestion(question);
  if (mentioned.length > 0) return mentioned;

  if (resolvedIntent === NBA_INTENT.FINALS_MVP) {
    if (/\bwembanyama\b/i.test(question)) return ["SAS"];
    if (/\bbrunson\b/i.test(question)) return ["NYK"];
  }

  return [];
}
