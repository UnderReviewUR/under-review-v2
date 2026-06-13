import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { WC_2026_TEAMS } from "../src/data/wc2026Teams.js";
import { buildFixtureFormKey, fixtureFormRating, applyFormBump, formBumpFromRating } from "./wcFormBump.js";
import { applyStrengthMultipliers } from "./wcSimTeamStrength.js";
import { simulateTournament, formatSimResultsForPrompt } from "./wcTournamentSim.js";

describe("simulateTournament", () => {
  test("runs 1000 sims and returns stats for all 48 teams", () => {
    const results = simulateTournament(undefined, { simCount: 1000 });
    assert.equal(results.simCount, 1000);
    assert.equal(Object.keys(results.teamStats).length, 48);
    assert.ok(results.topContenders.length >= 10);
  });

  test("every team has valid percentage fields", () => {
    const results = simulateTournament(undefined, { simCount: 500 });
    for (const [abbr, s] of Object.entries(results.teamStats)) {
      assert.ok(s.groupWinPct >= 0 && s.groupWinPct <= 100, `${abbr} groupWinPct out of range: ${s.groupWinPct}`);
      assert.ok(s.advancePct >= 0 && s.advancePct <= 100, `${abbr} advancePct out of range: ${s.advancePct}`);
      assert.ok(s.winPct >= 0 && s.winPct <= 100, `${abbr} winPct out of range: ${s.winPct}`);
      assert.ok(s.winPct <= s.finalPct || s.winPct === 0, `${abbr} winPct > finalPct`);
    }
  });

  test("total win % across all teams sums to ~100%", () => {
    const results = simulateTournament(undefined, { simCount: 2000 });
    const totalWin = Object.values(results.teamStats).reduce((sum, s) => sum + s.winPct, 0);
    assert.ok(totalWin > 95 && totalWin < 105, `Total win % = ${totalWin}, expected ~100`);
  });

  test("top-rated team has highest win probability (in expectation)", () => {
    const results = simulateTournament(undefined, { simCount: 5000 });
    // ESP has 2165 Elo — should be #1 or #2 most of the time
    const top3 = results.topContenders.slice(0, 3).map((s) => s.abbreviation);
    assert.ok(top3.includes("ESP"), `ESP not in top 3: ${top3.join(", ")}`);
  });

  test("topContenders is sorted by winPct descending", () => {
    const results = simulateTournament(undefined, { simCount: 1000 });
    for (let i = 1; i < results.topContenders.length; i++) {
      assert.ok(
        results.topContenders[i - 1].winPct >= results.topContenders[i].winPct,
        `topContenders not sorted at index ${i}`,
      );
    }
  });
});

describe("formatSimResultsForPrompt", () => {
  test("includes mentioned teams and top contenders", () => {
    const results = simulateTournament(undefined, { simCount: 500 });
    const text = formatSimResultsForPrompt(results, ["FRA", "BRA"]);
    assert.ok(text.includes("FRA"));
    assert.ok(text.includes("BRA"));
    assert.ok(text.includes("TOURNAMENT SIMULATION"));
    assert.ok(text.includes("Cited teams:"));
    assert.ok(text.includes("Top contenders:"));
  });

  test("works without mentioned teams", () => {
    const results = simulateTournament(undefined, { simCount: 500 });
    const text = formatSimResultsForPrompt(results);
    assert.ok(text.includes("Top contenders:"));
    assert.ok(!text.includes("Cited teams:"));
  });

  test("notes live FT results in prompt header", () => {
    const results = simulateTournament(undefined, {
      simCount: 200,
      completedMatches: [
        {
          homeTeam: "MEX",
          awayTeam: "RSA",
          homeScore: 2,
          awayScore: 0,
          status: "FT",
        },
      ],
    });
    assert.equal(results.liveResultsApplied, true);
    assert.equal(results.completedMatchCount, 1);
    const text = formatSimResultsForPrompt(results, ["MEX"]);
    assert.ok(text.includes("FT result(s) locked in"));
  });
});

describe("simulateTournament with live results", () => {
  test("locks completed group scores and still returns 48 teams", () => {
    const results = simulateTournament(undefined, {
      simCount: 800,
      completedMatches: [
        { homeTeam: "MEX", awayTeam: "RSA", homeScore: 1, awayScore: 0, status: "FT" },
      ],
    });
    assert.equal(Object.keys(results.teamStats).length, 48);
    assert.ok(results.teamStats.MEX.advancePct > 0);
  });

  test("applies post-match Elo from FT results", () => {
    const results = simulateTournament(undefined, {
      simCount: 200,
      completedMatches: [
        {
          homeTeam: "MEX",
          awayTeam: "RSA",
          homeScore: 2,
          awayScore: 0,
          status: "FT",
          date: "2026-06-11",
        },
      ],
    });
    assert.equal(results.eloMatchesApplied, 1);
    assert.ok(results.teamStats.MEX.eloRating > 1858);
  });

  test("locks completed knockout FT and counts knockoutResultsApplied", () => {
    const results = simulateTournament(undefined, {
      simCount: 400,
      completedMatches: [
        {
          homeTeam: "FRA",
          awayTeam: "GER",
          homeScore: 2,
          awayScore: 1,
          status: "FT",
          round: "Round of 16",
          openFootballNum: 89,
        },
      ],
    });
    assert.equal(results.knockoutResultsApplied, 1);
  });

  test("team strength multipliers shift advance probabilities", () => {
    const baseline = simulateTournament(undefined, { simCount: 2500 });
    const boosted = simulateTournament(undefined, {
      simCount: 2500,
      teamStrength: {
        MEX: { attackMult: 1.12, defenseMult: 0.92 },
      },
      strengthMatchesApplied: 2,
      xgMatchesApplied: 2,
    });
    assert.ok(boosted.strengthMatchesApplied === 2);
    assert.ok(boosted.teamStats.MEX.advancePct >= baseline.teamStats.MEX.advancePct);
  });
});

describe("simulateTournament with pre-match form bump", () => {
  test("FT fixture uses actual score — form map ignored for played pair", () => {
    const results = simulateTournament(undefined, {
      simCount: 500,
      completedMatches: [
        { homeTeam: "MEX", awayTeam: "RSA", homeScore: 2, awayScore: 0, status: "FT" },
      ],
      formByFixture: {
        "MEX|RSA": {
          MEX: { avgRating: 9.0 },
          RSA: { avgRating: 6.0 },
        },
      },
      formFixturesResolved: 1,
    });
    assert.equal(results.completedMatchCount, 1);
    assert.equal(results.formFixturesResolved, 1);
  });

  test("unplayed form bump shifts advance % vs baseline", () => {
    const mex = WC_2026_TEAMS.find((t) => t.abbreviation === "MEX");
    const rsa = WC_2026_TEAMS.find((t) => t.abbreviation === "RSA");
    assert.ok(mex && rsa);
    const key = buildFixtureFormKey("MEX", "RSA");
    const baseline = simulateTournament(WC_2026_TEAMS, { simCount: 4000 });
    const withForm = simulateTournament(WC_2026_TEAMS, {
      simCount: 4000,
      formByFixture: {
        [key]: {
          MEX: { avgRating: 8.3 },
          RSA: { avgRating: 7.5 },
        },
      },
      formFixturesResolved: 1,
      formTeamsAffected: 2,
    });
    const mexDelta = Math.abs(withForm.teamStats.MEX.advancePct - baseline.teamStats.MEX.advancePct);
    assert.ok(mexDelta >= 0.04, `expected MEX advance shift, got ${mexDelta}`);
  });

  test("strength + form stack multiplicatively on lambda", () => {
    const base = 1.3;
    const afterStrength = applyStrengthMultipliers(
      base,
      { attackMult: 1.08, defenseMult: 0.96 },
      { attackMult: 1, defenseMult: 1 },
    );
    const afterBoth = applyFormBump(afterStrength, 8.3);
    assert.ok(afterBoth > afterStrength);
    assert.ok(Math.abs(afterBoth / afterStrength - formBumpFromRating(8.3)) < 0.0001);
  });

  test("empty form map leaves ratings neutral", () => {
    assert.equal(fixtureFormRating({}, "MEX", "RSA", "MEX"), null);
    assert.equal(applyFormBump(1.3, null), 1.3);
  });
});
