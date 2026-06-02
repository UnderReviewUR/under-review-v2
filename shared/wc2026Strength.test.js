import assert from "node:assert/strict";
import test from "node:test";
import { wcStrengthTagForRank, wcTeamsWithStrengthTags } from "./wc2026Strength.js";

test("wcStrengthTagForRank maps ranks to plain-English tiers", () => {
  assert.equal(wcStrengthTagForRank(0), "Favorite");
  assert.equal(wcStrengthTagForRank(1), "Contender");
  assert.equal(wcStrengthTagForRank(2), "Longshot");
  assert.equal(wcStrengthTagForRank(3), "Longshot");
});

test("wcTeamsWithStrengthTags never exposes Elo", () => {
  const rows = wcTeamsWithStrengthTags([
    { name: "Mexico", abbreviation: "MEX", eloRating: 1858 },
    { name: "Czechia", abbreviation: "CZE", eloRating: 1980 },
  ]);
  assert.equal(rows[0].name, "Czechia");
  assert.equal(rows[0].strengthTag, "Favorite");
  assert.equal(rows[1].strengthTag, "Contender");
  assert.equal("eloRating" in rows[0], false);
});
