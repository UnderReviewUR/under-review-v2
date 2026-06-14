import assert from "node:assert/strict";
import test from "node:test";
import { pickWcFixtureTotalsAlternateLean } from "./wcFixtureMatchupPrebuilt.js";

test("pickWcFixtureTotalsAlternateLean uses posted total for heavy favorite", () => {
  const row = pickWcFixtureTotalsAlternateLean({
    home: "GER",
    away: "CUW",
    homeMl: "-3500",
    awayMl: "+3000",
    matchOdds: { totalLine: 4.5, totalOver: "-110" },
  });
  assert.equal(row.headline, "Lean Over 4.5 goals");
  assert.equal(row.kind, "over");
});

test("pickWcFixtureTotalsAlternateLean tight ML defaults Under 2.5", () => {
  const row = pickWcFixtureTotalsAlternateLean({
    home: "USA",
    away: "PAR",
    homeMl: "+110",
    awayMl: "+285",
  });
  assert.equal(row.headline, "Lean Under 2.5 goals");
  assert.equal(row.kind, "under");
});
