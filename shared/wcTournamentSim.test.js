import { describe, test } from "node:test";
import assert from "node:assert/strict";
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
});
