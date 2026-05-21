import test from "node:test";
import assert from "node:assert/strict";
import {
  golfEventStartMs,
  parseGolfDisplayDateStartMs,
  pickGolfUpcomingFromBoard,
  promoteUpcomingOverFinishedCurrent,
  resolveGolfPrimaryEvent,
  isGolfBoardFinished,
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

test("promoteUpcomingOverFinishedCurrent swaps finished ESPN week for BDL upcoming", () => {
  const nowMs = Date.parse("2026-05-21T12:00:00.000Z");
  const promoted = promoteUpcomingOverFinishedCurrent({
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
