import assert from "node:assert/strict";
import test from "node:test";
import { WC_2026_TEAMS } from "../src/data/wc2026Teams.js";
import { buildWcMatchReadDisplay } from "./wcMatchReadModel.js";

const TEAMS = WC_2026_TEAMS;

test("buildWcMatchReadDisplay pre-match with Elo when no market", () => {
  const out = buildWcMatchReadDisplay({
    match: {
      homeTeam: "USA",
      awayTeam: "PAR",
      group: "D",
      status: "scheduled",
    },
    teams: TEAMS,
  });
  assert.ok(out);
  assert.equal(out.mode, "pre");
  assert.ok(out.headline);
  assert.ok(out.winBar);
});

test("buildWcMatchReadDisplay live with chance index", () => {
  const out = buildWcMatchReadDisplay({
    match: {
      homeTeam: "FRA",
      awayTeam: "ENG",
      status: "live",
      homeScore: 0,
      awayScore: 0,
      teamStats: {
        home: { shots: 8, shotsOnTarget: 4, possessionPct: 62, corners: 3 },
        away: { shots: 2, shotsOnTarget: 0, possessionPct: 38, corners: 0 },
      },
      players: {
        home: [{ name: "Kylian Mbappé", shots: 3, shotsOnTarget: 2, keyPasses: 1 }],
        away: [],
      },
    },
    teams: TEAMS,
  });
  assert.ok(out);
  assert.equal(out.mode, "live");
  assert.ok(out.momentum);
  assert.match(out.momentum.headline, /FRA/);
});
