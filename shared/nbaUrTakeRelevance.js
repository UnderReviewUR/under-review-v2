/**
 * NBA UR Take — nbaRelevance log snapshot (instrumentation only).
 */

import { classifyNbaBoardGamePhase } from "../api/nba.js";
import { classifyNbaQuestionIntent, resolveRequiredNbaEntities } from "./nbaUrTakeIntent.js";
import { extractNbaTeamAbbrevsFromQuestion } from "../api/nba.js";

/**
 * @param {string | null | undefined} iso
 * @param {number} [nowMs]
 * @returns {number | null}
 */
export function nbaContextAgeMinutes(iso, nowMs = Date.now()) {
  if (!iso) return null;
  const ts = Date.parse(String(iso));
  if (!Number.isFinite(ts)) return null;
  return Math.round(Math.max(0, nowMs - ts) / 60000);
}

/**
 * @param {object | null | undefined} nbaContext
 * @returns {string | null}
 */
export function pickClientPropsFetchedAt(nbaContext) {
  const meta = nbaContext?.propsOddsMeta?.propsOddsFetchedAt;
  if (meta) return String(meta);
  const fresh = nbaContext?.propsOdds?.freshness?.fetchedAt;
  if (fresh) return String(fresh);
  return null;
}

/**
 * @param {object | null | undefined} nbaContext
 * @returns {boolean}
 */
export function nbaContextHasOutrightsBlock(nbaContext) {
  const rows = nbaContext?.outrights;
  return Array.isArray(rows) && rows.length > 0;
}

/**
 * Build the nbaRelevance object attached to ur_take_complete (no behavior changes).
 * @param {object} opts
 */
export function buildNbaRelevanceLog({
  question = "",
  history = [],
  nbaContext = null,
  nbaContextFromClient = null,
  mustFetchNbaBoard = null,
  serverBoardFetched = false,
  clientContextUsable = null,
  liveBoardRefreshForced = false,
  clientContextIgnored = false,
  outrightsInjected = null,
  seriesOutrightsStale = null,
  mvpOutrightsStale = null,
  seriesOutrightsAgeMinutes = null,
  mvpOutrightsAgeMinutes = null,
  finalsMode = null,
  finalsSeriesSummary = null,
  finalsGameNumber = null,
  finalsContextInjected = null,
  nbaMatchup = null,
  isConversationFollowUp = false,
  qaSummary = null,
  nowMs = Date.now(),
} = {}) {
  const nbaIntent = classifyNbaQuestionIntent(question, history);
  const mentionedTeams = extractNbaTeamAbbrevsFromQuestion(question);
  const requiredEntities = resolveRequiredNbaEntities(question, history, nbaIntent);

  const focusedGame = (nbaContext?.todaysGames || []).find((g) => {
    if (!nbaMatchup) return g?.state === "in" || g?.state === "pre";
    const away = String(g?.awayTeam?.abbr || "").toUpperCase();
    const home = String(g?.homeTeam?.abbr || "").toUpperCase();
    return (
      (away === nbaMatchup.awayAbbr && home === nbaMatchup.homeAbbr) ||
      (away === nbaMatchup.homeAbbr && home === nbaMatchup.awayAbbr)
    );
  });
  const focusedGamePhase = focusedGame ? classifyNbaBoardGamePhase(focusedGame) : null;

  const clientPropsFetchedAt = pickClientPropsFetchedAt(nbaContextFromClient);
  const clientPropsAgeMinutes = nbaContextAgeMinutes(clientPropsFetchedAt, nowMs);

  const playoffSeriesRows = Array.isArray(nbaContext?.playoffSeries)
    ? nbaContext.playoffSeries.length
    : 0;

  const qaPassed =
    qaSummary && typeof qaSummary.passedCriticalGates === "boolean"
      ? qaSummary.passedCriticalGates
      : null;

  return {
    nbaIntent,
    mentionedTeams,
    requiredEntities,
    forbiddenEntities: [],
    mustFetchNbaBoard: mustFetchNbaBoard ?? null,
    clientContextUsable: clientContextUsable ?? null,
    liveBoardRefreshForced: Boolean(liveBoardRefreshForced),
    clientContextIgnored: Boolean(clientContextIgnored),
    serverBoardFetched: Boolean(serverBoardFetched),
    clientPropsAgeMinutes,
    focusedGamePhase,
    focusedMatchupLabel: nbaMatchup?.label ?? null,
    isConversationFollowUp: Boolean(isConversationFollowUp),
    playoffSeriesRowsReturned: playoffSeriesRows,
    seriesSnapshotInjected: playoffSeriesRows > 0,
    outrightsInjected:
      outrightsInjected != null
        ? Boolean(outrightsInjected)
        : nbaContextHasOutrightsBlock(nbaContext) ||
          Boolean(nbaContext?.finalsOutrightsBlock),
    seriesOutrightsStale,
    mvpOutrightsStale,
    seriesOutrightsAgeMinutes,
    mvpOutrightsAgeMinutes,
    liveBoxscorePresent: Boolean(nbaContext?.liveBoxscore),
    propsStale: Boolean(nbaContext?.propsOddsStale),
    propsAgeMinutes: nbaContext?.propsOdds?.freshness?.ageMinutes ?? null,
    propsMaxAgeMinutes: nbaContext?.propsOdds?.freshness?.maxAgeMinutes ?? null,
    propsLiveFreshness: Boolean(nbaContext?.propsOdds?.isLive),
    gameTotalsPresent: Object.values(nbaContext?.gameTotals || {}).some(
      (r) => r && typeof r === "object" && r.total != null,
    ),
    gameTotalLine:
      (() => {
        const totals = nbaContext?.gameTotals;
        if (!totals || typeof totals !== "object") return null;
        for (const row of Object.values(totals)) {
          if (row?.total != null) return Number(row.total);
        }
        return null;
      })(),
    finalsMode:
      finalsMode != null
        ? Boolean(finalsMode)
        : Boolean(nbaContext?.finalsMode) ||
          Boolean(nbaContext?.finalsSeriesState?.isFinals),
    finalsSeriesSummary:
      finalsSeriesSummary ??
      nbaContext?.finalsSeriesState?.seriesScoreLabel ??
      nbaContext?.finalsSeriesState?.summaryOneLiner ??
      null,
    finalsGameNumber:
      finalsGameNumber ?? nbaContext?.finalsSeriesState?.gameNumber ?? null,
    finalsContextInjected:
      finalsContextInjected != null
        ? Boolean(finalsContextInjected)
        : Boolean(nbaContext?.finalsSeriesState),
    qaGroundingPass: qaPassed,
    qaEntityMatch: null,
    qaIntentMatch: null,
  };
}
