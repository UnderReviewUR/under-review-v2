import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  derivePlayoffPriorityAbbrevs,
  derivePostseasonSlateTeamAbbrevs,
  mergeNbaUrTakePriorityAbbrevs,
  prioritizeNbaBoardForQuestion,
  resolvePlayoffPriorityAbbrevs,
  shouldShowSeriesScore,
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

test("0–0 playoff series rows still produce priority abbrevs (derive ignores wins)", () => {
  const playoffSeries = [
    { away: "DET", home: "CLE", homeWins: 0, awayWins: 0 },
    { away: "LAL", home: "OKC", homeWins: 0, awayWins: 0 },
  ];
  assert.equal(shouldShowSeriesScore(playoffSeries[0]), false);
  const todaysGames = [
    { awayTeam: { abbr: "DET" }, homeTeam: { abbr: "CLE" } },
    { awayTeam: { abbr: "LAL" }, homeTeam: { abbr: "OKC" } },
  ];
  assert.deepEqual(
    derivePlayoffPriorityAbbrevs(playoffSeries, todaysGames),
    ["CLE", "DET", "LAL", "OKC"],
  );
});

test("derivePlayoffPriorityAbbrevs: DET/CLE + LAL/OKC bracket ∩ slate", () => {
  const playoffSeries = [
    { away: "DET", home: "CLE", homeWins: 1, awayWins: 1 },
    { away: "LAL", home: "OKC", homeWins: 2, awayWins: 2 },
  ];
  const todaysGames = [
    { awayTeam: { abbr: "DET" }, homeTeam: { abbr: "CLE" } },
    { awayTeam: { abbr: "LAL" }, homeTeam: { abbr: "OKC" } },
  ];
  assert.deepEqual(
    derivePlayoffPriorityAbbrevs(playoffSeries, todaysGames),
    ["CLE", "DET", "LAL", "OKC"],
  );
});

test("resolvePlayoffPriorityAbbrevs: empty bracket + postseason slate → slate_postseason", () => {
  const todaysGames = [
    { postseason: true, awayTeam: { abbr: "DET" }, homeTeam: { abbr: "CLE" } },
    { postseason: true, awayTeam: { abbr: "LAL" }, homeTeam: { abbr: "OKC" } },
  ];
  const r = resolvePlayoffPriorityAbbrevs([], todaysGames);
  assert.equal(r.source, "slate_postseason");
  assert.deepEqual(r.abbrevs, ["CLE", "DET", "LAL", "OKC"]);
});

test("derivePostseasonSlateTeamAbbrevs ignores non-postseason games", () => {
  const todaysGames = [
    { postseason: true, awayTeam: { abbr: "DET" }, homeTeam: { abbr: "CLE" } },
    { postseason: false, awayTeam: { abbr: "MEM" }, homeTeam: { abbr: "DEN" } },
  ];
  assert.deepEqual(derivePostseasonSlateTeamAbbrevs(todaysGames), ["CLE", "DET"]);
});

test("shouldShowSeriesScore is independent of derivePlayoffPriorityAbbrevs (metadata gate vs priority)", () => {
  const row = { away: "DET", home: "CLE", homeWins: 0, awayWins: 0 };
  assert.equal(shouldShowSeriesScore(row), false);
  assert.ok(
    derivePlayoffPriorityAbbrevs([row], [{ awayTeam: { abbr: "DET" }, homeTeam: { abbr: "CLE" } }]).length >
      0,
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

test("resolvePlayoffPriorityAbbrevs prefers series over slate when both match", () => {
  const playoffSeries = [{ away: "DET", home: "CLE", homeWins: 1, awayWins: 0 }];
  const todaysGames = [
    { postseason: true, awayTeam: { abbr: "DET" }, homeTeam: { abbr: "CLE" } },
    { postseason: true, awayTeam: { abbr: "LAL" }, homeTeam: { abbr: "OKC" } },
  ];
  const r = resolvePlayoffPriorityAbbrevs(playoffSeries, todaysGames);
  assert.equal(r.source, "series");
  assert.deepEqual(r.abbrevs, ["CLE", "DET"]);
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
