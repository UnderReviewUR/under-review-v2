import test from "node:test";
import assert from "node:assert/strict";

import { mapBdlMlbGameToAppRow } from "./_mlbBdl.js";

test("mapBdlMlbGameToAppRow maps scores + pitchers + live-ish status", () => {
  const row = mapBdlMlbGameToAppRow(
    {
      id: 42,
      date: "2026-07-15T23:05:00.000Z",
      status: "In Progress",
      period: 7,
      display_clock: "1 OUT",
      home_team_name: "New York Yankees",
      away_team_name: "Boston Red Sox",
      home_team: { id: 1, abbreviation: "NYY", display_name: "New York Yankees" },
      away_team: { id: 2, abbreviation: "BOS", display_name: "Boston Red Sox" },
      home_team_data: { runs: 4 },
      away_team_data: { runs: 3 },
      venue: "Yankee Stadium",
      postseason: false,
      season_type: "regular",
      season: 2026,
    },
    { home: "G. Cole", away: "B. Bello" },
  );
  assert.equal(row.id, 42);
  assert.equal(row.state, "in");
  assert.equal(row.homeTeam.abbr, "NYY");
  assert.equal(row.awayTeam.abbr, "BOS");
  assert.equal(row.homeTeam.score, 4);
  assert.equal(row.awayTeam.score, 3);
  assert.equal(row.homeTeam.pitcher, "G. Cole");
  assert.equal(row.source, "balldontlie_mlb");
});
