import test from "node:test";
import assert from "node:assert/strict";
import {
  buildTeamDraftFocusBlock,
  getActiveDraftBundle,
  getNflDraftMeta,
  getNflDraftPhase,
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
  assert.equal(mendoza.boardStatus, "verified_pool");
});

test("unknown prospect labels as simulation-only candidate", () => {
  const bundle = getActiveDraftBundle(new Date("2026-04-01T12:00:00Z"));
  assert.equal(isKnownDraftProspect("Fernando Mendoza", bundle), true);
  assert.equal(isKnownDraftProspect("Madeup Rookie Name", bundle), false);
});

test("getNflDraftPhase follows draft window UTC bounds", () => {
  const bundle = getActiveDraftBundle(new Date("2026-04-01T12:00:00Z"));
  assert.equal(getNflDraftPhase(new Date("2026-04-01T12:00:00Z"), bundle), "pre_draft");
  assert.equal(getNflDraftPhase(new Date("2026-04-24T12:00:00Z"), bundle), "during_draft");
  assert.equal(getNflDraftPhase(new Date("2026-05-01T12:00:00Z"), bundle), "post_draft");
});

test("post-June calendar does not advertise empty next class as active year", () => {
  const aug = new Date("2026-08-12T18:00:00Z");
  const bundle = getActiveDraftBundle(aug);
  const meta = getNflDraftMeta(aug, bundle);
  assert.equal(bundle.year, 2026);
  assert.equal(bundle.inferredYear, 2026);
  assert.equal(meta.draftYear, 2026);
  assert.equal(bundle.nextClassYearPending, 2027);
  assert.equal(meta.nextClassYearPending, 2027);
  assert.match(String(meta.bundleWarning || ""), /2027 draft class is not loaded/i);
  assert.equal(meta.phase, "post_draft");
});
