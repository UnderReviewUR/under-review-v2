import test from "node:test";
import assert from "node:assert/strict";
import {
  enrichNbaInjuriesWithStructuralImpact,
  tagStructuralImpactAtIngestion,
  validatePlayerForStructuralAngle,
} from "./structuralAngleValidation.js";
import { isLowImpactBlocklisted } from "./lowImpactPlayerBlocklist.js";

test("blocklist includes David Jones", () => {
  assert.equal(isLowImpactBlocklisted("David Jones"), true);
});

test("NBA guard cannot drive interior vacancy angle", () => {
  const r = validatePlayerForStructuralAngle(
    { name: "Caruso", position: "G", avgMpgLast10: 20, propLineCount: 2 },
    "nba",
    "interior_vacancy",
  );
  assert.equal(r.valid, false);
  assert.equal(r.reason, "guard_interior_mismatch");
});

test("MLB pitcher cannot drive lineup vacancy", () => {
  const r = validatePlayerForStructuralAngle(
    { name: "Reliever", position: "RP", status: "IL-10" },
    "mlb",
    "lineup_vacancy",
  );
  assert.equal(r.valid, false);
});

test("ingestion tags structuralImpact on NBA injuries", () => {
  const rows = enrichNbaInjuriesWithStructuralImpact(
    [{ player: "David Jones", team: "SAS", status: "Out" }],
    {
      playerStats: [
        {
          name: "David Jones",
          team: "SAS",
          position: "G",
          recentGames: [{ min: 5, pts: 2, reb: 1, ast: 0 }],
        },
      ],
      propLines: [],
    },
  );
  assert.equal(rows[0].structuralImpact, false);
});

test("F1 reserve driver fails structural reference", () => {
  const tagged = tagStructuralImpactAtIngestion(
    { name: "Reserve Driver", reserve: true, raceEntered: false },
    "f1",
    "vacancy",
  );
  assert.equal(tagged.structuralImpact, false);
});
