import assert from "node:assert/strict";
import test from "node:test";
import {
  NFL_TOP_25_BET_MARKETS,
  NFL_EXTENDED_PROP_CATALOG,
  NFL_BRIEFCASE_POCKETS,
  NFL_GOAT_CONTRACT_FIELDS,
  createEmptyNflGoatBriefcase,
  auditNflGoatBriefcaseCoverage,
  auditBriefcasePropCatalogCoverage,
  detectNflAskMarket,
  evaluateBriefcaseForInteraction,
  buildNflTop25ExpertisePromptBlock,
} from "./nflGoatExtractionContract.js";
import { normalizeNflBdlPlayerPropRows } from "../api/_nflBdl.js";
import { resolveNflPropsWireMarket } from "./nflPropsConstants.js";

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
  assert.match(block, /Targets/i);
  assert.match(block, /Half sacks/i);
  assert.doesNotMatch(block, /refuse to answer/i);
});

test("extended prop catalog covers defense and volume markets", () => {
  const ids = new Set(NFL_EXTENDED_PROP_CATALOG.map((p) => p.id));
  for (const need of [
    "targets",
    "drops",
    "sacks",
    "half_sacks",
    "tackles",
    "forced_fumbles",
    "fumbles",
    "def_ints",
  ]) {
    assert.ok(ids.has(need), `missing ${need}`);
  }
  assert.ok(NFL_BRIEFCASE_POCKETS.some((p) => p.alwaysLoad && p.path === "slate.playerProps"));
});

test("detectNflAskMarket routes passing TDs before yards / general", () => {
  assert.equal(
    detectNflAskMarket(
      "I'm looking at Maye 1.5 passing TDs (NE @ SEA). Should I fade the over, take the under, or pass?",
    ).marketId,
    "pass_tds",
  );
  assert.deepEqual(
    detectNflAskMarket("Maye over 1.5 passing TDs").propTypeHints,
    ["passing_tds", "pass_tds"],
  );
  assert.equal(detectNflAskMarket("Mahomes pass yards").marketId, "pass_yds");
});

test("detectNflAskMarket routes tackles and sacks", () => {
  assert.equal(detectNflAskMarket("Micah Parsons over on sacks?").marketId, "sacks");
  assert.equal(detectNflAskMarket("solo tackles for Roquan").marketId, "tackles");
  assert.equal(detectNflAskMarket("Mahomes interceptions thrown").marketId, "pass_ints");
  assert.equal(detectNflAskMarket("how many targets for Amon-Ra").marketId, "targets");
});

test("detectNflAskMarket keeps SGP primary when yards also mentioned", () => {
  assert.equal(
    detectNflAskMarket("SGP Mahomes pass yards and Kelce receiving yards").marketId,
    "sgp",
  );
});

test("evaluateBriefcaseForInteraction grades empty suitcase red", () => {
  const empty = createEmptyNflGoatBriefcase();
  const ev = evaluateBriefcaseForInteraction(empty, "spread on KC?");
  assert.equal(ev.grade, "red");
  assert.equal(ev.smooth, false);
  assert.equal(ev.forcePass, true);
  assert.ok(ev.alwaysMissing.length >= 1);
});

test("evaluateBriefcaseForInteraction does not PASS a posted spread when only props/rosters are empty", () => {
  const b = createEmptyNflGoatBriefcase();
  b.slate.games = [{ id: 1, awayAbbr: "DET", homeAbbr: "CIN" }];
  b.slate.odds = [{ game_id: 1, spread: "CIN -6.5", total: 37.5 }];
  b.league.injuries = [{ player: "Y" }];
  const ev = evaluateBriefcaseForInteraction(b, "DET @ CIN — CIN -6.5 · total 37.5. Side or total?");
  assert.equal(ev.detected.marketId, "total");
  assert.ok(ev.alwaysMissing.includes("slate.playerProps"));
  assert.equal(ev.forcePass, false);
  assert.notEqual(ev.grade, "red");
  assert.match(ev.guidance, /Game prices are posted/);
  assert.doesNotMatch(ev.guidance, /Priced market missing/);
});

test("detectNflAskMarket routes over 42.5 as game total and who-wins as opinion", () => {
  assert.equal(detectNflAskMarket("NE @ SEA over 42.5?").marketId, "total");
  assert.equal(detectNflAskMarket("Who wins NE @ SEA?").marketId, "opinion");
  assert.equal(detectNflAskMarket("Give me a lean on DET @ CIN").marketId, "opinion");
  assert.deepEqual(detectNflAskMarket("Who wins NE @ SEA?").propTypeHints, []);
});

test("evaluateBriefcaseForInteraction does not tax opinion asks with empty props", () => {
  const b = createEmptyNflGoatBriefcase();
  b.slate.games = [{ id: 1, awayAbbr: "NE", homeAbbr: "SEA" }];
  b.league.injuries = [{ player: "Y" }];
  const ev = evaluateBriefcaseForInteraction(b, "Who wins NE @ SEA?");
  assert.equal(ev.detected.marketId, "opinion");
  assert.equal(ev.forcePass, false);
  assert.notEqual(ev.grade, "red");
  assert.match(ev.guidance, /Opinion/);
});

test("evaluateBriefcaseForInteraction PASSes a prop ask with no live row", () => {
  const b = createEmptyNflGoatBriefcase();
  b.slate.games = [{ id: 1 }];
  b.slate.odds = [{ game_id: 1 }];
  b.slate.playerProps = [{ player: "X", propRaw: "passing_yards", line: 250 }];
  b.league.injuries = [{ player: "Y" }];
  b.league.rostersByTeam = { DET: [] };
  const ev = evaluateBriefcaseForInteraction(b, "Parsons sacks over?");
  assert.equal(ev.detected.marketId, "sacks");
  assert.equal(ev.noLiveProp, true);
  assert.equal(ev.forcePass, true);
});

test("evaluateBriefcaseForInteraction is green when pockets match ask", () => {
  const b = createEmptyNflGoatBriefcase();
  b.slate.games = [{ id: 1 }];
  b.slate.odds = [{ game_id: 1 }];
  b.slate.playerProps = [{ player: "X", propRaw: "sacks", line: 0.5 }];
  b.league.injuries = [{ player: "Y" }];
  b.league.rostersByTeam = { DET: [] };
  b.players.recentStats = [{}];
  const ev = evaluateBriefcaseForInteraction(b, "Parsons sacks over?");
  assert.equal(ev.detected.marketId, "sacks");
  assert.equal(ev.grade, "green");
  assert.equal(ev.smooth, true);
  assert.ok(ev.propMatch.matched >= 1);
  assert.equal(ev.forcePass, false);
});

test("auditBriefcasePropCatalogCoverage counts extended hits", () => {
  const b = createEmptyNflGoatBriefcase();
  b.slate.playerProps = [
    { propRaw: "targets" },
    { propRaw: "sacks" },
    { propRaw: "passing_yards" },
  ];
  const cov = auditBriefcasePropCatalogCoverage(b);
  assert.equal(cov.totalPropRows, 3);
  assert.ok(cov.extendedPresent >= 2);
});

test("resolveNflPropsWireMarket passes through unknown AN keys", () => {
  assert.equal(resolveNflPropsWireMarket("core_bet_type_9_passing_yards"), "pass_yds");
  assert.equal(resolveNflPropsWireMarket("core_bet_type_99_solo_tackles"), "solo_tackles");
  assert.equal(resolveNflPropsWireMarket("core_bet_type_12_forced_fumbles"), "forced_fumbles");
  assert.equal(resolveNflPropsWireMarket("garbage"), null);
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
