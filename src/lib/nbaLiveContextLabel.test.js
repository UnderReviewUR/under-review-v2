import assert from "node:assert/strict";
import test from "node:test";
import {
  formatNbaLiveContextLabel,
  nbaBoardPollIntervalMs,
  nbaSlateHasFinalsLiveGame,
} from "./nbaLiveContextLabel.js";

test("formatNbaLiveContextLabel — Q3 clock and series", () => {
  const label = formatNbaLiveContextLabel(
    {
      state: "in",
      period: 3,
      clock: "6:42",
      awayTeam: { abbr: "SAS", score: 70 },
      homeTeam: { abbr: "NYK", score: 72 },
    },
    [{ away: "SAS", home: "NYK", awayWins: 1, homeWins: 2 }],
  );
  assert.ok(label);
  assert.match(label, /Q3/);
  assert.match(label, /6:42/);
  assert.match(label, /Knicks lead/i);
});

test("nbaBoardPollIntervalMs — Finals live uses 18s", () => {
  const games = [
    {
      state: "in",
      awayTeam: { abbr: "SAS" },
      homeTeam: { abbr: "NYK" },
    },
  ];
  assert.equal(nbaSlateHasFinalsLiveGame(games), true);
  assert.equal(nbaBoardPollIntervalMs(games), 18_000);
  assert.equal(nbaBoardPollIntervalMs([]), 60_000);
});
