import assert from "node:assert/strict";
import test from "node:test";
import {
  aggregateTournamentStatsFromDetails,
  buildRegistryFromMatchDetails,
} from "./wcPlayerStatsRollup.js";

test("aggregateTournamentStatsFromDetails sums goals and assists across matches", () => {
  const totals = aggregateTournamentStatsFromDetails([
    {
      eventId: "1",
      homeTeam: "FRA",
      awayTeam: "ENG",
      lineupConfirmed: true,
      players: {
        home: [{ name: "Kylian Mbappé", goals: 2, assists: 1, starter: true }],
        away: [],
      },
      lineups: { home: { starters: [{ name: "Kylian Mbappé" }] }, away: { starters: [] } },
    },
    {
      eventId: "2",
      homeTeam: "FRA",
      awayTeam: "USA",
      lineupConfirmed: false,
      players: {
        home: [{ name: "Kylian Mbappé", goals: 1, assists: 2, starter: true }],
        away: [],
      },
    },
  ]);

  const mbappe = [...totals.values()].find((p) => p.name.includes("Mbapp"));
  assert.equal(mbappe?.goalsTournament, 3);
  assert.equal(mbappe?.assistsTournament, 3);
  assert.equal(mbappe?.isStarterLikely, true);
});

test("buildRegistryFromMatchDetails exposes tournament leaders after rollup", () => {
  const registry = buildRegistryFromMatchDetails([
    {
      eventId: "10",
      homeTeam: "FRA",
      awayTeam: "ENG",
      players: {
        home: [{ name: "Kylian Mbappé", goals: 1, assists: 2 }],
        away: [{ name: "Bukayo Saka", goals: 0, assists: 1 }],
      },
    },
    {
      eventId: "11",
      homeTeam: "FRA",
      awayTeam: "USA",
      players: {
        home: [{ name: "Kylian Mbappé", goals: 2, assists: 0 }],
        away: [],
      },
    },
  ]);

  const mbappe = registry.teams.FRA?.players.find((p) => p.name.includes("Mbapp"));
  const saka = registry.teams.ENG?.players.find((p) => p.name.includes("Saka"));
  assert.equal(mbappe?.goalsTournament, 3);
  assert.equal(mbappe?.assistsTournament, 2);
  assert.equal(saka?.assistsTournament, 1);
});
