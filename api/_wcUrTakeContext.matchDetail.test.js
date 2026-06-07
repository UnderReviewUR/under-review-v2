import assert from "node:assert/strict";
import test from "node:test";
import {
  formatWorldCupUrTakePromptBlock,
  selectFixturesForQuestion,
} from "./_wcUrTakeContext.js";

test("selectFixturesForQuestion pins wcEventId when present", () => {
  const matches = [
    { id: "760415", homeTeam: "MEX", awayTeam: "RSA", status: "NS", commenceTs: 1 },
    { id: "760416", homeTeam: "USA", awayTeam: "PAR", status: "NS", commenceTs: 2 },
  ];
  const picked = selectFixturesForQuestion(matches, [], "760416");
  assert.equal(picked.length, 1);
  assert.equal(picked[0].id, "760416");
});

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

test("formatWorldCupUrTakePromptBlock surfaces passes possession corners and cards", () => {
  const block = formatWorldCupUrTakePromptBlock({
    tournament: "2026 FIFA World Cup",
    hosts: ["USA"],
    dateRange: "June 11 — July 19, 2026",
    groups: {},
    live: [],
    results: [],
    upcoming: [],
    matchDetails: [
      {
        eventId: "760500",
        homeTeam: "FRA",
        awayTeam: "ENG",
        status: "live",
        homeScore: 1,
        awayScore: 0,
        lineupConfirmed: true,
        lineups: { home: { starters: [] }, away: { starters: [] } },
        teamStats: {
          home: {
            shots: 8,
            shotsOnTarget: 4,
            possessionPct: 58,
            passes: 420,
            passesCompleted: 360,
            passPct: 86,
            corners: 5,
            fouls: 9,
          },
          away: {
            shots: 5,
            possessionPct: 42,
            passes: 310,
            passesCompleted: 250,
            passPct: 81,
          },
        },
        players: {
          home: [
            {
              name: "Kylian Mbappé",
              goals: 1,
              assists: 1,
              keyPasses: 3,
              yellowCards: 1,
              minutesPlayed: 67,
            },
          ],
          away: [],
        },
        goals: [{ scorer: "Mbappé", assist: "Griezmann", minute: "23'" }],
        injuries: [],
      },
    ],
  });

  assert.match(block, /passes 360\/420 \(86%\)/);
  assert.match(block, /possession 58%/);
  assert.match(block, /corners 5/);
  assert.match(block, /3 key passes/);
  assert.match(block, /1 yellow/);
  assert.match(block, /Live team stats \(binding/);
});
