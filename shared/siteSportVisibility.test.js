import assert from "node:assert/strict";
import test from "node:test";
import {
  isDailyTakeSportVisible,
  isHomeCardSportVisible,
  isHomeTickerSportVisible,
  isNavSportVisible,
  isNflUrTakeGated,
} from "./siteSportVisibility.js";

test("nav shows home worldcup nba golf nfl only", () => {
  assert.ok(isNavSportVisible("home"));
  assert.ok(isNavSportVisible("worldcup"));
  assert.ok(isNavSportVisible("nba"));
  assert.ok(isNavSportVisible("golf"));
  assert.ok(isNavSportVisible("nfl"));
  assert.ok(!isNavSportVisible("tennis"));
  assert.ok(!isNavSportVisible("mlb"));
  assert.ok(!isNavSportVisible("f1"));
  assert.ok(!isNavSportVisible("ask"));
  assert.ok(!isNavSportVisible("pro"));
});

test("home ticker keeps nba f1 golf worldcup", () => {
  assert.ok(isHomeTickerSportVisible("nba"));
  assert.ok(isHomeTickerSportVisible("worldcup"));
  assert.ok(isHomeTickerSportVisible("f1"));
  assert.ok(isHomeTickerSportVisible("golf"));
  assert.ok(!isHomeTickerSportVisible("mlb"));
  assert.ok(!isHomeTickerSportVisible("tennis"));
});

test("home cards hide mlb and tennis spotlight", () => {
  assert.ok(isHomeCardSportVisible("f1"));
  assert.ok(isHomeCardSportVisible("golf"));
  assert.ok(!isHomeCardSportVisible("mlb"));
  assert.ok(!isHomeCardSportVisible("tennis"));
});

test("daily take uses nba and worldcup only", () => {
  assert.ok(isDailyTakeSportVisible("nba"));
  assert.ok(isDailyTakeSportVisible("worldcup"));
  assert.ok(!isDailyTakeSportVisible("mlb"));
  assert.ok(!isDailyTakeSportVisible("tennis"));
});

test("isNflUrTakeGated when off-season", () => {
  assert.ok(isNflUrTakeGated({ nflSeasonMode: false }));
  assert.ok(!isNflUrTakeGated({ nflSeasonMode: true }));
});
