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

test("buildNbaFinalsHomePrompt — off-night with Knicks up 2-0, Game 3 in NY", () => {
  const row = buildNbaFinalsHomePrompt(
    [],
    [
      {
        away: "SAS",
        home: "NYK",
        awayWins: 0,
        homeWins: 2,
        gameNumberHint: 3,
        status: "NY leads series 2-0",
      },
    ],
  );
  assert.ok(row?.text?.includes("Game 3"));
  assert.match(row?.prompt || "", /Knicks lead the series 2-0/i);
  assert.match(row?.prompt || "", /SAS @ NYK/);
});
