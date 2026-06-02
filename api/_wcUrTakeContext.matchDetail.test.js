import assert from "node:assert/strict";
import test from "node:test";
import {
  formatWorldCupUrTakePromptBlock,
  selectFixturesForQuestion,
} from "./_wcUrTakeContext.js";

test("selectFixturesForQuestion picks two-team matchup", () => {
  const matches = [
    { id: "1", homeTeam: "MEX", awayTeam: "RSA", status: "NS", commenceTs: 1 },
    { id: "2", homeTeam: "USA", awayTeam: "PAR", status: "NS", commenceTs: 2 },
  ];
  const picked = selectFixturesForQuestion(matches, ["MEX", "RSA"]);
  assert.equal(picked.length, 1);
  assert.equal(picked[0].id, "1");
});

test("formatWorldCupUrTakePromptBlock includes MATCH INTEL and injury rule", () => {
  const block = formatWorldCupUrTakePromptBlock({
    tournament: "2026 FIFA World Cup",
    hosts: ["USA"],
    dateRange: "June 11 — July 19, 2026",
    groups: { A: [{ name: "Mexico", strengthTag: "Favorite" }] },
    live: [],
    results: [],
    upcoming: [],
    matchDetails: [
      {
        eventId: "760415",
        homeTeam: "MEX",
        awayTeam: "RSA",
        status: "NS",
        homeScore: null,
        awayScore: null,
        lineups: {
          home: { formation: "4-3-3", starters: [{ name: "Ochoa", jersey: "1" }], bench: [] },
          away: { formation: null, starters: [], bench: [] },
        },
        players: { home: [], away: [] },
        teamStats: { home: {}, away: {} },
        goals: [],
        injuries: [],
      },
    ],
  });
  assert.match(block, /MATCH INTEL \(event 760415\)/);
  assert.match(block, /INJURY \/ AVAILABILITY/);
  assert.match(block, /Do not invent player availability/);
});
