import test from "node:test";
import assert from "node:assert/strict";

import {
  nbaContextSupportsMatchupStatsEvidence,
  mlbContextSupportsMatchupStatsEvidence,
} from "./_urTakeSportEvidenceMatchup.js";
import { lintSportEvidenceEnforcement, lintUnsupportedMatchupSpecificity } from "./_urTakeSportValidators/_evidenceEnforcement.js";
import { buildDefaultUnsupportedClaimFlags } from "./_urTakeSportEvidence.js";

test("nbaContextSupportsMatchupStatsEvidence true when last5 signal in JSON", () => {
  assert.equal(nbaContextSupportsMatchupStatsEvidence({ playerStats: [{ name: "A", last5PTS: 22 }] }), true);
  assert.equal(nbaContextSupportsMatchupStatsEvidence({ playerStats: [{ name: "A", pts: 20 }] }), false);
});

test("mlbContextSupportsMatchupStatsEvidence true on split token", () => {
  assert.equal(mlbContextSupportsMatchupStatsEvidence({ note: "vs_lhp data" }), true);
  assert.equal(mlbContextSupportsMatchupStatsEvidence({ games: [] }), false);
});

test("lint: books adjusting triggers unsupported line movement", () => {
  const flags = buildDefaultUnsupportedClaimFlags();
  const issues = lintSportEvidenceEnforcement("Books adjusting the total overnight.", {
    unsupportedClaimFlags: flags,
    sport: "nba",
  });
  assert.ok(issues.some((i) => i.code === "unsupported_line_movement_claim"));
});

test("lint: NBA defense isolation claim critical when matchupStatsEvidence false", () => {
  const flags = buildDefaultUnsupportedClaimFlags();
  const issues = lintUnsupportedMatchupSpecificity(
    "Their defense struggles with perimeter isolation in late clock.",
    flags,
    "nba",
  );
  assert.equal(issues.length, 1);
  assert.equal(issues[0].code, "unsupported_matchup_specificity");
});

test("lint: NFL target funnel critical when matchupStatsEvidence false", () => {
  const flags = buildDefaultUnsupportedClaimFlags();
  const issues = lintUnsupportedMatchupSpecificity("This is a target funnel spot for the WR2.", flags, "nfl");
  assert.ok(issues.some((i) => i.code === "unsupported_matchup_specificity"));
});
