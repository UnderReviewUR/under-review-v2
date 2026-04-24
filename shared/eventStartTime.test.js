import test from "node:test";
import assert from "node:assert/strict";
import {
  canonicalMlbStartUtcMs,
  canonicalNbaStartUtcMs,
  nbaDedupeCalendarToken,
  parseEventStartMs,
  utcCalendarDateKeyFromMs,
} from "./eventStartTime.js";

test("parseEventStartMs accepts finite numbers and ISO strings", () => {
  assert.equal(parseEventStartMs(1_700_000_000_000), 1_700_000_000_000);
  const ms = Date.parse("2026-04-24T00:30:00.000Z");
  assert.equal(parseEventStartMs("2026-04-24T00:30:00.000Z"), ms);
  assert.ok(Number.isNaN(parseEventStartMs("")));
});

test("canonicalNbaStartUtcMs prefers BDL startTimeUtc when source is bdl_start_time", () => {
  const game = {
    startTimeSource: "bdl_start_time",
    startTimeUtc: "2026-04-24T02:00:00.000Z",
    date: "2026-04-23T22:00:00.000Z",
  };
  assert.equal(canonicalNbaStartUtcMs(game), Date.parse("2026-04-24T02:00:00.000Z"));
});

test("canonicalNbaStartUtcMs uses startTimeUtc when source empty (BDL-shaped board)", () => {
  const game = {
    startTimeSource: "",
    startTimeUtc: "2026-04-24T02:00:00.000Z",
    date: "2026-04-23T22:00:00.000Z",
  };
  assert.equal(canonicalNbaStartUtcMs(game), Date.parse("2026-04-24T02:00:00.000Z"));
});

test("canonicalNbaStartUtcMs uses date when startTimeUtc absent (non-BDL source)", () => {
  const game = {
    startTimeSource: "odds_commence",
    date: "2026-04-24T03:00:00.000Z",
  };
  assert.equal(canonicalNbaStartUtcMs(game), Date.parse("2026-04-24T03:00:00.000Z"));
});

test("canonicalMlbStartUtcMs follows date-first chain", () => {
  const g = { date: "2026-05-01T17:05:00.000Z", startTime: "2026-05-01T18:00:00.000Z" };
  assert.equal(canonicalMlbStartUtcMs(g), Date.parse("2026-05-01T17:05:00.000Z"));
});

test("nbaDedupeCalendarToken aligns with canonical instant (UTC day)", () => {
  const game = {
    startTimeSource: "bdl_start_time",
    startTimeUtc: "2026-04-24T02:00:00.000Z",
    date: "2026-04-23T22:00:00.000Z",
  };
  assert.equal(nbaDedupeCalendarToken(game), utcCalendarDateKeyFromMs(Date.parse("2026-04-24T02:00:00.000Z")));
});
