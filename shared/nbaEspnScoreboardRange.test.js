import assert from "node:assert/strict";
import test from "node:test";
import { pickNextEspnNbaFinalsEvent } from "./nbaEspnScoreboardRange.js";

test("pickNextEspnNbaFinalsEvent — next pre Finals game on off-night slate", () => {
  const events = [
    {
      date: "2026-06-09T00:30:00.000Z",
      status: { type: { state: "pre" } },
      competitions: [
        {
          type: { abbreviation: "FINAL" },
          notes: [{ headline: "NBA Finals - Game 3" }],
          series: { summary: "NY leads series 2-0", competitors: [{ id: "18", wins: 2 }, { id: "24", wins: 0 }] },
          competitors: [
            { homeAway: "home", team: { id: "18", abbreviation: "NY" } },
            { homeAway: "away", team: { id: "24", abbreviation: "SA" } },
          ],
        },
      ],
    },
    {
      date: "2026-06-11T00:30:00.000Z",
      status: { type: { state: "pre" } },
      competitions: [
        {
          competitors: [
            { homeAway: "home", team: { id: "18", abbreviation: "NY" } },
            { homeAway: "away", team: { id: "24", abbreviation: "SA" } },
          ],
        },
      ],
    },
  ];
  const picked = pickNextEspnNbaFinalsEvent(events, Date.parse("2026-06-06T12:00:00.000Z"));
  assert.ok(picked);
  assert.equal(picked.date, "2026-06-09T00:30:00.000Z");
});
