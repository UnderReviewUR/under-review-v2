import test from "node:test";
import assert from "node:assert/strict";
import {
  detectNflTeamHint,
  detectSportFromQuestion,
  detectWtaFromQuestion,
} from "./detectSportFromQuestion.js";

test("nba tab + Yankees question routes to mlb from question text", () => {
  assert.equal(detectSportFromQuestion("best Yankees prop", "nba"), "mlb");
});

test("mlb tab + vague question stays on tab", () => {
  assert.equal(detectSportFromQuestion("random words", "mlb"), "mlb");
});

test("golf tab + Lakers question routes to nba", () => {
  assert.equal(
    detectSportFromQuestion("Best Lakers player prop tonight?", "golf"),
    "nba",
  );
});

test("home + Spurs question → nba (primary regression)", () => {
  assert.equal(
    detectSportFromQuestion("Best Spurs player prop tonight?", "home"),
    "nba",
  );
});

test("home + generic weather → generic", () => {
  assert.equal(detectSportFromQuestion("what's the weather today?", "home"), "generic");
});

test("home + strikeout prop → mlb", () => {
  assert.equal(
    detectSportFromQuestion("Best MLB strikeout prop tonight?", "home"),
    "mlb",
  );
});

test("home + pitcher K prop phrasing → mlb", () => {
  assert.equal(detectSportFromQuestion("Best pitcher K prop?", "home"), "mlb");
});

test("home + Cowboys → nfl", () => {
  assert.equal(detectSportFromQuestion("Best Cowboys play this weekend?", "home"), "nfl");
});

test("home + mock draft / big board language → nfl", () => {
  assert.equal(
    detectSportFromQuestion("Build me a mock draft big board from Pittsburgh", "home"),
    "nfl",
  );
});

test("home + RBC Heritage → golf", () => {
  assert.equal(detectSportFromQuestion("Who's the best RBC Heritage outright?", "home"), "golf");
});

test("home + F1 podium → f1", () => {
  assert.equal(detectSportFromQuestion("Best F1 podium bet this weekend?", "home"), "f1");
});

test("home + ATP match → tennis", () => {
  assert.equal(detectSportFromQuestion("Best ATP match tonight?", "home"), "tennis");
});

test("home + Sabalenka vs Gauff → tennis_wta_profile", () => {
  assert.equal(
    detectSportFromQuestion("Who wins Sabalenka vs Gauff on clay?", "home"),
    "tennis_wta_profile",
  );
});

test("tab tennis + WTA names → tennis_wta_profile", () => {
  assert.equal(
    detectSportFromQuestion("Sabalenka form this week?", "tennis"),
    "tennis_wta_profile",
  );
});

test("tab tennis + ATP-only → tennis", () => {
  assert.equal(detectSportFromQuestion("Best Sinner value?", "tennis"), "tennis");
});

test("Giants from home → mlb before nfl keyword overlap", () => {
  assert.equal(detectSportFromQuestion("best Giants play tonight?", "home"), "mlb");
});

test("Paraguay on home tab resolves to worldcup", () => {
  assert.equal(detectSportFromQuestion("Will Paraguay advance from Group D?", "home"), "worldcup");
});

test("USA soccer on NBA tab resolves to worldcup", () => {
  assert.equal(detectSportFromQuestion("Best USA soccer bet in group stage?", "nba"), "worldcup");
});

test("detectWtaFromQuestion true for explicit wta", () => {
  assert.equal(detectWtaFromQuestion("WTA Rome"), true);
});

test("detectNflTeamHint captures city/team names for draft asks", () => {
  assert.equal(detectNflTeamHint("Simulate Eagles first 3 rounds"), "PHI");
  assert.equal(detectNflTeamHint("Most chaotic realistic scenario for Chiefs"), "KC");
});

test("detectNflTeamHint resolves cowboys / punctuation / simulate phrasing", () => {
  assert.equal(detectNflTeamHint("simulate the cowboys draft"), "DAL");
  assert.equal(detectNflTeamHint("Cowboys."), "DAL");
  assert.equal(detectNflTeamHint("dallas draft board"), "DAL");
  assert.equal(detectNflTeamHint("What about Dallas in round 2?"), "DAL");
});
