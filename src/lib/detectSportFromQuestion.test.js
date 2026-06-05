import test from "node:test";
import assert from "node:assert/strict";

import {
  detectSportFromQuestion,
  detectWtaFromQuestion,
  detectNflTeamHint,
  NFL_TEAM_NAMES,
} from "./detectSportFromQuestion.js";

// --- detectSportFromQuestion ---

test("detectSportFromQuestion returns nba for basketball terms", () => {
  assert.equal(detectSportFromQuestion("Lakers vs Celtics tonight", ""), "nba");
});

test("detectSportFromQuestion returns mlb for baseball terms", () => {
  assert.equal(detectSportFromQuestion("Yankees game today", ""), "mlb");
});

test("detectSportFromQuestion returns nfl for football terms", () => {
  assert.equal(detectSportFromQuestion("NFL draft picks", ""), "nfl");
});

test("detectSportFromQuestion returns golf for golf terms", () => {
  assert.equal(detectSportFromQuestion("PGA outright odds", ""), "golf");
});

test("detectSportFromQuestion returns f1 for F1 terms", () => {
  assert.equal(detectSportFromQuestion("verstappen race result", ""), "f1");
});

test("detectSportFromQuestion returns tennis for tab context", () => {
  assert.equal(detectSportFromQuestion("who should I bet on?", "tennis"), "tennis");
});

test("detectSportFromQuestion returns generic when nothing matches", () => {
  assert.equal(detectSportFromQuestion("what is the weather", ""), "generic");
});

test("detectSportFromQuestion with tennis tab and WTA name returns tennis_wta_profile", () => {
  assert.equal(detectSportFromQuestion("sabalenka match", "tennis"), "tennis_wta_profile");
});

test("detectSportFromQuestion with WTA name and no tab returns tennis_wta_profile", () => {
  assert.equal(detectSportFromQuestion("sabalenka odds", ""), "tennis_wta_profile");
});

test("detectSportFromQuestion returns tab sport when no question signal", () => {
  assert.equal(detectSportFromQuestion("best bet today", "nba"), "nba");
});

// --- detectWtaFromQuestion ---

test("detectWtaFromQuestion returns true for WTA keyword", () => {
  assert.equal(detectWtaFromQuestion("WTA finals"), true);
});

test("detectWtaFromQuestion returns true for WTA player name", () => {
  assert.equal(detectWtaFromQuestion("swiatek vs gauff"), true);
});

test("detectWtaFromQuestion returns false for ATP player", () => {
  assert.equal(detectWtaFromQuestion("alcaraz odds"), false);
});

test("detectWtaFromQuestion returns false for unrelated text", () => {
  assert.equal(detectWtaFromQuestion("home run"), false);
});

// --- detectNflTeamHint ---

test("detectNflTeamHint finds team by city", () => {
  assert.equal(detectNflTeamHint("Kansas City game"), "KC");
});

test("detectNflTeamHint finds team by nickname", () => {
  assert.equal(detectNflTeamHint("Cowboys vs Eagles"), "DAL");
});

test("detectNflTeamHint returns null for unrelated text", () => {
  assert.equal(detectNflTeamHint("sunny weather"), null);
});

test("detectNflTeamHint returns null for empty string", () => {
  assert.equal(detectNflTeamHint(""), null);
});

test("detectNflTeamHint is case-insensitive", () => {
  assert.equal(detectNflTeamHint("CHIEFS game"), "KC");
});

// --- NFL_TEAM_NAMES ---

test("NFL_TEAM_NAMES covers key franchises", () => {
  assert.equal(NFL_TEAM_NAMES["cowboys"], "DAL");
  assert.equal(NFL_TEAM_NAMES["eagles"], "PHI");
  assert.equal(NFL_TEAM_NAMES["49ers"], "SF");
  assert.equal(NFL_TEAM_NAMES["chiefs"], "KC");
});
