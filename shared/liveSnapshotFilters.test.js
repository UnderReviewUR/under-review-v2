import test from "node:test";
import assert from "node:assert/strict";

import {
  LIVE_SNAPSHOT_PRE_WINDOW_MS,
  NBA_TIP_FEED_LAG_GRACE_MS,
  MAX_LIVE_SNAPSHOT_TILES,
  isNbaMlbIncludedInLiveSnapshot,
  filterAndOrderNbaMlbGames,
  isTennisIncludedInLiveSnapshot,
  filterTennisMatchesForSnapshot,
} from "./liveSnapshotFilters.js";

// --- constants ---

test("LIVE_SNAPSHOT_PRE_WINDOW_MS is 2 hours", () => {
  assert.equal(LIVE_SNAPSHOT_PRE_WINDOW_MS, 2 * 60 * 60 * 1000);
});

test("NBA_TIP_FEED_LAG_GRACE_MS is 30 minutes", () => {
  assert.equal(NBA_TIP_FEED_LAG_GRACE_MS, 30 * 60 * 1000);
});

test("MAX_LIVE_SNAPSHOT_TILES is 5", () => {
  assert.equal(MAX_LIVE_SNAPSHOT_TILES, 5);
});

// --- isNbaMlbIncludedInLiveSnapshot ---

test("isNbaMlbIncludedInLiveSnapshot includes live games", () => {
  assert.equal(isNbaMlbIncludedInLiveSnapshot({ state: "in" }, Date.now()), true);
  assert.equal(isNbaMlbIncludedInLiveSnapshot({ state: "live" }, Date.now()), true);
});

test("isNbaMlbIncludedInLiveSnapshot returns false for null", () => {
  assert.equal(isNbaMlbIncludedInLiveSnapshot(null), false);
});

test("isNbaMlbIncludedInLiveSnapshot includes upcoming NBA within window", () => {
  const now = Date.now();
  const game = {
    state: "pre",
    startTimeUtc: new Date(now + 2 * 60 * 60 * 1000).toISOString(),
    startTimeSource: "bdl_start_time",
  };
  assert.equal(isNbaMlbIncludedInLiveSnapshot(game, now, "nba"), true);
});

test("isNbaMlbIncludedInLiveSnapshot excludes games far in the future", () => {
  const now = Date.now();
  const game = {
    state: "pre",
    startTimeUtc: new Date(now + 72 * 60 * 60 * 1000).toISOString(),
    startTimeSource: "bdl_start_time",
  };
  assert.equal(isNbaMlbIncludedInLiveSnapshot(game, now, "nba"), false);
});

test("isNbaMlbIncludedInLiveSnapshot excludes post games", () => {
  assert.equal(isNbaMlbIncludedInLiveSnapshot({ state: "post" }), false);
});

// --- filterAndOrderNbaMlbGames ---

test("filterAndOrderNbaMlbGames puts live games before pre games", () => {
  const now = Date.now();
  const games = [
    {
      state: "pre",
      startTimeUtc: new Date(now + 1 * 60 * 60 * 1000).toISOString(),
      startTimeSource: "bdl_start_time",
    },
    { state: "in", startTimeUtc: new Date(now).toISOString(), startTimeSource: "bdl_start_time" },
  ];
  const result = filterAndOrderNbaMlbGames(games, now, "nba");
  assert.equal(result.length, 2);
  assert.equal(result[0].state, "in");
  assert.equal(result[1].state, "pre");
});

test("filterAndOrderNbaMlbGames handles empty array", () => {
  assert.deepEqual(filterAndOrderNbaMlbGames([], Date.now()), []);
});

test("filterAndOrderNbaMlbGames handles null", () => {
  assert.deepEqual(filterAndOrderNbaMlbGames(null, Date.now()), []);
});

// --- isTennisIncludedInLiveSnapshot ---

test("isTennisIncludedInLiveSnapshot includes live matches", () => {
  assert.equal(isTennisIncludedInLiveSnapshot({ raw: { live: "1" } }), true);
});

test("isTennisIncludedInLiveSnapshot includes upcoming within 2h window", () => {
  const now = Date.now();
  assert.equal(
    isTennisIncludedInLiveSnapshot({ commenceTs: now + 60 * 60 * 1000 }, now),
    true,
  );
});

test("isTennisIncludedInLiveSnapshot excludes far-future matches", () => {
  const now = Date.now();
  assert.equal(
    isTennisIncludedInLiveSnapshot({ commenceTs: now + 5 * 60 * 60 * 1000 }, now),
    false,
  );
});

test("isTennisIncludedInLiveSnapshot excludes past matches without live flag", () => {
  const now = Date.now();
  assert.equal(
    isTennisIncludedInLiveSnapshot({ commenceTs: now - 60 * 60 * 1000 }, now),
    false,
  );
});

test("isTennisIncludedInLiveSnapshot returns false for null", () => {
  assert.equal(isTennisIncludedInLiveSnapshot(null), false);
});

test("isTennisIncludedInLiveSnapshot rejects absurdly large commenceTs", () => {
  assert.equal(
    isTennisIncludedInLiveSnapshot({ commenceTs: Number.MAX_SAFE_INTEGER }),
    false,
  );
});

// --- filterTennisMatchesForSnapshot ---

test("filterTennisMatchesForSnapshot filters correctly", () => {
  const now = Date.now();
  const matches = [
    { raw: { live: "1" } },
    { commenceTs: now + 60 * 60 * 1000 },
    { commenceTs: now + 5 * 60 * 60 * 1000 },
  ];
  const result = filterTennisMatchesForSnapshot(matches, now);
  assert.equal(result.length, 2);
});

test("filterTennisMatchesForSnapshot handles null", () => {
  assert.deepEqual(filterTennisMatchesForSnapshot(null), []);
});
