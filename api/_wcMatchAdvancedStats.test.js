import assert from "node:assert/strict";
import test from "node:test";
import { cacheWcMatchAdvancedStatsFromDetail } from "./_wcMatchAdvancedStats.js";

test("cacheWcMatchAdvancedStatsFromDetail skips non-FT detail", async () => {
  const result = await cacheWcMatchAdvancedStatsFromDetail({
    eventId: "1",
    status: "live",
    finalized: false,
    teamStats: { home: { shots: 5, shotsOnTarget: 2 } },
  });
  assert.equal(result.ok, false);
  assert.equal(result.error, "not_ft_or_no_stats");
});

test("cacheWcMatchAdvancedStatsFromDetail writes chance quality for FT", async () => {
  const result = await cacheWcMatchAdvancedStatsFromDetail({
    eventId: "wc-adv-test-1",
    homeTeam: "FRA",
    awayTeam: "BRA",
    status: "FT",
    finalized: true,
    homeScore: 1,
    awayScore: 0,
    teamStats: {
      home: { shots: 11, shotsOnTarget: 5, possessionPct: 54, corners: 4 },
      away: { shots: 7, shotsOnTarget: 2, possessionPct: 46, corners: 2 },
    },
    players: {
      home: [{ name: "Kylian Mbappé", shots: 4, shotsOnTarget: 2, goals: 1 }],
      away: [],
    },
  });
  assert.equal(result.ok, true);
  assert.equal(result.payload?.source, "espn_chance_index");
  assert.ok(result.payload?.team?.home?.chanceIndex > 0);
});
