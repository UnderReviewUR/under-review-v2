import { test } from "node:test";
import assert from "node:assert/strict";
import {
  applyPostMatchEloToTeams,
  expectedEloScore,
  matchScoreForElo,
  updateEloPair,
} from "./wcEloUpdates.js";
import { WC_2026_TEAMS } from "../src/data/wc2026Teams.js";

test("expectedEloScore — equal teams ~0.5", () => {
  assert.ok(Math.abs(expectedEloScore(1800, 1800) - 0.5) < 0.001);
});

test("updateEloPair — favorite win increases Elo", () => {
  const { eloA, eloB } = updateEloPair(1900, 1600, 1);
  assert.ok(eloA > 1900);
  assert.ok(eloB < 1600);
});

test("matchScoreForElo — draw is 0.5", () => {
  assert.equal(matchScoreForElo(1, 1), 0.5);
});

test("applyPostMatchEloToTeams — Mexico 2-0 RSA bumps MEX Elo", () => {
  const baseMex = WC_2026_TEAMS.find((t) => t.abbreviation === "MEX");
  const out = applyPostMatchEloToTeams(WC_2026_TEAMS, [
    {
      homeTeam: "MEX",
      awayTeam: "RSA",
      homeScore: 2,
      awayScore: 0,
      status: "FT",
      date: "2026-06-11",
    },
  ]);
  const mex = out.teams.find((t) => t.abbreviation === "MEX");
  assert.equal(out.matchesApplied, 1);
  assert.ok(mex.eloRating > baseMex.eloRating);
});

test("applyPostMatchEloToTeams — processes matches chronologically", () => {
  const out = applyPostMatchEloToTeams(WC_2026_TEAMS, [
    {
      homeTeam: "MEX",
      awayTeam: "RSA",
      homeScore: 2,
      awayScore: 0,
      status: "FT",
      date: "2026-06-12",
    },
    {
      homeTeam: "MEX",
      awayTeam: "RSA",
      homeScore: 0,
      awayScore: 1,
      status: "FT",
      date: "2026-06-11",
    },
  ]);
  assert.equal(out.matchesApplied, 2);
});
