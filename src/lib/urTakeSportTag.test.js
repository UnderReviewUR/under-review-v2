import test from "node:test";
import assert from "node:assert/strict";

import { formatUrTakeSportTag, formatSportTag } from "./urTakeSportTag.js";

test("formatUrTakeSportTag returns uppercased sport", () => {
  assert.equal(formatUrTakeSportTag("nba", ""), "NBA");
});

test("formatUrTakeSportTag appends PARLAY for parlay callType", () => {
  assert.equal(formatUrTakeSportTag("nfl", "parlay"), "NFL \u00B7 PARLAY");
});

test("formatUrTakeSportTag appends RULES for rules callType", () => {
  assert.equal(formatUrTakeSportTag("mlb", "rules"), "MLB \u00B7 RULES");
});

test("formatUrTakeSportTag appends MATCHUP for matchup callType", () => {
  assert.equal(formatUrTakeSportTag("nba", "matchup"), "NBA \u00B7 MATCHUP");
});

test("formatUrTakeSportTag defaults to GENERIC for null sport", () => {
  assert.equal(formatUrTakeSportTag(null, null), "GENERIC");
});

test("formatUrTakeSportTag handles undefined callType", () => {
  assert.equal(formatUrTakeSportTag("tennis", undefined), "TENNIS");
});

test("formatSportTag is alias for formatUrTakeSportTag", () => {
  assert.equal(formatSportTag, formatUrTakeSportTag);
});
