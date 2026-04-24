import test from "node:test";
import assert from "node:assert/strict";
import { inferSlateRowEventKeys } from "./slateRowEventKeys.js";
import { nbaEventKey } from "./homeEventDedup.js";

test("nbaEventKey uses numeric id for BDL-shaped rows", () => {
  const g = {
    id: 18445123,
    startTimeSource: "bdl_start_time",
    startTimeUtc: "2026-04-24T23:30:00.000Z",
    awayTeam: { abbr: "MIL", name: "Milwaukee Bucks" },
    homeTeam: { abbr: "PHI", name: "Philadelphia 76ers" },
  };
  assert.equal(nbaEventKey(g), "nba:18445123");
});

test("nbaEventKey uses pair+date for odds_fallback non-UUID-looking ids", () => {
  const g = {
    id: "abc-not-numeric",
    startTimeSource: "odds_fallback",
    commenceTime: "2026-04-24T23:00:00.000Z",
    awayTeam: { abbr: "MIL", name: "Milwaukee Bucks" },
    homeTeam: { abbr: "PHI", name: "Philadelphia 76ers" },
  };
  assert.equal(nbaEventKey(g), "nba:MIL|PHI|2026-04-24");
});

test("nbaEventKey uses pair+date for odds UUID ids", () => {
  const g = {
    id: "deadbeee-dead-dead-dead-deaddeadbeef",
    startTimeSource: "odds_fallback",
    commenceTime: "2026-04-25T00:30:00.000Z",
    awayTeam: { name: "Boston Celtics" },
    homeTeam: { name: "New York Knicks" },
  };
  assert.equal(nbaEventKey(g), "nba:BOS|NYK|2026-04-25");
});

test("inferSlateRowEventKeys matches full team names to bundle game", () => {
  const row = { sport: "nba", game: "Milwaukee Bucks @ Philadelphia 76ers", key: "x" };
  const bundle = {
    nba: {
      todaysGames: [
        {
          id: 999,
          startTimeSource: "bdl_start_time",
          startTimeUtc: "2026-04-24T23:00:00.000Z",
          awayTeam: { abbr: "MIL", name: "Milwaukee Bucks" },
          homeTeam: { abbr: "PHI", name: "Philadelphia 76ers" },
          state: "pre",
        },
      ],
    },
  };
  const keys = inferSlateRowEventKeys(row, bundle);
  assert.deepEqual(keys, ["nba:999"]);
});

test("inferSlateRowEventKeys does not attach wrong game when two slates share a date", () => {
  const row = { sport: "nba", game: "Boston Celtics @ New York Knicks", key: "x" };
  const bundle = {
    nba: {
      todaysGames: [
        {
          id: 1,
          startTimeSource: "bdl_start_time",
          startTimeUtc: "2026-04-25T00:00:00.000Z",
          awayTeam: { abbr: "MIL", name: "Milwaukee Bucks" },
          homeTeam: { abbr: "PHI", name: "Philadelphia 76ers" },
          state: "pre",
        },
        {
          id: 2,
          startTimeSource: "bdl_start_time",
          startTimeUtc: "2026-04-25T02:00:00.000Z",
          awayTeam: { abbr: "BOS", name: "Boston Celtics" },
          homeTeam: { abbr: "NYK", name: "New York Knicks" },
          state: "pre",
        },
      ],
    },
  };
  const keys = inferSlateRowEventKeys(row, bundle);
  assert.deepEqual(keys, ["nba:2"]);
});
