/**
 * Knockout fixture guards — no group-stage both-advance on R32+.
 */

import assert from "node:assert/strict";
import test from "node:test";
import { assessWcBothTeamsAdvanceFixture } from "./wcBothTeamsAdvance.js";
import { buildWcFixtureMatchupPrebuiltStructured } from "./wcFixtureMatchupPrebuilt.js";
import {
  detectWcKnockoutBothAdvanceBleed,
  isWcKnockoutFixtureMatch,
  repairWcKnockoutMatchupStructured,
} from "./wcKnockoutFixture.js";

const BRA_JPN_R32 = {
  homeTeam: "BRA",
  awayTeam: "JPN",
  group: "F",
  round: "Round of 32",
  status: "NS",
  odds: {
    home: { moneyline: "-180" },
    draw: { moneyline: "+280" },
    away: { moneyline: "+420" },
    totalLine: "2.5",
    totalUnder: { moneyline: "-110" },
    totalOver: { moneyline: "-110" },
  },
};

test("isWcKnockoutFixtureMatch detects Round of 32", () => {
  assert.equal(isWcKnockoutFixtureMatch(BRA_JPN_R32), true);
  assert.equal(isWcKnockoutFixtureMatch({ round: "Group Stage" }), false);
});

test("assessWcBothTeamsAdvanceFixture blocks knockout fixtures", () => {
  const result = assessWcBothTeamsAdvanceFixture({
    home: "BRA",
    away: "JPN",
    group: "F",
    match: BRA_JPN_R32,
    teamStats: {
      BRA: { advancePct: 80 },
      JPN: { advancePct: 70 },
    },
  });
  assert.equal(result.ok, false);
  assert.equal(result.reason, "knockout_fixture");
});

test("BRA vs JPN R32 moneyline-best-bet prebuilt never both-advances", () => {
  const structured = buildWcFixtureMatchupPrebuiltStructured({
    home: "BRA",
    away: "JPN",
    group: "F",
    question: "Best bet on BRA vs JPN if I only know the moneyline?",
    match: BRA_JPN_R32,
    teamStats: {
      BRA: { advancePct: 80 },
      JPN: { advancePct: 70 },
      SEN: { advancePct: 40 },
    },
  });
  const blob = [structured?.lean, structured?.call, structured?.whyNow, structured?.edge]
    .filter(Boolean)
    .join("\n");
  assert.match(blob, /under|over/i);
  assert.doesNotMatch(blob, /both teams to advance/i);
});

test("repairWcKnockoutMatchupStructured strips both-advance bleed", () => {
  const repaired = repairWcKnockoutMatchupStructured(
    {
      call: "Under 2.5 goals",
      lean: "Pass on ML — lean both BRA and JPN to advance",
      whyNow: "Group-stage paths for both sides.",
    },
    BRA_JPN_R32,
  );
  assert.doesNotMatch(String(repaired.lean), /both teams to advance/i);
  assert.match(String(repaired.call), /Under 2\.5/i);
});

test("detectWcKnockoutBothAdvanceBleed flags LLM group bleed on knockout match", () => {
  assert.equal(
    detectWcKnockoutBothAdvanceBleed(
      "Best bet on BRA vs JPN",
      { lean: "Pass on ML — lean both teams to advance in Group F." },
      [BRA_JPN_R32],
    ),
    true,
  );
});
