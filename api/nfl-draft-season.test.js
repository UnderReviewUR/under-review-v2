import test from "node:test";
import assert from "node:assert/strict";
import {
  buildTeamDraftFocusBlock,
  getActiveDraftBundle,
  isKnownDraftProspect,
  resolveNflTeamFromQuestion,
} from "./nfl-draft-season.js";

test("resolveNflTeamFromQuestion — Cowboys", () => {
  assert.equal(resolveNflTeamFromQuestion("Predict the Cowboys draft"), "Dallas Cowboys");
  assert.equal(resolveNflTeamFromQuestion("DAL pick by pick"), "Dallas Cowboys");
});

test("resolveNflTeamFromQuestion — NYJ before NYG", () => {
  assert.equal(resolveNflTeamFromQuestion("Jets full mock draft"), "New York Jets");
  assert.equal(resolveNflTeamFromQuestion("NYG seven rounds"), "New York Giants");
});

test("buildTeamDraftFocusBlock lists Dallas slots", () => {
  const bundle = getActiveDraftBundle(new Date("2026-04-01T12:00:00Z"));
  const block = buildTeamDraftFocusBlock("Dallas Cowboys", bundle);
  assert.match(block, /Dallas Cowboys/);
  assert.match(block, /Overall 12/);
  assert.match(block, /Overall 20/);
  assert.ok(block.includes("Total picks in bundle:"));
});

test("draft bundle includes anchored prospects and simulation-only status", () => {
  const bundle = getActiveDraftBundle(new Date("2026-04-01T12:00:00Z"));
  const prospects = bundle.prospects || [];
  const mendoza = prospects.find((p) => p.name === "Fernando Mendoza");
  assert.ok(mendoza);
  assert.equal(mendoza.boardStatus, "simulation_only");
});

test("unknown prospect labels as simulation-only candidate", () => {
  const bundle = getActiveDraftBundle(new Date("2026-04-01T12:00:00Z"));
  assert.equal(isKnownDraftProspect("Fernando Mendoza", bundle), true);
  assert.equal(isKnownDraftProspect("Madeup Rookie Name", bundle), false);
});
