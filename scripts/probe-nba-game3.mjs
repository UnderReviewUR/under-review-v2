/**
 * Game 3 Finals probe — board + intent + decision mode per question (no Anthropic).
 * Usage: node scripts/probe-nba-game3.mjs
 */
import "dotenv/config";
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  classifyNbaQuestionIntent,
  NBA_INTENT,
  resolveRequiredNbaEntities,
} from "../shared/nbaUrTakeIntent.js";
import {
  getNbaFinalsSeriesState,
  resolveNbaFinalsUrTakeContext,
  overlayFinalsScheduledGame,
} from "../shared/nbaFinalsUtils.js";
import { classifyNbaBoardGamePhase } from "../shared/nbaBoardGamePhase.js";
import { resolveNbaVerdictFromQuestion } from "../shared/nbaUrTakeVerdict.js";
import {
  applyNbaMarketInvalidation,
  resolveNbaDecisionMode,
} from "../api/ur-take/nba/decisionAndInvalidation.js";
import { buildNbaNewsImpact } from "../api/nba.js";
import { detectNbaAvailabilityIntent } from "../api/ur-take/nba/decisionAndInvalidation.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

const GAME3_QUESTIONS = [
  {
    id: "g3_preview_edge",
    question: "Game 3 preview — who has the edge?",
    expectIntent: "PREGAME_MATCHUP",
  },
  {
    id: "g3_sharpest_angle",
    question:
      "NBA Finals Game 3 tonight (SAS @ NYK): sharpest angle — spread, total, or key prop?",
    expectIntent: "PREGAME_MATCHUP",
  },
  {
    id: "g3_elimination",
    question: "Knicks lead the series 2-0 — what's the Spurs elimination-game angle?",
    expectIntent: "PREGAME_MATCHUP",
  },
  {
    id: "g3_brunson_prop",
    question: "Best prop angle on Jalen Brunson tonight?",
    expectIntent: "PROP_PLAYER",
  },
  {
    id: "g3_wemby_availability",
    question: "Is Victor Wembanyama playing tonight?",
    expectIntent: "GENERAL",
  },
  {
    id: "g3_series_winner",
    question: "Who wins the series?",
    expectIntent: "SERIES_WINNER",
  },
  {
    id: "g3_mvp_misprice",
    question: "Finals MVP value on Wembanyama — is he mispriced at +220?",
    expectIntent: "FINALS_MVP",
  },
  {
    id: "g3_spread",
    question: "Who covers the spread in Game 3?",
    expectIntent: "PREGAME_MATCHUP",
  },
  {
    id: "g3_live_q2",
    question:
      "We're in Q2 of Knicks vs Spurs — what's the best live angle on Brunson points props right now?",
    expectIntent: "LIVE_IN_GAME",
    liveBoard: true,
  },
  {
    id: "g3_starters",
    question: "Who's starting for the Knicks tonight?",
    expectIntent: "GENERAL",
    expectStarters: true,
  },
  {
    id: "g3_h2h",
    question: "Spurs ATS record vs Knicks this season?",
    expectIntent: "GENERAL",
    expectH2h: true,
  },
];

function mockRes() {
  let payload = null;
  return {
    res: {
      setHeader() {},
      status() {
        return this;
      },
      json(p) {
        payload = p;
        return this;
      },
    },
    getPayload: () => payload,
  };
}

async function fetchBoard() {
  const { default: nbaHandler } = await import("../api/nba.js");
  const { res, getPayload } = mockRes();
  await nbaHandler({ method: "GET", query: { view: "board" }, headers: {} }, res);
  const board = getPayload();
  if (!board || typeof board !== "object") {
    throw new Error("board fetch returned empty payload");
  }
  return board;
}

function findFinalsGame(board) {
  const games = board.todaysGames || [];
  return (
    games.find((g) => {
      const a = String(g?.awayTeam?.abbr || "").toUpperCase();
      const h = String(g?.homeTeam?.abbr || "").toUpperCase();
      return (a === "SAS" && h === "NYK") || (a === "NYK" && h === "SAS");
    }) || null
  );
}

function summarizeBoard(board) {
  const finalsGame = findFinalsGame(board);
  const phase = finalsGame ? classifyNbaBoardGamePhase(finalsGame) : "not_on_slate";
  const series = (board.playoffSeries || []).find((s) => {
    const sa = String(s?.away || "").toUpperCase();
    const sh = String(s?.home || "").toUpperCase();
    return (sa === "SAS" && sh === "NYK") || (sa === "NYK" && sh === "SAS");
  });
  const spreads = board.spreads || {};
  const spreadKeys = Object.keys(spreads);
  const totalKeys = Object.keys(board.gameTotals || {});
  const propCount = (board.propLines || []).length;
  const propsOddsPlayers = (board.propsOdds?.players || []).length;
  const finalsProps = (board.propLines || []).filter((pl) => {
    const g = String(pl?.game || "").toUpperCase();
    return g.includes("SAS") || g.includes("NYK") || g.includes("SPUR") || g.includes("KNICK");
  });
  return {
    fetchedAt: board.fetchedAt,
    finalsOnSlate: Boolean(finalsGame),
    phase,
    series: series
      ? {
          away: series.away,
          home: series.home,
          awayWins: series.awayWins,
          homeWins: series.homeWins,
          gameNumberHint: series.gameNumberHint,
        }
      : null,
    h2hSplitsLen: (board.h2hSplits || []).length,
    startersByGameKeys: Object.keys(board.startersByGame || {}),
    spreadKeys: spreadKeys.slice(0, 5),
    totalKeys: totalKeys.slice(0, 5),
    propCount,
    propsOddsPlayerCount: propsOddsPlayers,
    propsOddsPosted: Boolean(board.propsOdds?.hasPostedLines),
    finalsPropCount: finalsProps.length,
    injuryCount: (board.injuries || []).length,
    statsCount: (board.playerStats || []).length,
    tonightMatchup: finalsGame
      ? `${finalsGame.awayTeam?.abbr} @ ${finalsGame.homeTeam?.abbr}`
      : null,
  };
}

function analyzeQuestion(question, board, { liveBoard = false } = {}) {
  const intent = classifyNbaQuestionIntent(question, []);
  const entities = resolveRequiredNbaEntities(question, [], intent);

  let workingBoard = board;
  if (liveBoard) {
    workingBoard = {
      ...board,
      todaysGames: [
        {
          state: "in",
          period: 2,
          clock: "5:12",
          status: "2nd Qtr",
          awayTeam: { abbr: "SAS", name: "San Antonio Spurs", score: 48 },
          homeTeam: { abbr: "NYK", name: "New York Knicks", score: 52 },
        },
      ],
      playoffSeries: board.playoffSeries?.length
        ? board.playoffSeries
        : [{ away: "SAS", home: "NYK", awayWins: 0, homeWins: 2, gameNumberHint: 3 }],
    };
  }

  const finalsGame = findFinalsGame(workingBoard) || {
    awayTeam: { abbr: "SAS" },
    homeTeam: { abbr: "NYK" },
    state: liveBoard ? "in" : "pre",
  };

  const seriesState = getNbaFinalsSeriesState({
    awayAbbr: "SAS",
    homeAbbr: "NYK",
    game: finalsGame,
    playoffSeries: workingBoard.playoffSeries || [],
  });
  const scheduled = overlayFinalsScheduledGame(seriesState);

  const finalsCtx = resolveNbaFinalsUrTakeContext({
    question,
    nbaMatchup: { awayAbbr: "SAS", homeAbbr: "NYK" },
    nbaContext: workingBoard,
    nbaIntent: intent,
  });

  const newsImpact = workingBoard.newsImpact || buildNbaNewsImpact(workingBoard);
  const invalidation = applyNbaMarketInvalidation({
    question,
    board: workingBoard,
    newsImpact,
  });
  const availabilityIntent = detectNbaAvailabilityIntent(question);
  const decisionMode = resolveNbaDecisionMode({
    sportHint: "nba",
    availabilityIntent,
    directPropAsk: invalidation.directPropAsk,
    invalidation,
  });

  const verdict = resolveNbaVerdictFromQuestion(question, {
    nbaRelevance: { nbaIntent: intent },
    structured: { lean: "probe" },
  });

  return {
    intent,
    entities,
    decisionMode,
    invalidation: {
      blocked: invalidation.blocked,
      blockedReason: invalidation.blockedReason,
      statusClass: invalidation.statusClass,
      targetedPlayer: invalidation.targetedPlayer,
      hasTargetPlayerMarket: invalidation.hasTargetPlayerMarket,
    },
    finalsMode: Boolean(finalsCtx?.finalsMode),
    seriesState: scheduled
      ? {
          gameNumber: scheduled.gameNumber,
          venueLabel: scheduled.venueLabel,
          tonightMatchupLabel: scheduled.tonightMatchupLabel,
          seriesScoreLabel: scheduled.seriesScoreLabel,
          eliminationNote: scheduled.eliminationNote,
        }
      : null,
    contextSnippet: (finalsCtx?.contextBlock || "").slice(0, 400),
    verdict,
  };
}

async function main() {
  const board = await fetchBoard();
  const boardSummary = summarizeBoard(board);

  const results = [];
  let pass = 0;
  let fail = 0;

  for (const q of GAME3_QUESTIONS) {
    const analysis = analyzeQuestion(q.question, board, { liveBoard: q.liveBoard });
    const intentOk = !q.expectIntent || analysis.intent === q.expectIntent;
    const gapOk =
      (!q.expectH2h || boardSummary.h2hSplitsLen > 0) &&
      (!q.expectStarters || boardSummary.startersByGameKeys.length > 0);

    const ok = intentOk && gapOk;
    if (ok) pass += 1;
    else fail += 1;

    results.push({
      id: q.id,
      question: q.question,
      ok,
      intentOk,
      expectedIntent: q.expectIntent,
      ...analysis,
      expectH2h: q.expectH2h || false,
      expectStarters: q.expectStarters || false,
    });
  }

  const report = {
    probedAt: new Date().toISOString(),
    boardSummary,
    summary: { total: GAME3_QUESTIONS.length, pass, fail },
    results,
  };

  const outPath = join(__dirname, "nba-game3-probe.json");
  writeFileSync(outPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");

  console.log(JSON.stringify({ boardSummary, summary: report.summary }, null, 2));
  for (const r of results) {
    const flag = r.ok ? "PASS" : "FAIL";
    console.log(
      `[${flag}] ${r.id}: intent=${r.intent} mode=${r.decisionMode} finals=${r.finalsMode} venue=${r.seriesState?.venueLabel || "?"}`,
    );
    if (!r.intentOk) {
      console.log(`       expected intent ${r.expectedIntent}, got ${r.intent}`);
    }
    if (r.invalidation.blocked) {
      console.log(`       blocked: ${r.invalidation.blockedReason} (${r.invalidation.targetedPlayer})`);
    }
  }
  console.error(`\n[probe-nba-game3] wrote ${outPath}`);
  process.exit(fail > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error("[probe-nba-game3] fatal:", err);
  process.exit(1);
});
