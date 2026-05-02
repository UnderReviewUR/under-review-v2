import test from "node:test";
import assert from "node:assert/strict";

import { buildNbaContextForModel, resolveNbaMatchupFromQuestion } from "./ur-take.js";

const LAL_OKC_Q = "who wins lakers vs thunder series";

test("resolveNbaMatchupFromQuestion: LAL+OKC from playoffSeries when not on todays slate (other game tonight)", () => {
  const ctx = {
    todaysGames: [{ awayTeam: { abbr: "LAL" }, homeTeam: { abbr: "HOU" } }],
    playoffSeries: [
      { away: "LAL", home: "OKC", homeWins: 2, awayWins: 1, round: "West" },
      { away: "LAL", home: "HOU", homeWins: 0, awayWins: 1, round: "West" },
    ],
  };
  const m = resolveNbaMatchupFromQuestion(LAL_OKC_Q, ctx);
  assert.deepEqual(
    {
      awayAbbr: m?.awayAbbr,
      homeAbbr: m?.homeAbbr,
      isSeriesOnly: m?.isSeriesOnly,
      label: m?.label,
    },
    {
      awayAbbr: "LAL",
      homeAbbr: "OKC",
      isSeriesOnly: true,
      label: "LAL at OKC",
    },
  );
});

test("resolveNbaMatchupFromQuestion: empty todaysGames still resolves from playoffSeries", () => {
  const ctx = {
    todaysGames: [],
    playoffSeries: [{ away: "LAL", home: "OKC", homeWins: 1, awayWins: 1 }],
  };
  const m = resolveNbaMatchupFromQuestion(LAL_OKC_Q, ctx);
  assert.equal(m?.awayAbbr, "LAL");
  assert.equal(m?.homeAbbr, "OKC");
  assert.equal(m?.isSeriesOnly, true);
});

test("buildNbaContextForModel narrows playoffSeries for isSeriesOnly matchup", () => {
  const ctx = {
    todaysGames: [],
    playoffSeries: [
      { away: "LAL", home: "OKC", homeWins: 2, awayWins: 1 },
      { away: "MEM", home: "DEN", homeWins: 0, awayWins: 1 },
    ],
    playerStats: [],
    injuries: [],
    rosterGrounding: { playersByTeamAbbrev: {} },
    propLines: [],
    gameTotals: {},
    bdlGrounding: {},
    bdlAvailability: {},
  };
  const matchup = resolveNbaMatchupFromQuestion(LAL_OKC_Q, ctx);
  assert.ok(matchup?.isSeriesOnly);
  const forModel = buildNbaContextForModel(ctx, matchup);
  assert.equal(forModel.playoffSeries.length, 1);
  assert.equal(String(forModel.playoffSeries[0].home).toUpperCase(), "OKC");
  assert.equal(String(forModel.playoffSeries[0].away).toUpperCase(), "LAL");
});
