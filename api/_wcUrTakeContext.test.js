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

test("formatWorldCupUrTakePromptBlock injects fixture match odds when present", () => {
  const block = formatWorldCupUrTakePromptBlock({
    tournament: "2026 FIFA World Cup",
    hosts: ["USA"],
    dateRange: "June 11 — July 19, 2026",
    groups: { I: [{ name: "Norway", abbreviation: "NOR", strengthTag: "Contender" }] },
    live: [],
    results: [],
    upcoming: [],
    fixtures: [{ id: "1", homeTeam: "NOR", awayTeam: "FRA" }],
    fixtureOddsBlocks: [
      "MATCH ODDS — NOR vs FRA (ESPN 1X2 moneylines):\n  NOR +250 · Draw +220 · FRA -110",
    ],
  });
  assert.match(block, /FIXTURE MATCH ODDS/);
  assert.match(block, /NOR \+250/);
});

test("formatWorldCupUrTakePromptBlock falls back to Elo structure when match odds missing", () => {
  const block = formatWorldCupUrTakePromptBlock({
    tournament: "2026 FIFA World Cup",
    hosts: ["USA"],
    dateRange: "June 11 — July 19, 2026",
    groups: { I: [{ name: "Norway", abbreviation: "NOR", strengthTag: "Contender" }] },
    live: [],
    results: [],
    upcoming: [],
    fixtures: [{ id: "1", homeTeam: "NOR", awayTeam: "FRA" }],
    fixtureOddsBlocks: [],
  });
  assert.match(block, /No live 1X2 lines/);
  assert.match(block, /Elo win\/draw\/loss structure only/);
});

test("formatWorldCupUrTakePromptBlock slim knockout context for Norway path question", () => {
  const block = formatWorldCupUrTakePromptBlock({
    tournament: "2026 FIFA World Cup",
    hosts: ["USA"],
    dateRange: "June 11 — July 19, 2026",
    phase: "QUARTERFINALS",
    groups: {
      A: [{ name: "Mexico", strengthTag: "Favorite" }],
      I: [{ name: "Norway", strengthTag: "Contender" }],
    },
    groupsForPrompt: {
      I: [{ name: "Norway", strengthTag: "Contender" }],
    },
    knockoutBlock:
      "KNOCKOUT BRACKET (verified fixtures):\n  [QF] NOR vs ESP — 2026-07-10 NS",
    live: [],
    results: [],
    upcoming: [{ homeTeam: "NOR", awayTeam: "ESP", round: "Quarterfinal", date: "2026-07-10" }],
    fixtures: [],
    fixtureOddsBlocks: [],
    outrightsBlock: "CURRENT OUTRIGHT ODDS:\n  NOR: +2500",
  });
  assert.match(block, /Phase: QUARTERFINALS/);
  assert.match(block, /KNOCKOUT BRACKET/);
  assert.match(block, /question-scoped/i);
  assert.doesNotMatch(block, /Group A:/);
  assert.match(block, /Group I:/);
});
