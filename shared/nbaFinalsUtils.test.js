import assert from "node:assert/strict";
import test from "node:test";
import { NBA_INTENT } from "./nbaUrTakeIntent.js";
import {
  buildNbaFinalsContextBlock,
  getNbaFinalsSeriesState,
  isNbaFinalsGame,
  isNbaFinalsQuestion,
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
    playoffSeries: [{ away: "SAS", home: "NYK", awayWins: 0, homeWins: 2 }],
  });
  const block = buildNbaFinalsContextBlock(state, NBA_INTENT.PREGAME_MATCHUP);
  assert.ok(block);
  assert.match(block, /NBA FINALS CONTEXT/);
  assert.match(block, /FINALS-SPECIFIC RULES/);
  assert.match(block, /clutch/i);
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
