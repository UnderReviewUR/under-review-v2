import test from "node:test";
import assert from "node:assert/strict";

import { extractNbaTeamAbbrevsFromQuestion, NBA_QUERY_TEAM_ALIASES } from "./nbaTeamFromQuestion.js";

test("extractNbaTeamAbbrevsFromQuestion finds abbreviation in text", () => {
  const result = extractNbaTeamAbbrevsFromQuestion("What about BOS vs LAL tonight?");
  assert.ok(result.includes("BOS"));
  assert.ok(result.includes("LAL"));
});

test("extractNbaTeamAbbrevsFromQuestion finds nickname aliases", () => {
  const result = extractNbaTeamAbbrevsFromQuestion("celtics vs lakers");
  assert.ok(result.includes("BOS"));
  assert.ok(result.includes("LAL"));
});

test("extractNbaTeamAbbrevsFromQuestion is case-insensitive for abbreviations", () => {
  const result = extractNbaTeamAbbrevsFromQuestion("gsw game tonight");
  assert.ok(result.includes("GSW"));
});

test("extractNbaTeamAbbrevsFromQuestion returns empty for no matches", () => {
  const result = extractNbaTeamAbbrevsFromQuestion("What is the weather like?");
  assert.equal(result.length, 0);
});

test("extractNbaTeamAbbrevsFromQuestion handles null/undefined", () => {
  assert.deepEqual(extractNbaTeamAbbrevsFromQuestion(null), []);
  assert.deepEqual(extractNbaTeamAbbrevsFromQuestion(undefined), []);
});

test("extractNbaTeamAbbrevsFromQuestion deduplicates results", () => {
  const result = extractNbaTeamAbbrevsFromQuestion("BOS celtics boston celtics");
  const bosCount = result.filter((a) => a === "BOS").length;
  assert.equal(bosCount, 1);
});

test("extractNbaTeamAbbrevsFromQuestion handles multiple nicknames", () => {
  const result = extractNbaTeamAbbrevsFromQuestion("thunder vs nuggets");
  assert.ok(result.includes("OKC"));
  assert.ok(result.includes("DEN"));
});

test("NBA_QUERY_TEAM_ALIASES covers major nicknames", () => {
  assert.equal(NBA_QUERY_TEAM_ALIASES["lakers"], "LAL");
  assert.equal(NBA_QUERY_TEAM_ALIASES["warriors"], "GSW");
  assert.equal(NBA_QUERY_TEAM_ALIASES["knicks"], "NYK");
  assert.equal(NBA_QUERY_TEAM_ALIASES["heat"], "MIA");
});
