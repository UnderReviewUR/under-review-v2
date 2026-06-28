import assert from "node:assert/strict";
import test from "node:test";
import { buildWcLiveFollowUpHaikuContext } from "./wcLiveFollowUpContext.js";

test("buildWcLiveFollowUpHaikuContext prefers live fixture", () => {
  const ctx = buildWcLiveFollowUpHaikuContext({
    phase: "ROUND_OF_32",
    fixtures: [
      { homeTeam: "USA", awayTeam: "MEX", status: "ns" },
      { homeTeam: "BRA", awayTeam: "JPN", status: "live", homeScore: 1, awayScore: 0, round: "Round of 32" },
    ],
  });
  assert.equal(ctx?.fixtureLabel, "JPN vs BRA");
  assert.equal(ctx?.score, "1-0");
  assert.equal(ctx?.phase, "ROUND_OF_32");
});

test("buildWcLiveFollowUpHaikuContext falls back to structured prebuilt lean", () => {
  const ctx = buildWcLiveFollowUpHaikuContext(
    { source: "worldcup_fixture_matchup_prebuilt", phase: "GROUP_STAGE" },
    {
      fixtureHome: "BRA",
      fixtureAway: "JPN",
      liveScore: "1-0 · 67'",
      phase: "ROUND_OF_32",
    },
  );
  assert.equal(ctx?.fixtureLabel, "JPN vs BRA");
  assert.equal(ctx?.score, "1-0 · 67'");
  assert.equal(ctx?.phase, "ROUND_OF_32");
});
