import test from "node:test";
import assert from "node:assert/strict";
import {
  golfEventStartMs,
  parseGolfDisplayDateStartMs,
  pickBestGolfWeekPrimary,
  pickGolfUpcomingFromBoard,
  reconcileGolfBoardCurrentEvent,
  resolveGolfPrimaryEvent,
  isGolfBoardFinished,
  isGolfInPlayWindow,
  GOLF_CARD_UPCOMING_WINDOW_MS,
} from "./golfHomeEventSelection.js";
import { EVENT_VALIDITY, classifyGolfEvent } from "./eventValidity.js";

test("parseGolfDisplayDateStartMs parses May 22–25 style ranges", () => {
  const nowMs = Date.parse("2026-05-20T17:00:00.000Z");
  const ms = parseGolfDisplayDateStartMs("May 22–25", nowMs);
  assert.ok(Number.isFinite(ms));
  const et = new Date(ms).toLocaleDateString("en-CA", { timeZone: "America/New_York" });
  assert.equal(et, "2026-05-22");
});

test("golfEventStartMs uses startTs then displayDate range", () => {
  const nowMs = Date.parse("2026-05-20T17:00:00.000Z");
  const ms = golfEventStartMs(
    { startTs: Date.parse("2026-05-21T12:00:00.000Z"), displayDate: "May 22–25" },
    nowMs,
  );
  assert.equal(ms, Date.parse("2026-05-21T12:00:00.000Z"));
  const fromDisplay = golfEventStartMs({ displayDate: "May 22–25" }, nowMs);
  assert.ok(Number.isFinite(fromDisplay));
});

test("resolveGolfPrimaryEvent prefers upcoming tournament over finished currentEvent", () => {
  const nowMs = Date.parse("2026-05-21T12:00:00.000Z");
  const board = {
    currentEvent: {
      id: "old",
      name: "RBC Heritage",
      shortName: "RBC Heritage",
      state: "post",
      startDate: "2026-05-12",
      endDate: "2026-05-18",
    },
    tournament: {
      id: 999,
      name: "THE CJ CUP Byron Nelson",
      shortName: "Byron Nelson",
      state: "pre",
      startDate: "2026-05-22",
      startTs: Date.parse("2026-05-22T11:00:00.000Z"),
      displayDate: "May 22–25",
    },
  };
  const primary = resolveGolfPrimaryEvent(board, nowMs);
  assert.match(String(primary?.name), /Byron Nelson/i);
  assert.equal(isGolfBoardFinished(board, nowMs), false);
});

test("pickGolfUpcomingFromBoard requires id for Byron within 72h", () => {
  const nowMs = Date.parse("2026-05-21T12:00:00.000Z");
  const pick = pickGolfUpcomingFromBoard(
    {
      tournament: {
        id: 42,
        name: "THE CJ CUP Byron Nelson",
        shortName: "Byron Nelson",
        state: "pre",
        startDate: "2026-05-22",
        startTs: Date.parse("2026-05-22T11:00:00.000Z"),
      },
    },
    nowMs,
    GOLF_CARD_UPCOMING_WINDOW_MS,
  );
  assert.equal(pick?.id, 42);
});

test("pickBestGolfWeekPrimary prefers in-window Byron Nelson over upcoming Schwab within 72h", () => {
  const nowMs = Date.parse("2026-05-21T21:00:00.000Z");
  const byron = {
    id: 1,
    name: "THE CJ CUP Byron Nelson",
    shortName: "Byron Nelson",
    state: "pre",
    startDate: "2026-05-21",
    endDate: "2026-05-24",
    startTs: Date.parse("2026-05-21T11:00:00.000Z"),
    courseName: "TPC Craig Ranch",
  };
  const schwab = {
    id: 2,
    name: "Charles Schwab Challenge",
    shortName: "Schwab Challenge",
    state: "pre",
    startDate: "2026-05-27",
    endDate: "2026-05-31",
    startTs: Date.parse("2026-05-27T11:00:00.000Z"),
    courseName: "Colonial Country Club",
  };
  assert.ok(isGolfInPlayWindow(byron, nowMs));
  const best = pickBestGolfWeekPrimary([schwab, byron], nowMs);
  assert.match(String(best?.name), /Byron Nelson/i);
});

test("reconcileGolfBoardCurrentEvent replaces Schwab preview with this-week Byron", () => {
  const nowMs = Date.parse("2026-05-21T21:00:00.000Z");
  const tourSchedule = [
    {
      id: 1,
      name: "THE CJ CUP Byron Nelson",
      shortName: "Byron Nelson",
      state: "pre",
      startDate: "2026-05-21",
      endDate: "2026-05-24",
      startTs: Date.parse("2026-05-21T11:00:00.000Z"),
      courseName: "TPC Craig Ranch",
    },
    {
      id: 2,
      name: "Charles Schwab Challenge",
      shortName: "Schwab Challenge",
      state: "pre",
      startDate: "2026-05-27",
      endDate: "2026-05-31",
      startTs: Date.parse("2026-05-27T11:00:00.000Z"),
      courseName: "Colonial Country Club",
    },
  ];
  const reconciled = reconcileGolfBoardCurrentEvent({
    currentEvent: {
      id: 2,
      name: "Charles Schwab Challenge",
      shortName: "Schwab Challenge",
      state: "pre",
      startDate: "2026-05-27",
      round: "Pre-Market",
      course: "Colonial Country Club",
    },
    tournament: tourSchedule[1],
    tourSchedule,
    nowMs,
  });
  assert.match(String(reconciled?.name), /Byron Nelson/i);
  assert.equal(reconciled?.id, 1);
});

test("reconcileGolfBoardCurrentEvent swaps finished ESPN week for BDL upcoming", () => {
  const nowMs = Date.parse("2026-05-21T12:00:00.000Z");
  const promoted = reconcileGolfBoardCurrentEvent({
    currentEvent: {
      id: "espn-old",
      name: "RBC Heritage",
      state: "post",
      startDate: "2026-05-12",
      endDate: "2026-05-18",
    },
    tournament: {
      id: 100,
      name: "THE CJ CUP Byron Nelson",
      shortName: "Byron Nelson",
      state: "pre",
      startDate: "2026-05-22",
      startTs: Date.parse("2026-05-22T11:00:00.000Z"),
      displayDate: "May 22–25",
      courseName: "TPC Craig Ranch",
    },
    tourSchedule: [],
    nowMs,
  });
  assert.match(String(promoted?.name), /Byron Nelson/i);
  assert.equal(promoted?.id, 100);
  assert.equal(classifyGolfEvent(promoted, nowMs), EVENT_VALIDITY.UPCOMING);
});
