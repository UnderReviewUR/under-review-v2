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
import { buildNflFantasyContextBlock } from "./_nflFantasyContext.js";
import { buildNflStaticPropsFallback } from "./_nflPropLineContext.js";

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

test("Fantasy context injects Clay projection for named players", () => {
  const block = buildNflFantasyContextBlock({
    question: "What is Brock Bowers PPR outlook?",
  });
  assert.match(block, /Brock Bowers/i);
  assert.match(block, /Clay projection/i);
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
