import assert from "node:assert/strict";
import test from "node:test";
import {
  formatOutrightsForPrompt,
  formatWorldCupUrTakePromptBlock,
} from "./_wcUrTakeContext.js";

test("formatWorldCupUrTakePromptBlock includes groups without Elo label", () => {
  const block = formatWorldCupUrTakePromptBlock({
    tournament: "2026 FIFA World Cup",
    hosts: ["USA", "Mexico", "Canada"],
    dateRange: "June 11 — July 19, 2026",
    groups: {
      A: [
        { name: "Czechia", abbreviation: "CZE", strengthTag: "Favorite" },
        { name: "Mexico", abbreviation: "MEX", strengthTag: "Contender" },
      ],
    },
    live: [],
    results: [],
    upcoming: [{ homeTeam: "MEX", awayTeam: "RSA", group: "A", date: "2026-06-11", time: "14:00" }],
  });
  assert.match(block, /2026 FIFA World Cup/);
  assert.match(block, /Group A:.*Czechia.*Favorite/);
  assert.match(block, /UPCOMING FIXTURES/);
  assert.match(block, /Czechia \(Favorite\)/);
  assert.doesNotMatch(block, /eloRating|elo proj/i);
  assert.match(block, /No live outright odds available/);
  assert.match(block, /never use the word "mispriced"/i);
});

test("formatOutrightsForPrompt formats KV outrights with freshness and mispriced rules", () => {
  const block = formatOutrightsForPrompt({
    outrights: { NOR: "+2500", ESP: "+650", BRA: "+500" },
    lastUpdated: Date.parse("2026-06-03T12:00:00.000Z"),
    source: "espn",
  });
  assert.ok(block);
  assert.match(block, /CURRENT OUTRIGHT ODDS/);
  assert.match(block, /BRA: \+500/);
  assert.match(block, /NOR: \+2500/);
  assert.match(block, /2026-06-03T12:00:00.000Z/);
  assert.match(block, /Source: ESPN/);
  assert.match(block, /mispriced/i);
  assert.match(block, /Do not invent odds/);
});

test("formatWorldCupUrTakePromptBlock injects stale outrights block without mispriced citation rule", () => {
  const now = Date.parse("2026-06-03T12:00:00.000Z");
  const outrightsBlock = formatOutrightsForPrompt({
    outrights: { NOR: "+2500" },
    lastUpdated: now - 7 * 60 * 60 * 1000,
    source: "espn",
    stale: true,
    freshness: {
      fetchedAt: new Date(now - 7 * 60 * 60 * 1000).toISOString(),
      isStale: true,
      ageMinutes: 420,
      ageText: "STALE (420 min ago)",
      maxAgeMinutes: 360,
      staleWarning: "Odds data is more than 360 minutes old",
    },
  });
  const block = formatWorldCupUrTakePromptBlock({
    tournament: "2026 FIFA World Cup",
    hosts: ["USA"],
    dateRange: "June 11 — July 19, 2026",
    groups: { I: [{ name: "Norway", abbreviation: "NOR", strengthTag: "Contender" }] },
    live: [],
    results: [],
    upcoming: [],
    outrightsBlock,
  });
  assert.match(block, /NOR: \+2500/);
  assert.match(block, /ODDS FRESHNESS \(mandatory\)/);
  assert.match(block, /never use the word "mispriced"/i);
});

test("formatWorldCupUrTakePromptBlock injects fresh outrights block when present", () => {
  const now = Date.parse("2026-06-03T12:00:00.000Z");
  const outrightsBlock = formatOutrightsForPrompt(
    {
      outrights: { NOR: "+2500" },
      lastUpdated: now - 30 * 60 * 1000,
      source: "odds_api",
      stale: false,
      freshness: {
        fetchedAt: new Date(now - 30 * 60 * 1000).toISOString(),
        isStale: false,
        ageMinutes: 30,
        ageText: "30 min ago",
        maxAgeMinutes: 360,
        staleWarning: null,
      },
    },
    now,
  );
  const block = formatWorldCupUrTakePromptBlock({
    tournament: "2026 FIFA World Cup",
    hosts: ["USA"],
    dateRange: "June 11 — July 19, 2026",
    groups: { I: [{ name: "Norway", abbreviation: "NOR", strengthTag: "Contender" }] },
    live: [],
    results: [],
    upcoming: [],
    outrightsBlock,
  });
  assert.match(block, /NOR: \+2500/);
  assert.match(block, /Source: ODDS_API/);
  assert.match(block, /When claiming a team is "mispriced"/);
  assert.doesNotMatch(block, /No live outright odds available/);
});
