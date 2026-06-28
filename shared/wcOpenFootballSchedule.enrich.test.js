/**
 * Openfootball round enrichment on ESPN rows.
 */

import assert from "node:assert/strict";
import test from "node:test";
import { enrichMatchesWithOpenFootballMetadata } from "./wcOpenFootballSchedule.js";

test("enrichMatchesWithOpenFootballMetadata copies round from openfootball", () => {
  const espn = [
    {
      id: "espn-1",
      homeTeam: "BRA",
      awayTeam: "JPN",
      group: "F",
      status: "NS",
    },
  ];
  const of = [
    {
      homeTeam: "BRA",
      awayTeam: "JPN",
      group: "F",
      round: "Round of 32",
      openFootballNum: 73,
    },
  ];
  const { matches, enrichedRound } = enrichMatchesWithOpenFootballMetadata(espn, of);
  assert.equal(enrichedRound, 1);
  assert.equal(matches[0].round, "Round of 32");
  assert.equal(matches[0].openFootballNum, 73);
});

test("enrichMatchesWithOpenFootballMetadata skips rows that already have round", () => {
  const espn = [{ id: "1", homeTeam: "BRA", awayTeam: "JPN", group: "F", round: "Final" }];
  const of = [{ homeTeam: "BRA", awayTeam: "JPN", group: "F", round: "Round of 32" }];
  const { matches, enrichedRound } = enrichMatchesWithOpenFootballMetadata(espn, of);
  assert.equal(enrichedRound, 0);
  assert.equal(matches[0].round, "Final");
});
