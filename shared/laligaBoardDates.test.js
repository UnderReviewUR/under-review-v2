import assert from "node:assert/strict";
import test from "node:test";
import {
  filterLaligaMatchesByDates,
  laligaBoardDateWindow,
  sortLaligaBoardMatches,
} from "./laligaBoardDates.js";

test("laligaBoardDateWindow spans 21 days back and 14 forward", () => {
  const dates = laligaBoardDateWindow(new Date("2026-09-01T12:00:00Z"));
  assert.equal(dates.length, 35);
  assert.equal(dates[0], "2026-08-11");
  assert.equal(dates[dates.length - 1], "2026-09-14");
});

test("sortLaligaBoardMatches orders by kickoff", () => {
  const sorted = sortLaligaBoardMatches([
    { startTime: "2026-09-07T19:00:00.000Z" },
    { startTime: "2026-09-06T16:30:00.000Z" },
  ]);
  assert.equal(sorted[0].startTime, "2026-09-06T16:30:00.000Z");
});

test("filterLaligaMatchesByDates keeps only listed days", () => {
  const out = filterLaligaMatchesByDates(
    [
      { startTime: "2026-09-06T16:30:00.000Z" },
      { startTime: "2026-09-01T12:00:00.000Z" },
    ],
    ["2026-09-06"],
  );
  assert.equal(out.length, 1);
  assert.equal(out[0].startTime, "2026-09-06T16:30:00.000Z");
});
