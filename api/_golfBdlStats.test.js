import test from "node:test";
import assert from "node:assert/strict";
import {
  buildNameToBdlPlayerIdMap,
  pivotBdlSeasonStatRows,
} from "./_golfBdlStats.js";
import { classifySgCoverage, summarizeStatCoverage } from "./_dataCoverage.js";
import { getStaticPlayerSG } from "./_golfStaticSg.js";

test("pivotBdlSeasonStatRows maps SG: Total and approach rows", () => {
  const map = pivotBdlSeasonStatRows([
    {
      player: { id: 99, display_name: "Alex Smalley" },
      stat_name: "SG: Total",
      stat_value: [{ statName: "Avg", statValue: "0.42" }],
    },
    {
      player: { id: 99, display_name: "Alex Smalley" },
      stat_name: "SG: Approach the Green",
      stat_value: [{ statName: "Avg", statValue: "0.18" }],
    },
  ]);
  assert.equal(map.get(99)?.sg_total, 0.42);
  assert.equal(map.get(99)?.sg_app, 0.18);
  assert.equal(map.get(99)?.statsSource, "balldontlie_season");
});

test("buildNameToBdlPlayerIdMap resolves last-name keys", () => {
  const map = buildNameToBdlPlayerIdMap([
    { playerId: 42, player: "Alex Smalley" },
  ]);
  assert.equal(map.get("alex smalley"), 42);
  assert.equal(map.get("smalley"), 42);
});

test("getStaticPlayerSG matches Jon Rahm from repo", () => {
  const sg = getStaticPlayerSG("Jon Rahm");
  assert.ok(sg);
  assert.ok(Number.isFinite(Number(sg.sg_total)));
});

test("classifySgCoverage and summarizeStatCoverage", () => {
  assert.equal(classifySgCoverage({ sg_total: 1.1 }), "full");
  assert.equal(classifySgCoverage({ sg_app: 0.2 }), "partial");
  assert.equal(classifySgCoverage({}), "leaderboard_only");
  const summary = summarizeStatCoverage([
    { name: "A", statsCoverage: "full" },
    { name: "B", statsCoverage: "leaderboard_only" },
  ]);
  assert.equal(summary.playersWithFullStats, 1);
  assert.equal(summary.playersLeaderboardOnly, 1);
});
