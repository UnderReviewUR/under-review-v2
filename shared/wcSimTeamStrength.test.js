import { test } from "node:test";
import assert from "node:assert/strict";
import {
  applyStrengthMultipliers,
  buildTeamStrengthMap,
  extractMatchTeamXgSignals,
} from "./wcSimTeamStrength.js";

test("extractMatchTeamXgSignals — BDL xG from detail", () => {
  const signals = extractMatchTeamXgSignals(
    { homeTeam: "MEX", awayTeam: "RSA", homeScore: 2, awayScore: 0, status: "FT" },
    { bdlGoat: { xgSummary: { home: 2.1, away: 0.6, homeShots: 14, awayShots: 5 } } },
  );
  assert.equal(signals.MEX.xgFor, 2.1);
  assert.equal(signals.MEX.xgAgainst, 0.6);
  assert.equal(signals.MEX.source, "bdl_xg");
});

test("extractMatchTeamXgSignals — goals proxy fallback", () => {
  const signals = extractMatchTeamXgSignals(
    { homeTeam: "USA", awayTeam: "PAR", homeScore: 4, awayScore: 1, status: "FT" },
    null,
  );
  assert.ok(signals.USA.xgFor > signals.USA.xgAgainst);
  assert.equal(signals.USA.source, "goals_proxy");
});

test("buildTeamStrengthMap — strong xG bumps attack multiplier", () => {
  const { teamStrength } = buildTeamStrengthMap(
    [
      {
        id: "m1",
        homeTeam: "MEX",
        awayTeam: "RSA",
        homeScore: 2,
        awayScore: 0,
        status: "FT",
        date: "2026-06-11",
      },
    ],
    {
      m1: { bdlGoat: { xgSummary: { home: 2.4, away: 0.4 } } },
    },
  );
  assert.ok(teamStrength.MEX.attackMult > 1);
  assert.ok(teamStrength.MEX.attackMult <= 1.12);
  assert.ok(teamStrength.RSA.defenseMult >= 0.88);
});

test("applyStrengthMultipliers — attack up vs weak defense", () => {
  const out = applyStrengthMultipliers(
    1.3,
    { attackMult: 1.1, defenseMult: 1 },
    { attackMult: 1, defenseMult: 0.95 },
  );
  assert.ok(out > 1.3);
});

test("buildTeamStrengthMap — clamps extreme rolling samples", () => {
  const matches = [
    {
      id: "a",
      homeTeam: "BRA",
      awayTeam: "HAI",
      homeScore: 5,
      awayScore: 0,
      status: "FT",
      date: "2026-06-12",
    },
    {
      id: "b",
      homeTeam: "BRA",
      awayTeam: "MAR",
      homeScore: 4,
      awayScore: 0,
      status: "FT",
      date: "2026-06-18",
    },
  ];
  const details = {
    a: { bdlGoat: { xgSummary: { home: 4.5, away: 0.2 } } },
    b: { bdlGoat: { xgSummary: { home: 3.8, away: 0.3 } } },
  };
  const { teamStrength } = buildTeamStrengthMap(matches, details);
  assert.ok(teamStrength.BRA.attackMult <= 1.12);
  assert.ok(teamStrength.BRA.attackMult >= 0.88);
});
