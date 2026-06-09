import assert from "node:assert/strict";
import test from "node:test";
import { NBA_INTENT } from "./nbaUrTakeIntent.js";
import {
  buildNbaFinalsContextBlock,
  finalsHomeStretchGameNumbers,
  getNbaFinalsSeriesState,
  inferFinalsSeriesWinsFromH2h,
  isNbaFinalsGame,
  isNbaFinalsQuestion,
  parseFinalsSeriesWinsFromQuestion,
  reconcileFinalsSeriesState,
  resolveNextNbaFinalsScheduledGame,
  resolveNbaFinalsUrTakeContext,
} from "./nbaFinalsUtils.js";

test("isNbaFinalsGame — Knicks vs Spurs", () => {
  assert.equal(
    isNbaFinalsGame({ awayTeam: { abbr: "SAS" }, homeTeam: { abbr: "NYK" } }),
    true,
  );
  assert.equal(
    isNbaFinalsGame({ awayTeam: { abbr: "LAL" }, homeTeam: { abbr: "BOS" } }),
    false,
  );
});

test("isNbaFinalsQuestion — series and preview phrasing", () => {
  assert.equal(isNbaFinalsQuestion("Who wins the series?"), true);
  assert.equal(isNbaFinalsQuestion("Game 3 preview — who has the edge?"), true);
  assert.equal(isNbaFinalsQuestion("Lakers vs Celtics tonight"), false);
});

test("getNbaFinalsSeriesState — game 3 Knicks lead 2-1", () => {
  const state = getNbaFinalsSeriesState({
    awayAbbr: "SAS",
    homeAbbr: "NYK",
    playoffSeries: [{ away: "SAS", home: "NYK", awayWins: 1, homeWins: 2, round: "Finals" }],
    game: { awayTeam: { abbr: "SAS" }, homeTeam: { abbr: "NYK" }, state: "pre" },
  });
  assert.ok(state);
  assert.equal(state.gameNumber, 4);
  assert.match(state.seriesScoreLabel, /Knicks lead/i);
  assert.match(state.seriesScoreLabel, /2-1/);
});

test("buildNbaFinalsContextBlock — injects series and tone rules", () => {
  const state = getNbaFinalsSeriesState({
    awayAbbr: "SAS",
    homeAbbr: "NYK",
    playoffSeries: [
      { away: "SAS", home: "NYK", awayWins: 0, homeWins: 2, gameNumberHint: 3 },
    ],
  });
  const block = buildNbaFinalsContextBlock(state, NBA_INTENT.PREGAME_MATCHUP);
  assert.ok(block);
  assert.match(block, /NBA FINALS CONTEXT/);
  assert.match(block, /FINALS-SPECIFIC RULES/);
  assert.match(block, /clutch/i);
  assert.match(block, /Knicks lead/i);
  assert.match(block, /2-0/);
  assert.doesNotMatch(block, /June 5, 2026/);
});

test("finalsHomeStretchGameNumbers — consecutive homestand only (not later return)", () => {
  assert.deepEqual(finalsHomeStretchGameNumbers(3, "NYK"), [3, 4]);
  assert.deepEqual(finalsHomeStretchGameNumbers(6, "NYK"), [6]);
  assert.deepEqual(finalsHomeStretchGameNumbers(1, "SAS"), [1, 2]);
  assert.deepEqual(finalsHomeStretchGameNumbers(5, "SAS"), [5]);
  assert.deepEqual(finalsHomeStretchGameNumbers(7, "SAS"), [7]);
});

test("resolveNextNbaFinalsScheduledGame — full best-of-7 schedule through Game 7", () => {
  const g5 = resolveNextNbaFinalsScheduledGame(Date.parse("2026-06-12T12:00:00.000Z"));
  assert.equal(g5?.gameNumber, 5);
  const g7 = resolveNextNbaFinalsScheduledGame(Date.parse("2026-06-18T12:00:00.000Z"));
  assert.equal(g7?.gameNumber, 7);
});

test("parseFinalsSeriesWinsFromQuestion — Knicks lead 2-0", () => {
  const w = parseFinalsSeriesWinsFromQuestion(
    "NBA Finals Game 3 (SAS @ NYK): Knicks lead the series 2-0. Sharpest angle?",
  );
  assert.deepEqual(w, { NYK: 2, SAS: 0 });
});

test("reconcileFinalsSeriesState — overrides stale board 0-0 from question", () => {
  const stale = getNbaFinalsSeriesState({
    awayAbbr: "SAS",
    homeAbbr: "NYK",
    playoffSeries: [{ away: "SAS", home: "NYK", awayWins: 0, homeWins: 0, gameNumberHint: 3 }],
  });
  const fixed = reconcileFinalsSeriesState(
    stale,
    "Knicks lead the series 2-0 heading into Game 3",
  );
  assert.match(fixed.seriesScoreLabel, /Knicks lead/i);
  assert.match(fixed.seriesScoreLabel, /2-0/);
});

test("reconcileFinalsSeriesState — infers 2-0 from playoff series status without question", () => {
  const stale = getNbaFinalsSeriesState({
    awayAbbr: "SAS",
    homeAbbr: "NYK",
    playoffSeries: [
      {
        away: "SAS",
        home: "NYK",
        awayWins: 0,
        homeWins: 0,
        gameNumberHint: 3,
        status: "NY leads series 2-0",
      },
    ],
  });
  const playoffSeries = [
    {
      away: "SAS",
      home: "NYK",
      awayWins: 0,
      homeWins: 0,
      gameNumberHint: 3,
      status: "NY leads series 2-0",
    },
  ];
  const fixed = reconcileFinalsSeriesState(stale, "provide 3 leg player parlay for nba game tonight", {
    playoffSeries,
  });
  assert.match(fixed.seriesScoreLabel, /Knicks lead/i);
  assert.match(fixed.seriesScoreLabel, /2-0/);
});

test("reconcileFinalsSeriesState — infers 2-0 from h2h playoff meetings", () => {
  const stale = getNbaFinalsSeriesState({
    awayAbbr: "SAS",
    homeAbbr: "NYK",
    playoffSeries: [{ away: "SAS", home: "NYK", awayWins: 0, homeWins: 0, gameNumberHint: 3 }],
  });
  const h2h = inferFinalsSeriesWinsFromH2h(
    [
      {
        awayAbbr: "SAS",
        homeAbbr: "NYK",
        meetings: [
          { scope: "playoffs", awayAbbr: "NYK", homeAbbr: "SAS", awayScore: 110, homeScore: 98 },
          { scope: "playoffs", awayAbbr: "NYK", homeAbbr: "SAS", awayScore: 105, homeScore: 99 },
        ],
      },
    ],
    "SAS",
    "NYK",
  );
  assert.deepEqual(h2h, { NYK: 2, SAS: 0 });
  const fixed = reconcileFinalsSeriesState(stale, "parlay for nba tonight", {
    h2hSplits: [
      {
        awayAbbr: "SAS",
        homeAbbr: "NYK",
        meetings: [
          { scope: "playoffs", awayAbbr: "NYK", homeAbbr: "SAS", awayScore: 110, homeScore: 98 },
          { scope: "playoffs", awayAbbr: "NYK", homeAbbr: "SAS", awayScore: 105, homeScore: 99 },
        ],
      },
    ],
  });
  assert.match(fixed.seriesScoreLabel, /Knicks lead/i);
  assert.match(fixed.seriesScoreLabel, /2-0/);
});

test("resolveNbaFinalsUrTakeContext — finalsMode for Game 3 preview", () => {
  const ctx = resolveNbaFinalsUrTakeContext({
    question: "Game 3 preview — who has the edge?",
    nbaMatchup: { awayAbbr: "SAS", homeAbbr: "NYK" },
    nbaContext: {
      playoffSeries: [{ away: "SAS", home: "NYK", awayWins: 1, homeWins: 1 }],
      todaysGames: [{ awayTeam: { abbr: "SAS" }, homeTeam: { abbr: "NYK" }, state: "pre" }],
    },
    nbaIntent: NBA_INTENT.PREGAME_MATCHUP,
  });
  assert.equal(ctx.finalsMode, true);
  assert.ok(ctx.contextBlock);
  assert.equal(ctx.seriesState?.gameNumber, 3);
});
