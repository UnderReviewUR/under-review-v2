import assert from "node:assert/strict";
import test from "node:test";
import {
  parseEspnPlayoffSeriesRowFromEvent,
  playoffSeriesRowsFromEspnScoreboardEvents,
} from "./nbaEspnPlayoffSeries.js";

test("parseEspnPlayoffSeriesRowFromEvent reads competition.series wins", () => {
  const row = parseEspnPlayoffSeriesRowFromEvent({
    uid: "s:40~l:46~e:401859964",
    competitions: [
      {
        type: { abbreviation: "FINAL" },
        notes: [{ headline: "NBA Finals - Game 2" }],
        series: {
          summary: "NY leads series 1-0",
          competitors: [
            { id: "24", wins: 0 },
            { id: "18", wins: 1 },
          ],
        },
        competitors: [
          {
            homeAway: "home",
            team: { id: "24", abbreviation: "SA" },
            record: "0-1",
          },
          {
            homeAway: "away",
            team: { id: "18", abbreviation: "NY" },
            record: "1-0",
          },
        ],
      },
    ],
  });

  assert.ok(row);
  assert.equal(row.home, "SAS");
  assert.equal(row.away, "NYK");
  assert.equal(row.homeWins, 0);
  assert.equal(row.awayWins, 1);
  assert.equal(row.gameNumberHint, 2);
  assert.equal(row.round, "NBA Finals");
});

test("parseEspnPlayoffSeriesRowFromEvent — Game 3 Knicks lead 2-0 in NY", () => {
  const row = parseEspnPlayoffSeriesRowFromEvent({
    competitions: [
      {
        type: { abbreviation: "FINAL" },
        notes: [{ headline: "NBA Finals - Game 3" }],
        series: {
          summary: "NY leads series 2-0",
          competitors: [
            { id: "24", wins: 0 },
            { id: "18", wins: 2 },
          ],
        },
        competitors: [
          { homeAway: "home", team: { id: "18", abbreviation: "NY" }, record: "2-0" },
          { homeAway: "away", team: { id: "24", abbreviation: "SA" }, record: "0-2" },
        ],
      },
    ],
  });
  assert.ok(row);
  assert.equal(row.home, "NYK");
  assert.equal(row.away, "SAS");
  assert.equal(row.homeWins, 2);
  assert.equal(row.awayWins, 0);
  assert.equal(row.gameNumberHint, 3);
});

test("playoffSeriesRowsFromEspnScoreboardEvents dedupes by series id", () => {
  const ev = {
    uid: "finals-1",
    competitions: [
      {
        series: { competitors: [{ id: "1", wins: 1 }, { id: "2", wins: 0 }] },
        competitors: [
          { homeAway: "home", team: { id: "1", abbreviation: "SA" } },
          { homeAway: "away", team: { id: "2", abbreviation: "NY" } },
        ],
      },
    ],
  };
  const rows = playoffSeriesRowsFromEspnScoreboardEvents([ev, ev]);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].homeWins, 1);
  assert.equal(rows[0].awayWins, 0);
});
