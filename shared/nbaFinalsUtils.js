/**
 * NBA Finals 2026 — series state, mode detection, UR Take context blocks.
 */

import { canonicalizeTeamAbbr } from "./gameLineSpread.js";
import { NBA_INTENT } from "./nbaUrTakeIntent.js";

export const NBA_2026_FINALS_TEAMS = new Set(["NYK", "SAS"]);

const FINALS_QUESTION_RE =
  /\b(nba finals|finals game|finals mvp|who wins the series|win the (nba )?finals|wins the (nba )?finals|finals series|game \d\b.*(preview|edge|finals))\b/i;

const NARRATIVE_HALLUCINATION_RULE =
  'Do not use "clutch", "legacy", "dynasty", or "all-time" framing unless a specific stat or fact in the JSON payload supports it — otherwise describe matchup and series facts only.';

/**
 * @param {Record<string, unknown> | null | undefined} game
 */
export function isNbaFinalsGame(game) {
  const away = canonicalizeTeamAbbr(game?.awayTeam?.abbr);
  const home = canonicalizeTeamAbbr(game?.homeTeam?.abbr);
  if (!away || !home) return false;
  return NBA_2026_FINALS_TEAMS.has(away) && NBA_2026_FINALS_TEAMS.has(home);
}

/** @deprecated — use isNbaFinalsGame */
export const isNba2026FinalsMatchupGame = isNbaFinalsGame;

/**
 * @param {string} question
 */
export function isNbaFinalsQuestion(question) {
  const q = String(question || "");
  if (!q.trim()) return false;
  if (FINALS_QUESTION_RE.test(q)) return true;
  const teams = [...NBA_2026_FINALS_TEAMS].filter((abbr) =>
    new RegExp(`\\b${abbr}\\b`, "i").test(q),
  );
  return teams.length >= 2 || /\b(knicks|spurs)\b/i.test(q);
}

/**
 * @param {Record<string, unknown> | null | undefined} game
 * @param {Array<{ away?: string, home?: string, awayWins?: number, homeWins?: number }>} playoffSeries
 */
export function getNbaSeriesGameNumberForGame(game, playoffSeries) {
  const away = String(game?.awayTeam?.abbr || "").toUpperCase();
  const home = String(game?.homeTeam?.abbr || "").toUpperCase();
  if (!away || !home || !Array.isArray(playoffSeries)) return 0;
  const row = playoffSeries.find((s) => {
    const sa = String(s?.away || "").toUpperCase();
    const sh = String(s?.home || "").toUpperCase();
    return (sa === away && sh === home) || (sa === home && sh === away);
  });
  if (!row) return 0;
  const sa = String(row?.away || "").toUpperCase();
  const sh = String(row?.home || "").toUpperCase();
  const awayWins = sa === away && sh === home ? Number(row?.awayWins || 0) : Number(row?.homeWins || 0);
  const homeWins = sa === away && sh === home ? Number(row?.homeWins || 0) : Number(row?.awayWins || 0);
  const played =
    (Number.isFinite(awayWins) ? awayWins : 0) + (Number.isFinite(homeWins) ? homeWins : 0);
  return played > 0 ? played + 1 : 0;
}

/**
 * @param {number} winsLeader
 * @param {number} winsTrailer
 * @param {string} leaderAbbr
 * @param {string} trailerAbbr
 */
function eliminationNote(winsLeader, winsTrailer, leaderAbbr, trailerAbbr) {
  if (winsLeader <= 2 && winsTrailer <= 2) return "Neither team faces elimination yet.";
  if (winsLeader === 3 && winsTrailer === 3) return "Next game eliminates the loser.";
  if (winsLeader >= 3 && winsTrailer <= 2 && winsLeader > winsTrailer) {
    return `${trailerAbbr} faces elimination with a loss tonight.`;
  }
  return null;
}

/**
 * @param {object} opts
 * @param {string} [opts.awayAbbr]
 * @param {string} [opts.homeAbbr]
 * @param {Record<string, unknown> | null} [opts.game]
 * @param {Array<Record<string, unknown>>} [opts.playoffSeries]
 * @param {Record<string, unknown> | null} [opts.focusedSeriesSnapshot]
 */
export function getNbaFinalsSeriesState({
  awayAbbr = "",
  homeAbbr = "",
  game = null,
  playoffSeries = [],
  focusedSeriesSnapshot = null,
} = {}) {
  const af = String(awayAbbr || game?.awayTeam?.abbr || "").toUpperCase();
  const hf = String(homeAbbr || game?.homeTeam?.abbr || "").toUpperCase();
  if (!af || !hf || !isNbaFinalsGame({ awayTeam: { abbr: af }, homeTeam: { abbr: hf } })) {
    return null;
  }

  let winsAway = 0;
  let winsHome = 0;
  let gameNumber = 0;
  let roundLabel = "NBA Finals";

  if (focusedSeriesSnapshot && typeof focusedSeriesSnapshot === "object") {
    winsAway = Number(focusedSeriesSnapshot.awayWinsInQuestionOrder) || 0;
    winsHome = Number(focusedSeriesSnapshot.homeWinsInQuestionOrder) || 0;
    gameNumber = Number(focusedSeriesSnapshot.nextGameNumber) || 0;
    if (focusedSeriesSnapshot.round) roundLabel = String(focusedSeriesSnapshot.round);
  } else {
    const row = (playoffSeries || []).find((s) => {
      const sa = String(s?.away || "").toUpperCase();
      const sh = String(s?.home || "").toUpperCase();
      return (sa === af && sh === hf) || (sa === hf && sh === af);
    });
    if (row) {
      const sa = String(row?.away || "").toUpperCase();
      const sh = String(row?.home || "").toUpperCase();
      if (sa === af && sh === hf) {
        winsAway = Number(row?.awayWins) || 0;
        winsHome = Number(row?.homeWins) || 0;
      } else {
        winsAway = Number(row?.homeWins) || 0;
        winsHome = Number(row?.awayWins) || 0;
      }
      if (row?.round) roundLabel = String(row.round);
    }
    gameNumber = getNbaSeriesGameNumberForGame(
      game || { awayTeam: { abbr: af }, homeTeam: { abbr: hf } },
      playoffSeries,
    );
  }

  const leaderAbbr =
    winsAway > winsHome ? af : winsHome > winsAway ? hf : null;
  const trailingAbbr =
    leaderAbbr === af ? hf : leaderAbbr === hf ? af : null;
  const leaderWins = Math.max(winsAway, winsHome);
  const trailerWins = Math.min(winsAway, winsHome);

  const teamNick = { NYK: "Knicks", SAS: "Spurs" };
  const leaderName = leaderAbbr ? teamNick[leaderAbbr] || leaderAbbr : null;
  const seriesScoreLabel =
    leaderAbbr == null
      ? `${teamNick[af] || af} and ${teamNick[hf] || hf} tied ${winsAway}-${winsHome}`
      : `${leaderName} lead${leaderWins === 1 ? "s" : ""} series ${leaderWins}-${trailerWins}`;

  const tonightAway = String(game?.awayTeam?.abbr || af).toUpperCase();
  const tonightHome = String(game?.homeTeam?.abbr || hf).toUpperCase();
  const homeCourtAbbr = tonightHome;

  let gameNumberLabel = gameNumber > 0 ? `Game ${gameNumber}` : "Next Finals game";
  const gameState = String(game?.state || "").toLowerCase();
  if (gameState === "in") gameNumberLabel = gameNumber > 0 ? `Game ${gameNumber} (live)` : "Live Finals game";

  const elimination =
    leaderAbbr && trailingAbbr
      ? eliminationNote(leaderWins, trailerWins, leaderAbbr, trailingAbbr)
      : null;

  return {
    isFinals: true,
    awayAbbr: af,
    homeAbbr: hf,
    awayWins: winsAway,
    homeWins: winsHome,
    leaderAbbr,
    trailingAbbr,
    seriesScoreLabel,
    gameNumber: gameNumber > 0 ? gameNumber : null,
    gameNumberLabel,
    homeCourtAbbr,
    tonightMatchupLabel: `${tonightAway} @ ${tonightHome}`,
    eliminationNote: elimination,
    roundLabel,
    summaryOneLiner:
      focusedSeriesSnapshot?.serverSummaryOneLiner ||
      (leaderAbbr
        ? `${seriesScoreLabel}${gameNumber > 0 ? ` — ${gameNumberLabel}` : ""}.`
        : `${seriesScoreLabel}.`),
  };
}

/**
 * Intent-specific Finals tone (WC-style appendix).
 * @param {string} nbaIntent
 */
export function buildNbaFinalsToneRules(nbaIntent) {
  const lines = [
    "FINALS TONE & GROUNDING:",
    NARRATIVE_HALLUCINATION_RULE,
  ];

  if (nbaIntent === NBA_INTENT.SERIES_WINNER) {
    lines.push(
      "- SERIES_WINNER: This is a best-of-7 championship price — cite NBA FINALS SERIES ODDS when fresh; never invent series prices.",
      '- When odds are fresh, you may use "mispriced" only with team + exact American price from the block above.',
      "- Weight home court remaining, rest, and verified injury rows — not narrative momentum alone.",
    );
  } else if (nbaIntent === NBA_INTENT.FINALS_MVP) {
    lines.push(
      "- FINALS_MVP: Cite NBA FINALS MVP ODDS when fresh; name + exact price required for any mispricing claim.",
      "- Tie MVP value to usage, two-way impact, and series script from payload — not reputation.",
    );
  } else if (nbaIntent === NBA_INTENT.LIVE_IN_GAME) {
    lines.push(
      "- LIVE_IN_GAME: Balanced, high-stakes tone — acknowledge series score before prop/spread leans.",
      "- Respect series momentum (2-0 vs 2-2 changes role-player and total reads) using board-verified wins only.",
      "- Props/totals: obey ODDS FRESHNESS and GAME TOTAL blocks; no fabricated live lines.",
    );
  } else {
    lines.push(
      "- MATCHUP: Balanced preview — open with series state, then spread/total/prop edge.",
      "- Respect series momentum; Game 1 pressure differs from elimination games — use game number from context.",
      "- Travel/rest: cross-country Finals legs matter for role-player minutes and pace — ground in injuries + recentGames only.",
    );
  }

  return lines.join("\n");
}

/**
 * @param {ReturnType<typeof getNbaFinalsSeriesState> | null} seriesState
 * @param {string} [nbaIntent]
 */
export function buildNbaFinalsContextBlock(seriesState, nbaIntent = NBA_INTENT.PREGAME_MATCHUP) {
  if (!seriesState?.isFinals) return null;

  const lines = [
    "NBA FINALS CONTEXT (board-verified — do not invent series score, game number, or home court):",
    `- Series: ${seriesState.seriesScoreLabel} (best-of-7 ${seriesState.roundLabel})`,
  ];

  if (seriesState.gameNumber != null) {
    lines.push(`- Game number: ${seriesState.gameNumberLabel}`);
  }
  if (seriesState.tonightMatchupLabel) {
    lines.push(`- Tonight's matchup: ${seriesState.tonightMatchupLabel} (home court: ${seriesState.homeCourtAbbr})`);
  }
  if (seriesState.eliminationNote) {
    lines.push(`- Elimination: ${seriesState.eliminationNote}`);
  }
  if (seriesState.summaryOneLiner) {
    lines.push(`- Board summary: ${seriesState.summaryOneLiner}`);
  }

  lines.push(
    "",
    "FINALS-SPECIFIC RULES:",
    "- Mirror series wins and game number exactly from this block and playoffSeries / focusedSeriesSnapshot in JSON.",
    "- Rest & travel: back-to-back or cross-time-zone legs can compress rotation — cite only when injuries or recentGames support it.",
    "- Back-to-back impact: role-player overs/unders and totals shift with pace — use gameTotals and posted props when present.",
    buildNbaFinalsToneRules(nbaIntent),
  );

  return `${lines.join("\n")}\n`;
}

/**
 * @param {object} opts
 * @param {Record<string, unknown> | null} [opts.nbaContext]
 * @param {{ awayAbbr?: string, homeAbbr?: string } | null} [opts.nbaMatchup]
 * @param {string} [opts.question]
 * @param {string} [opts.nbaIntent]
 */
export function resolveNbaFinalsUrTakeContext({
  nbaContext = null,
  nbaMatchup = null,
  question = "",
  nbaIntent = NBA_INTENT.UNCLASSIFIED,
} = {}) {
  const playoffSeries = Array.isArray(nbaContext?.playoffSeries) ? nbaContext.playoffSeries : [];
  const games = Array.isArray(nbaContext?.todaysGames) ? nbaContext.todaysGames : [];
  const awayM = String(nbaMatchup?.awayAbbr || "").toUpperCase();
  const homeM = String(nbaMatchup?.homeAbbr || "").toUpperCase();

  let focusedGame = null;
  if (awayM && homeM) {
    focusedGame =
      games.find((g) => {
        const a = String(g?.awayTeam?.abbr || "").toUpperCase();
        const h = String(g?.homeTeam?.abbr || "").toUpperCase();
        return (a === awayM && h === homeM) || (a === homeM && h === awayM);
      }) || null;
  }
  if (!focusedGame) {
    focusedGame =
      games.find((g) => isNbaFinalsGame(g) && String(g?.state || "").toLowerCase() === "in") ||
      games.find((g) => isNbaFinalsGame(g)) ||
      null;
  }

  const hasFinalsSeriesRow = playoffSeries.some((row) => {
    const sa = String(row?.away || "").toUpperCase();
    const sh = String(row?.home || "").toUpperCase();
    return NBA_2026_FINALS_TEAMS.has(sa) && NBA_2026_FINALS_TEAMS.has(sh);
  });

  const finalsMode =
    isNbaFinalsGame(focusedGame) ||
    isNbaFinalsQuestion(question) ||
    hasFinalsSeriesRow ||
    (awayM && homeM && NBA_2026_FINALS_TEAMS.has(awayM) && NBA_2026_FINALS_TEAMS.has(homeM));

  if (!finalsMode) {
    return {
      finalsMode: false,
      seriesState: null,
      contextBlock: null,
    };
  }

  const seriesState = getNbaFinalsSeriesState({
    awayAbbr: awayM || focusedGame?.awayTeam?.abbr,
    homeAbbr: homeM || focusedGame?.homeTeam?.abbr,
    game: focusedGame,
    playoffSeries,
    focusedSeriesSnapshot: nbaContext?.focusedSeriesSnapshot ?? null,
  });

  const contextBlock = buildNbaFinalsContextBlock(seriesState, nbaIntent);

  return {
    finalsMode: true,
    seriesState,
    contextBlock,
  };
}
