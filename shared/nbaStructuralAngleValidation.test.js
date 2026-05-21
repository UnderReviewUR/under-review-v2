import test from "node:test";
import assert from "node:assert/strict";
import {
  buildNbaStructuralPlayerIndex,
  classifyNbaRosterPosition,
  isNbaGuardPosition,
  lintNbaStructuralAngleViolations,
  meetsNbaStructuralImpactThreshold,
  narrativeClaimsInteriorVacancyForPlayer,
  validateStructuralAngleCopy,
} from "./nbaStructuralAngleValidation.js";

test("classifyNbaRosterPosition — guards vs bigs", () => {
  assert.equal(classifyNbaRosterPosition("PG"), "guard");
  assert.equal(classifyNbaRosterPosition("C"), "big");
  assert.equal(isNbaGuardPosition("SG"), true);
});

test("meetsNbaStructuralImpactThreshold — 15+ mpg last 10", () => {
  const index = buildNbaStructuralPlayerIndex({
    playerStats: [
      {
        name: "Rotation Wing",
        team: "OKC",
        position: "SF",
        recentGames: Array.from({ length: 10 }, () => ({ min: 22, pts: 8, reb: 4, ast: 2 })),
      },
    ],
    propLines: [],
  });
  const profile = index.get("rotation wing");
  assert.equal(meetsNbaStructuralImpactThreshold(profile), true);
});

test("lint flags guard cited for interior vacancy", () => {
  const index = buildNbaStructuralPlayerIndex({
    playerStats: [
      {
        name: "Caruso",
        team: "OKC",
        position: "G",
        recentGames: [{ min: 18, pts: 6, reb: 3, ast: 4 }],
      },
    ],
    propLines: [{ player: "Caruso", prop: "points", line: 8.5 }],
  });
  const text =
    "With Caruso out, the interior collapse opens rebounding volume for the bigs.";
  assert.equal(narrativeClaimsInteriorVacancyForPlayer(text, "Caruso"), true);
  const lint = lintNbaStructuralAngleViolations(text, index);
  assert.ok(lint.criticalCodes.includes("nba_structural_guard_interior_mismatch"));
});

test("validateStructuralAngleCopy rejects David Jones", () => {
  const index = buildNbaStructuralPlayerIndex({
    playerStats: [
      {
        name: "David Jones",
        team: "SAS",
        position: "G",
        recentGames: [{ min: 4, pts: 2, reb: 1, ast: 0 }],
      },
    ],
    propLines: [],
  });
  const v = validateStructuralAngleCopy(
    {
      lean: "Lean under with David Jones off the board.",
      reason: "Jones vacancy shifts interior minutes.",
    },
    index,
  );
  assert.equal(v.ok, false);
  assert.ok(v.criticalCodes.includes("nba_structural_irrelevant_player"));
});
