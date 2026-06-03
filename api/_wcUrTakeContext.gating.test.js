import assert from "node:assert/strict";
import test from "node:test";
import {
  formatLineupSide,
  formatWorldCupUrTakePromptBlock,
  formatWcDataConfidencePromptBlock,
} from "./_wcUrTakeContext.js";

const minimalGroups = () => {
  const groups = {};
  for (const letter of "ABCDEFGHIJKL") {
    groups[letter] = [{ name: "Team", abbreviation: letter, strengthTag: "Favorite" }];
  }
  return groups;
};

test("formatLineupSide hides starters when lineup not confirmed", () => {
  const block = formatLineupSide(
    "MEX",
    { starters: [{ name: "Hidden Player", jersey: "10" }], bench: [{ name: "Sub" }] },
    { lineupConfirmed: false, lastUpdated: Date.UTC(2026, 5, 11, 18, 0, 0) },
  );
  assert.doesNotMatch(block, /Hidden Player/);
  assert.doesNotMatch(block, /\bSub\b/);
  assert.match(block, /NOT CONFIRMED/i);
});

test("formatLineupSide shows starters when lineup confirmed", () => {
  const block = formatLineupSide(
    "MEX",
    { formation: "4-3-3", starters: [{ name: "Visible Player", jersey: "10" }] },
    { lineupConfirmed: true, lastUpdated: Date.UTC(2026, 5, 11, 18, 0, 0) },
  );
  assert.match(block, /Visible Player/);
  assert.match(block, /4-3-3/);
});

test("formatWorldCupUrTakePromptBlock injects dataConfidence and hides unconfirmed starters", () => {
  const block = formatWorldCupUrTakePromptBlock({
    tournament: "2026 FIFA World Cup",
    hosts: ["USA", "Mexico", "Canada"],
    dateRange: "June 11 — July 19, 2026",
    groups: minimalGroups(),
    live: [],
    results: [],
    upcoming: [],
    dataConfidence: "limited_intel",
    matchDetails: [
      {
        eventId: "401861775",
        homeTeam: "MEX",
        awayTeam: "RSA",
        status: "NS",
        lineupConfirmed: false,
        lastUpdated: Date.UTC(2026, 5, 11, 17, 30, 0),
        lineups: {
          home: { starters: [{ name: "Do Not Leak", jersey: "9" }] },
          away: { starters: [] },
        },
        injuries: [{ name: "Injured Star", status: "Out", teamAbbr: "MEX" }],
      },
    ],
  });

  assert.match(block, /DATA CONFIDENCE/i);
  assert.match(block, /limited_intel/i);
  assert.doesNotMatch(block, /Do Not Leak/);
  assert.match(block, /Injured Star/);
  assert.match(block, /lineupConfirmed: no/i);
  assert.match(block, /Injury .* not a confirmed starting XI/i);
});

test("formatWcDataConfidencePromptBlock requires pass language when pre_match_estimate", () => {
  const block = formatWcDataConfidencePromptBlock("pre_match_estimate", []);
  assert.match(block, /NOT CONFIRMED/i);
  assert.match(block, /Pass/i);
});
