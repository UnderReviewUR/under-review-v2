import assert from "node:assert/strict";
import test from "node:test";
import { normalizeNflScoreboardGame } from "./_nflBoardNormalize.js";

test("normalizeNflScoreboardGame keeps score, period, clock, and channel", () => {
  const row = normalizeNflScoreboardGame({
    id: 101,
    status: "inprogress",
    status_display: "Q2 6:42",
    start_time: "2026-08-14T23:00:00.000Z",
    home_team_id: 2,
    away_team_id: 1,
    teams: [
      { id: 1, abbr: "DEN", full_name: "Denver Broncos" },
      { id: 2, abbr: "ATL", full_name: "Atlanta Falcons" },
    ],
    boxscore: {
      total_away_points: 17,
      total_home_points: 14,
      period: 2,
      clock: "06:42",
    },
    broadcast: { network_short: "NBC", network: "NBC" },
  });
  assert.equal(row.awayAbbr, "DEN");
  assert.equal(row.homeAbbr, "ATL");
  assert.equal(row.awayScore, 17);
  assert.equal(row.homeScore, 14);
  assert.equal(row.period, 2);
  assert.equal(row.clock, "06:42");
  assert.equal(row.network, "NBC");
  assert.equal(row.status, "inprogress");
});
