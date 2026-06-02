import assert from "node:assert/strict";
import test from "node:test";
import { formatWorldCupUrTakePromptBlock } from "./_wcUrTakeContext.js";

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
});
