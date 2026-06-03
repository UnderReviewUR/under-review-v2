import assert from "node:assert/strict";
import test from "node:test";
import {
  buildNbaFinalsHomePrompt,
  getNbaSeriesGameNumberForGame,
} from "./nbaFinalsHomePrompt.js";

test("getNbaSeriesGameNumberForGame returns next game number", () => {
  const n = getNbaSeriesGameNumberForGame(
    { awayTeam: { abbr: "BOS" }, homeTeam: { abbr: "NYK" } },
    [{ away: "BOS", home: "NYK", awayWins: 2, homeWins: 1 }],
  );
  assert.equal(n, 4);
});

test("buildNbaFinalsHomePrompt uses dynamic game label", () => {
  const row = buildNbaFinalsHomePrompt(
    [{ state: "pre", awayTeam: { abbr: "BOS" }, homeTeam: { abbr: "NYK" } }],
    [{ away: "BOS", home: "NYK", awayWins: 1, homeWins: 0 }],
  );
  assert.ok(row?.text?.includes("Game 2"));
  assert.ok(row?.prompt?.includes("BOS"));
});
