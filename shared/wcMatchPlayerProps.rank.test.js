import assert from "node:assert/strict";
import test from "node:test";
import {
  fixturePropBoardPlayabilityScore,
  rankFixturePropBoardRows,
} from "./wcMatchPlayerProps.js";

test("fixturePropBoardPlayabilityScore penalizes heavy juice", () => {
  assert.ok(fixturePropBoardPlayabilityScore("+150") > fixturePropBoardPlayabilityScore("-177"));
  assert.ok(fixturePropBoardPlayabilityScore("-110") > fixturePropBoardPlayabilityScore("-2500"));
});

test("rankFixturePropBoardRows prefers playable prices", () => {
  const ranked = rankFixturePropBoardRows(
    [
      { name: "Jackson Irvine", americanOdds: "-177", nationAbbr: "AUS", line: "0.5", side: "over" },
      { name: "Miloš Degenek", americanOdds: "+150", nationAbbr: "AUS", line: "1", side: "over" },
      { name: "Christian Pulisic", americanOdds: "-2500", nationAbbr: "USA", line: "0.5", side: "over" },
    ],
    3,
    "player_shots_ou",
  );
  assert.equal(ranked[0]?.name, "Miloš Degenek");
  assert.ok(!ranked.some((r) => r.name === "Christian Pulisic"));
});
