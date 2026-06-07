import assert from "node:assert/strict";
import test from "node:test";
import {
  countRegistryPlayers,
  seedRegistryFromStaticList,
  topRegistryAssists,
  upsertRegistryFromMatchDetail,
  createEmptyPlayerRegistry,
} from "./wcPlayerRegistry.js";

test("upsertRegistryFromMatchDetail — adds players from match", () => {
  let reg = createEmptyPlayerRegistry();
  seedRegistryFromStaticList(reg);
  reg = upsertRegistryFromMatchDetail(reg, {
    eventId: "999",
    homeTeam: "FRA",
    awayTeam: "ENG",
    lineupConfirmed: true,
    players: {
      home: [
        {
          espnAthleteId: "1",
          name: "Kylian Mbappé",
          position: "F",
          starter: true,
          goals: 2,
          assists: 0,
        },
      ],
      away: [],
    },
    lineups: {
      home: { starters: [{ name: "Kylian Mbappé", espnAthleteId: "1", starter: true }] },
      away: { starters: [] },
    },
  });

  const counts = countRegistryPlayers(reg);
  assert.ok(counts.playerCount >= 1);
  const fra = reg.teams.FRA.players.find((p) => p.name.includes("Mbapp"));
  assert.equal(fra?.goalsTournament, 2);
  assert.equal(fra?.isStarterLikely, true);
});

test("topRegistryAssists ranks by tournament assists", () => {
  const reg = createEmptyPlayerRegistry();
  seedRegistryFromStaticList(reg);
  reg.teams.FRA.players.push({
    name: "Antoine Griezmann",
    nationAbbr: "FRA",
    goalsTournament: 1,
    assistsTournament: 4,
    isStarterLikely: true,
  });
  reg.teams.ENG.players.push({
    name: "Bukayo Saka",
    nationAbbr: "ENG",
    goalsTournament: 2,
    assistsTournament: 2,
    isStarterLikely: true,
  });

  const top = topRegistryAssists(reg, 5).filter((p) => (p.assistsTournament || 0) > 0);
  assert.equal(top[0]?.name, "Antoine Griezmann");
  assert.equal(top[0]?.assistsTournament, 4);
});
