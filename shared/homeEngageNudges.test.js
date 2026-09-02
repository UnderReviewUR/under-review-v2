import test from "node:test";
import assert from "node:assert/strict";

import {
  buildLaligaEngageNudges,
  buildNflEngageNudges,
  formatPropNudge,
  pickBestPropRows,
} from "./homeEngageNudges.js";

test("formatPropNudge builds Mahomes-style chip", () => {
  const row = {
    player: "Patrick Mahomes",
    propRaw: "passing_touchdowns",
    line: 1.5,
    game: "KC @ BAL",
    overImpliedDevig: 0.55,
    underImpliedDevig: 0.45,
  };
  const n = formatPropNudge(row, { seed: 0 });
  assert.ok(n);
  assert.match(n.text, /Mahomes over 1\.5 passing TDs\?/i);
  assert.match(n.prompt, /over 1\.5 passing TDs/i);
});

test("pickBestPropRows prefers passing TDs", () => {
  const rows = pickBestPropRows(
    [
      { player: "James Cook", propRaw: "rushing_yards", line: 62.5 },
      { player: "Patrick Mahomes", propRaw: "passing_touchdowns", line: 1.5 },
    ],
    { limit: 1 },
  );
  assert.equal(rows[0].player, "Patrick Mahomes");
});

test("buildNflEngageNudges returns team + prop", () => {
  const game = {
    awayAbbr: "KC",
    homeAbbr: "BAL",
    spread: { favoriteAbbr: "BAL", homePoint: -2.5, awayPoint: 2.5 },
    total: { point: 47.5 },
  };
  const nudges = buildNflEngageNudges(game, [
    {
      player: "Patrick Mahomes",
      propRaw: "passing_touchdowns",
      line: 1.5,
      game: "KC @ BAL",
      overImpliedDevig: 0.55,
      underImpliedDevig: 0.45,
    },
  ], 0);
  assert.equal(nudges.length, 2);
  assert.ok(["TEAM", "FADE"].includes(nudges[0].kind));
  assert.match(nudges[1].text, /Mahomes/i);
});

test("buildLaligaEngageNudges uses scorer prop when posted", () => {
  const match = {
    awayAbbr: "RMA",
    homeAbbr: "BAR",
    moneyline: { home: 210, draw: 260, away: 125 },
  };
  const nudges = buildLaligaEngageNudges(match, [
    { player: "Robert Lewandowski", propRaw: "anytime_goal", line: 0.5, game: "RMA @ BAR" },
  ]);
  assert.equal(nudges.length, 2);
  assert.match(nudges[1].text, /Lewandowski/i);
});
