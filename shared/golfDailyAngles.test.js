import assert from "node:assert/strict";
import test from "node:test";
import {
  buildGolfDailyAngles,
  buildGolfStandingsRows,
  parseGolfPosition,
  parseGolfScore,
} from "./golfDailyAngles.js";

test("parseGolfScore handles E and signed values", () => {
  assert.equal(parseGolfScore("E"), 0);
  assert.equal(parseGolfScore("-4"), -4);
  assert.equal(parseGolfScore("+2"), 2);
});

test("buildGolfStandingsRows maps leaderboard slice", () => {
  const rows = buildGolfStandingsRows(
    {
      currentEvent: {
        leaderboard: [
          { position: 1, name: "Wyndham Clark", score: "-6", thru: "F" },
          { position: "T2", name: "Matt Fitzpatrick", score: "-3", thru: "17" },
        ],
      },
    },
    5,
  );
  assert.equal(rows.length, 2);
  assert.equal(rows[0].shortName, "Clark");
  assert.equal(rows[1].position, "T2");
});

test("buildGolfDailyAngles surfaces US Open style and sleepers", () => {
  const out = buildGolfDailyAngles({
    currentEvent: {
      name: "U.S. Open",
      round: "Round 2",
      leaderboard: [
        { position: 1, name: "Leader A", score: "+2", today: "+3" },
        { position: 18, name: "Sleeper B", score: "-3", today: "-2", sg_total: 0.8 },
      ],
    },
    courseStats: [
      { scoringDiff: 0.2, birdies: 2, bogeys: 8 },
      { scoringDiff: 0.15, birdies: 1, bogeys: 7 },
    ],
  });
  assert.ok(out.tips.some((t) => /penal rough|precision/i.test(t)));
  assert.ok(out.sleepers.some((s) => s.name === "Sleeper B"));
  assert.ok(out.faders.some((f) => f.name === "Leader A"));
});
