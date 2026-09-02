import assert from "node:assert/strict";
import test from "node:test";
import { defenses } from "../api/nfl-defense.js";
import {
  NFL_2025_SCORING_DEFENSE_PRIORS,
  applyNfl2025ScoringDefensePriors,
  formatNflDefenseTierLabel,
  isNflDefensePriorRow,
  tierForNflScoringDefenseRank,
} from "./nflDefenseScoringPriors2025.js";
import { buildNflMatchupThesis } from "../api/_nflMatchupCard.js";
import { mergeNflDefenseMaps } from "./nflBdlDefenseNormalize.js";

test("2025 scoring priors cover all 32 teams with unique ranks", () => {
  const ranks = Object.values(NFL_2025_SCORING_DEFENSE_PRIORS).map((p) => p.rank);
  assert.equal(Object.keys(NFL_2025_SCORING_DEFENSE_PRIORS).length, 32);
  assert.equal(new Set(ranks).size, 32);
  assert.equal(Math.min(...ranks), 1);
  assert.equal(Math.max(...ranks), 32);
});

test("exported defenses overlay SEA ELITE and BAL AVERAGE from 2025 scoring", () => {
  assert.equal(defenses.SEA.tier, "ELITE");
  assert.equal(defenses.SEA.overall.rank, 1);
  assert.equal(defenses.BAL.tier, "AVERAGE");
  assert.equal(defenses.BAL.overall.rank, 18);
  assert.equal(defenses.HOU.tier, "ELITE");
  assert.equal(defenses.NE.tier, "ELITE");
  assert.equal(defenses.CLE.tier, "AVERAGE");
  assert.ok(isNflDefensePriorRow(defenses.SEA));
  assert.match(formatNflDefenseTierLabel(defenses.SEA), /ELITE D · '25 prior/);
});

test("thesis stamps defense as '25 prior", () => {
  const thesis = buildNflMatchupThesis({
    player: { name: "Drake Maye", pos: "QB", team: "NE" },
    opponent: "SEA",
    defenseTier: "ELITE",
    defenseLabel: formatNflDefenseTierLabel(defenses.SEA),
    liveLine: { prop: "pass TDs", line: 1.5, book: "DraftKings", overOdds: -110 },
    homeAbbr: "SEA",
  });
  assert.match(thesis, /ELITE D · '25 prior/);
  assert.match(thesis, /live pass TDs 1\.5/);
});

test("live sample with enough games clears prior vintage", () => {
  const merged = mergeNflDefenseMaps(
    {
      SEA: {
        abbr: "SEA",
        tier: "STRONG",
        gamesPlayed: 6,
        source: "balldontlie_team_season_stats",
        overall: { rank: 8, ptsAllowed: 20.1 },
      },
    },
    applyNfl2025ScoringDefensePriors({
      SEA: {
        abbr: "SEA",
        tier: "ELITE",
        overall: { rank: 1, ptsAllowed: 17.2 },
        note: "static",
      },
    }),
  );
  assert.equal(merged.SEA.tier, "STRONG");
  assert.equal(merged.SEA.priorVintage, undefined);
  assert.equal(isNflDefensePriorRow(merged.SEA), false);
  assert.equal(formatNflDefenseTierLabel(merged.SEA), "STRONG D");
});

test("tierForNflScoringDefenseRank matches band helper", () => {
  assert.equal(tierForNflScoringDefenseRank(1), "ELITE");
  assert.equal(tierForNflScoringDefenseRank(12), "STRONG");
  assert.equal(tierForNflScoringDefenseRank(18), "AVERAGE");
  assert.equal(tierForNflScoringDefenseRank(25), "WEAK");
  assert.equal(tierForNflScoringDefenseRank(32), "BOTTOM");
});
