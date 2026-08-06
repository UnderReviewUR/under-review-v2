import assert from "node:assert/strict";
import test from "node:test";
import {
  NFL_TOP_25_BET_MARKETS,
  NFL_GOAT_CONTRACT_FIELDS,
  createEmptyNflGoatBriefcase,
  auditNflGoatBriefcaseCoverage,
  buildNflTop25ExpertisePromptBlock,
} from "./nflGoatExtractionContract.js";
import { normalizeNflBdlPlayerPropRows } from "../api/_nflBdl.js";

test("top 25 markets are unique and ranked 1–25", () => {
  assert.equal(NFL_TOP_25_BET_MARKETS.length, 25);
  const ranks = NFL_TOP_25_BET_MARKETS.map((m) => m.rank);
  assert.deepEqual(ranks, Array.from({ length: 25 }, (_, i) => i + 1));
  assert.equal(new Set(NFL_TOP_25_BET_MARKETS.map((m) => m.id)).size, 25);
});

test("empty briefcase audit is not eliteReady", () => {
  const b = createEmptyNflGoatBriefcase({ week: 1, season: 2026 });
  const audit = auditNflGoatBriefcaseCoverage(b);
  assert.equal(audit.eliteReady, false);
  assert.equal(audit.requiredHit, 0);
  assert.ok(NFL_GOAT_CONTRACT_FIELDS.some((f) => f.requiredForElite));
});

test("briefcase with core slate fields approaches eliteReady", () => {
  const b = createEmptyNflGoatBriefcase();
  b.slate.games = [{ id: 1 }];
  b.slate.odds = [{ game_id: 1 }];
  b.slate.playerProps = [{ player: "X" }];
  b.league.injuries = [{ player: "Y" }];
  b.league.rostersByTeam = { KC: [] };
  b.players.recentStats = [{}];
  b.players.seasonStats = [{}];
  const audit = auditNflGoatBriefcaseCoverage(b);
  assert.equal(audit.eliteReady, true);
  assert.equal(audit.requiredPct, 100);
});

test("expertise prompt prefers live without refusing", () => {
  const block = buildNflTop25ExpertisePromptBlock();
  assert.match(block, /Anytime touchdown/i);
  assert.match(block, /still give the structural lean/i);
  assert.match(block, /live line not in payload/i);
  assert.doesNotMatch(block, /refuse to answer/i);
});

test("normalizeNflBdlPlayerPropRows maps over_under + milestone", () => {
  const rows = normalizeNflBdlPlayerPropRows(
    [
      {
        game_id: 1,
        player_id: 9,
        player: { full_name: "Patrick Mahomes" },
        vendor: "draftkings",
        prop_type: "passing_yards",
        line_value: "275.5",
        market: { type: "over_under", over_odds: -115, under_odds: -105 },
      },
      {
        game_id: 1,
        player_id: 10,
        player: { full_name: "Travis Kelce" },
        vendor: "fanduel",
        prop_type: "anytime_td",
        line_value: "0.5",
        market: { type: "milestone", odds: 140 },
      },
      {
        game_id: 1,
        player: { full_name: "Skip Me" },
        vendor: "randombook",
        prop_type: "passing_yards",
        line_value: "1",
        market: { type: "over_under", over_odds: -110, under_odds: -110 },
      },
    ],
    { gameLabel: "BUF @ KC" },
  );
  assert.equal(rows.length, 2);
  assert.equal(rows[0].propRaw, "passing_yards");
  assert.equal(rows[0].overOdds, -115);
  assert.equal(rows[1].marketType, "milestone");
  assert.equal(rows[1].book, "fanduel");
});
