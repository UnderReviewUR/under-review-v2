import assert from "node:assert/strict";
import test from "node:test";
import { buildWcPrebuiltUrTakeStubContext } from "./wcPrebuiltUrTakeContext.js";

test("buildWcPrebuiltUrTakeStubContext includes pinned live fixture", () => {
  const ctx = buildWcPrebuiltUrTakeStubContext("worldcup_fixture_matchup_prebuilt", {
    match: {
      id: "99",
      homeTeam: "BRA",
      awayTeam: "JPN",
      status: "live",
      homeScore: 1,
      awayScore: 0,
      round: "Round of 32",
    },
    matches: [
      { id: "99", homeTeam: "BRA", awayTeam: "JPN", status: "live", round: "Round of 32" },
    ],
    wcEventId: "99",
  });
  assert.equal(ctx.source, "worldcup_fixture_matchup_prebuilt");
  assert.equal(ctx.wcEventId, "99");
  assert.equal(ctx.fixtures.length, 1);
  assert.equal(ctx.matchDetails.length, 1);
  assert.equal(ctx.fixtures[0].homeTeam, "BRA");
  assert.ok(ctx.phase);
});
