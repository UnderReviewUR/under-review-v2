import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { projectStartersFromRecentMinutes } from "./_nbaEspnStarters.js";

describe("projectStartersFromRecentMinutes", () => {
  it("picks top-minute players from most recent log", () => {
    const rows = projectStartersFromRecentMinutes(
      [
        {
          name: "Jalen Brunson",
          team: "NYK",
          recentGames: [{ min: "34:12", pts: 28, reb: 4, ast: 7 }],
        },
        {
          name: "Mikal Bridges",
          team: "NYK",
          recentGames: [{ min: "31:00", pts: 14, reb: 3, ast: 2 }],
        },
        {
          name: "Victor Wembanyama",
          team: "SAS",
          recentGames: [{ min: "36:30", pts: 24, reb: 12, ast: 3 }],
        },
      ],
      "NYK",
      2,
    );
    assert.equal(rows.length, 2);
    assert.equal(rows[0].name, "Jalen Brunson");
    assert.equal(rows[1].name, "Mikal Bridges");
  });
});
