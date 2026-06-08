import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { normalizeSpreadFromOutcomes } from "../shared/gameLineSpread.js";
import {
  spreadOutcomesFromActionNetworkRow,
  totalFromActionNetworkRow,
} from "./_actionNetworkGameLines.js";

describe("Action Network game lines parsing", () => {
  const game = {
    home_team_id: 162,
    away_team_id: 181,
    teams: [
      { id: 162, abbr: "NYK" },
      { id: 181, abbr: "SAS" },
    ],
  };

  it("SAS +2 on road → NYK -2 favorite", () => {
    const outcomes = spreadOutcomesFromActionNetworkRow(
      { side: "away", value: 2, team_id: 181 },
      game,
      "NYK",
      "SAS",
    );
    assert.ok(outcomes);
    const normalized = normalizeSpreadFromOutcomes({
      homeAbbr: "NYK",
      awayAbbr: "SAS",
      outcomes,
    });
    assert.equal(normalized?.favoriteAbbr, "NYK");
    assert.equal(normalized?.spreadPoint, -2);
    assert.equal(normalized?.displayLine, "NYK -2");
  });

  it("parses total from Action Network row", () => {
    assert.equal(totalFromActionNetworkRow({ value: 216.5 }), 216.5);
    assert.equal(totalFromActionNetworkRow({ value: 0 }), null);
  });
});
