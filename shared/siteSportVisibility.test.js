import assert from "node:assert/strict";
import test from "node:test";
import {
  coerceUrAskSportToLiveSurface,
  isDailyTakeSportVisible,
  isHomeCardSportVisible,
  isHomeTickerSportVisible,
  isNavSportVisible,
  isNflUrTakeGated,
  isUrAskSportActive,
  isWorldCupUrTakeGated,
} from "./siteSportVisibility.js";

test("nav live surface is home + NFL + La Liga (WC off)", () => {
  assert.ok(isNavSportVisible("home"));
  assert.ok(isNavSportVisible("nfl"));
  assert.ok(isNavSportVisible("laliga"));
  assert.ok(!isNavSportVisible("worldcup"));
  assert.ok(!isNavSportVisible("nba"));
  assert.ok(!isNavSportVisible("cfb"));
  assert.ok(!isNavSportVisible("tennis"));
  assert.ok(!isNavSportVisible("mlb"));
  assert.ok(!isNavSportVisible("f1"));
  assert.ok(!isNavSportVisible("golf"));
});

test("home ticker is NFL + La Liga only", () => {
  assert.ok(isHomeTickerSportVisible("nfl"));
  assert.ok(isHomeTickerSportVisible("laliga"));
  assert.ok(!isHomeTickerSportVisible("worldcup"));
  assert.ok(!isHomeTickerSportVisible("nba"));
});

test("home cards hide off-season spotlights", () => {
  assert.ok(!isHomeCardSportVisible("mlb"));
  assert.ok(!isHomeCardSportVisible("tennis"));
  assert.ok(!isHomeCardSportVisible("f1"));
  assert.ok(!isHomeCardSportVisible("golf"));
});

test("daily take does not surface World Cup while WC is off", () => {
  assert.ok(!isDailyTakeSportVisible("worldcup"));
  assert.ok(!isDailyTakeSportVisible("nba"));
});

test("isNflUrTakeGated is off while NFL nav is on", () => {
  assert.ok(!isNflUrTakeGated({ nflSeasonMode: false }));
  assert.ok(!isNflUrTakeGated({ nflSeasonMode: true }));
});

test("World Cup ask is gated while nav.worldcup is false", () => {
  assert.ok(isWorldCupUrTakeGated());
  assert.ok(isUrAskSportActive("nfl"));
  assert.ok(isUrAskSportActive("laliga"));
  assert.ok(!isUrAskSportActive("worldcup"));
});

test("coerce WC club props to La Liga; tournament asks stay generic", () => {
  assert.equal(
    coerceUrAskSportToLiveSurface("worldcup", "Best anytime scorer value today?"),
    "laliga",
  );
  assert.equal(
    coerceUrAskSportToLiveSurface("worldcup", "Will Paraguay advance from Group D?"),
    "generic",
  );
  assert.equal(coerceUrAskSportToLiveSurface("nfl", "week 1 props"), "nfl");
});
