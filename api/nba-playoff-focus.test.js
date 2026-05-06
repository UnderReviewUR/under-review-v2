import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  derivePlayoffPriorityAbbrevs,
  mergeNbaUrTakePriorityAbbrevs,
  prioritizeNbaBoardForQuestion,
} from "./nba.js";
import { getQuickPromptsForState } from "../src/lib/getQuickPromptsForState.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

test("derivePlayoffPriorityAbbrevs: intersection of playoffSeries teams and todays slate", () => {
  const playoffSeries = [
    { away: "MIN", home: "DEN", round: "West" },
    { away: "BOS", home: "NYK", round: "East" },
  ];
  const todaysGames = [
    { awayTeam: { abbr: "MIN" }, homeTeam: { abbr: "DEN" } },
    { awayTeam: { abbr: "CHA" }, homeTeam: { abbr: "ATL" } },
  ];
  const abbrevs = derivePlayoffPriorityAbbrevs(playoffSeries, todaysGames);
  assert.deepEqual(abbrevs, ["DEN", "MIN"]);
});

test("derivePlayoffPriorityAbbrevs: empty when playoff data missing", () => {
  assert.deepEqual(derivePlayoffPriorityAbbrevs([], [{ awayTeam: { abbr: "MIN" }, homeTeam: { abbr: "DEN" } }]), []);
  assert.deepEqual(
    derivePlayoffPriorityAbbrevs([{ away: "MIN", home: "DEN" }], []),
    [],
  );
});

test("merge + prioritize: direct question teams outrank playoff-only tier", () => {
  const board = {
    todaysGames: [
      { awayTeam: { abbr: "OKC" }, homeTeam: { abbr: "DEN" } },
      { awayTeam: { abbr: "MIN" }, homeTeam: { abbr: "PHX" } },
    ],
    propLines: [],
    playerStats: [],
  };
  const { playoffOnlyAbbrevs, directAbbrevs } = mergeNbaUrTakePriorityAbbrevs(["MIN"], ["DEN", "OKC"]);
  assert.deepEqual(directAbbrevs, ["MIN"]);
  assert.ok(playoffOnlyAbbrevs.includes("DEN"));
  const out = prioritizeNbaBoardForQuestion(board, directAbbrevs, playoffOnlyAbbrevs);
  assert.equal(out.todaysGames[0].awayTeam.abbr, "MIN");
  assert.equal(out.todaysGames[1].awayTeam.abbr, "OKC");
});

test("non-playoff direct team remains in merged priority (not dropped)", () => {
  const { mergedPriorityAbbrevs, directAbbrevs, playoffOnlyAbbrevs } = mergeNbaUrTakePriorityAbbrevs(
    ["DET"],
    ["DEN", "OKC"],
  );
  assert.deepEqual(directAbbrevs, ["DET"]);
  assert.ok(mergedPriorityAbbrevs.includes("DET"));
  assert.ok(mergedPriorityAbbrevs.includes("DEN"));
  const p = prioritizeNbaBoardForQuestion(
    {
      todaysGames: [
        { awayTeam: { abbr: "DET" }, homeTeam: { abbr: "CLE" } },
        { awayTeam: { abbr: "OKC" }, homeTeam: { abbr: "DEN" } },
      ],
      propLines: [],
      playerStats: [],
    },
    directAbbrevs,
    playoffOnlyAbbrevs,
  );
  assert.equal(p.todaysGames[0].awayTeam.abbr, "DET");
});

test("prioritizeNbaBoardForQuestion does not remove rows (sort only)", () => {
  const board = {
    todaysGames: [{ awayTeam: { abbr: "A" }, homeTeam: { abbr: "B" } }],
    propLines: [{ awayAbbr: "A", homeAbbr: "B" }],
    playerStats: [{ team: "A", pts: 10 }],
  };
  const out = prioritizeNbaBoardForQuestion(board, [], ["A"]);
  assert.equal(out.todaysGames.length, 1);
  assert.equal(out.propLines.length, 1);
  assert.equal(out.playerStats.length, 1);
});

test("UI copy: playoff matchup hint without Playoff Mode branding", () => {
  const screenPath = join(__dirname, "../src/screens/NbaScreen.jsx");
  const jsx = readFileSync(screenPath, "utf8");
  assert.match(jsx, /Ask about any playoff matchup or prop tonight/);
  assert.match(jsx, /playoff matchup/i);
  assert.ok(!jsx.includes("Playoff Mode"));

  const prompts = getQuickPromptsForState("nba", "unknown");
  assert.ok(prompts.some((q) => /playoff/i.test(q)));
  assert.ok(!prompts.some((q) => /Playoff Mode/i.test(q)));
});
