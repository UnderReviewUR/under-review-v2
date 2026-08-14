import test from "node:test";
import assert from "node:assert/strict";
import {
  formatClayContextForPlayers,
  validateNflClayBundle,
} from "./_nflClayProjections.js";
import { NFL_CLAY_PROJECTIONS_SEED } from "./data/nfl-clay-projections.js";
import { buildNflAskDisciplinePromptBlock } from "../shared/nflAskDiscipline.js";

test("validateNflClayBundle accepts seed", () => {
  const v = validateNflClayBundle(NFL_CLAY_PROJECTIONS_SEED);
  assert.equal(v.ok, true);
  assert.ok(Object.keys(v.bundle.players).length >= 5);
});

test("validateNflClayBundle rejects empty players", () => {
  const v = validateNflClayBundle({ asOf: "2026-09-01", players: {} });
  assert.equal(v.ok, false);
});

test("formatClayContextForPlayers emits volume lines not fantasy ranks", () => {
  const block = formatClayContextForPlayers(["Josh Allen", "Ja'Marr Chase"], 4, NFL_CLAY_PROJECTIONS_SEED);
  assert.match(block, /ROLE \/ VOLUME PRIOR/);
  assert.match(block, /Josh Allen/);
  assert.match(block, /passYds/);
  assert.doesNotMatch(block, /PPR|ADP|draft him|MIKE CLAY|Mike Clay/i);
});

test("discipline block bans vendor citations and ranks live over role prior", () => {
  const block = buildNflAskDisciplinePromptBlock({
    question: "Cook rush yards over 72.5",
    hasLiveLine: true,
  });
  assert.match(block, /CITATION BAN/);
  assert.match(block, /PRIMARY/);
  assert.match(block, /silent support/i);
});
