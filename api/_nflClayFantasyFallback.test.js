import assert from "node:assert/strict";
import test from "node:test";

import {
  getNflClayProjectionPlayer,
  getNflClayTeamProjection,
  NFL_CLAY_PROJECTIONS_2026,
} from "./data/nfl-clay-projections-2026.js";
import {
  getNflFantasyMarketPlayer,
  NFL_FANTASY_MARKET_2026,
} from "./data/nfl-fantasy-market-2026.js";
import {
  buildNflFantasyContextBlock,
  buildNflFantasyContextBlockFromSnapshots,
} from "./_nflFantasyContext.js";
import { buildNflStaticPropsFallback } from "./_nflPropLineContext.js";
import {
  assignPositionalRanks,
  normalizeEspnFantasyPlayerRow,
} from "./_nflEspnFantasyRankings.js";
import { parseCsv, formatLiveNflversePlayerStats } from "./_nflverseLiveStats.js";
import {
  detectNflClayFormats,
  buildNflClayFormatTipsBlock,
} from "./data/nfl-clay-format-tips-2026.js";

test("Clay 2026 seed covers full positional board and 32 teams", () => {
  assert.ok(NFL_CLAY_PROJECTIONS_2026.meta.playerCount >= 350);
  assert.equal(Object.keys(NFL_CLAY_PROJECTIONS_2026.teams).length, 32);
  const josh = getNflClayProjectionPlayer("Josh Allen");
  assert.equal(josh?.team, "BUF");
  assert.ok(josh?.passYds > 3500);
  const puka = getNflClayProjectionPlayer("Puka Nacua");
  assert.equal(puka?.pos, "WR");
  assert.ok(puka?.targets > 150);
  const ari = getNflClayTeamProjection("ARI");
  assert.ok(ari?.projectedWins < 6);
  assert.ok(ari?.offRank >= 1);
});

test("Fantasy market seed includes PPR and Superflex ranks", () => {
  assert.ok(Object.keys(NFL_FANTASY_MARKET_2026.players).length >= 80);
  const gibbs = getNflFantasyMarketPlayer("Jahmyr Gibbs");
  assert.equal(gibbs?.ppr?.overallRank, 1);
  assert.ok(gibbs?.superflex?.overallRank >= 1);
});

test("Fantasy context injects Clay projection for named players", async () => {
  const block = await buildNflFantasyContextBlock({
    question: "What is Brock Bowers PPR outlook?",
  });
  assert.match(block, /Brock Bowers/i);
  assert.match(block, /Clay projection/i);
});

test("Live ESPN ranks override static seed when snapshot present", () => {
  const liveRankings = {
    seasonYear: 2026,
    fetchedAt: Date.now(),
    byKey: {
      brockbowers: {
        name: "Brock Bowers",
        pos: "TE",
        team: "LV",
        ppr: { overallRank: 18, posRank: "TE1", salary: 40 },
        superflex: { overallRank: 24, posRank: "TE1", salary: 30 },
        percentOwned: 99.1,
        injuryStatus: "ACTIVE",
      },
    },
    players: [{ name: "Brock Bowers" }],
  };
  const block = buildNflFantasyContextBlockFromSnapshots({
    question: "Brock Bowers PPR rank?",
    liveRankings,
  });
  assert.match(block, /ESPN live PPR/);
  assert.match(block, /overall 18/);
  assert.doesNotMatch(block, /ESPN PPR \(static seed\)/);
});

test("normalizeEspnFantasyPlayerRow + positional ranks", () => {
  const row = normalizeEspnFantasyPlayerRow({
    player: {
      fullName: "Jahmyr Gibbs",
      defaultPositionId: 2,
      proTeamId: 8,
      draftRanksByRankType: {
        PPR: { rank: 1, auctionValue: 57 },
        SUPERFLEX: { rank: 7, auctionValue: 57 },
      },
      ownership: { percentOwned: 99.8, averageDraftPosition: 1.5 },
      injuryStatus: "ACTIVE",
      id: 1,
    },
  });
  assert.equal(row?.name, "Jahmyr Gibbs");
  assert.equal(row?.team, "DET");
  const ranked = assignPositionalRanks([row]);
  assert.equal(ranked[0].ppr.posRank, "RB1");
});

test("parseCsv + format live nflverse stats", () => {
  const rows = parseCsv('a,b\n1,"x,y"\n');
  assert.equal(rows.length, 1);
  assert.equal(rows[0].b, "x,y");
  const line = formatLiveNflversePlayerStats({
    name: "Puka Nacua",
    pos: "WR",
    team: "LAR",
    seasonYearLabel: "2025 prior-season baseline",
    season: {
      targetsPerGame: 10,
      receptionsPerGame: 7,
      receivingYardsPerGame: 100,
      receivingTds: 8,
      fantasyPointsPprPerGame: 20,
    },
    last3: { targetsPerGame: 12, receivingYardsPerGame: 120, fantasyPointsPprPerGame: 24 },
    last1: { targets: 11, receivingYards: 76, fantasyPointsPpr: 26 },
  });
  assert.match(line, /Last 3/);
  assert.match(line, /Puka Nacua/);
});

test("Static props fallback returns concrete baseline lines", () => {
  const fallback = buildNflStaticPropsFallback({
    playerNames: ["Josh Allen", "Dak Prescott"],
    maxLines: 8,
  });
  assert.equal(fallback.source, "static_2026_player_prop_ou_baselines");
  assert.ok(fallback.playerCount > 20);
  assert.ok(fallback.lines.length >= 2);
  assert.ok(fallback.lines.every((l) => l.line != null && l.player));
});

test("detectNflClayFormats catches superflex and TE premium", () => {
  assert.deepEqual(detectNflClayFormats("superflex draft tips"), ["superflex"]);
  assert.ok(detectNflClayFormats("TE premium and knockout league").includes("tePremium"));
  assert.ok(detectNflClayFormats("TE premium and knockout league").includes("knockout"));
  assert.equal(detectNflClayFormats("Dak Prescott over 250.5").length, 0);
});

test("format-only fantasy questions get Clay format tips without player rows", () => {
  const block = buildNflFantasyContextBlockFromSnapshots({
    question: "How should I draft a superflex league?",
  });
  assert.match(block, /CLAY FORMAT STRATEGY TIPS/);
  assert.match(block, /Superflex/);
  assert.match(block, /two QBs/i);
});

test("format tips stay off for plain prop questions", () => {
  const tips = buildNflClayFormatTipsBlock("Cowboys Dak Prescott over 1 passing touchdown today");
  assert.equal(tips, "");
});
