import test from "node:test";
import assert from "node:assert/strict";
import { classifyTennisMatch, EVENT_VALIDITY } from "./eventValidity.js";

function baseMatch(overrides = {}) {
  return {
    commenceTs: Date.parse("2026-06-01T14:00:00.000Z"),
    raw: {
      home: "Player A",
      away: "Player B",
      live: "0",
      event_status: "not_started",
      event_date: "2026-06-01",
      ...overrides.raw,
    },
    ...overrides,
  };
}

test("classifyTennisMatch: stale live=1 after 6h from start is FINISHED", () => {
  const start = Date.parse("2026-06-01T08:00:00.000Z");
  const now = Date.parse("2026-06-01T20:00:00.000Z");
  const m = baseMatch({
    commenceTs: start,
    raw: {
      home: "A",
      away: "B",
      live: "1",
      event_status: "",
    },
  });
  assert.equal(classifyTennisMatch(m, now), EVENT_VALIDITY.FINISHED);
});

test("classifyTennisMatch: live=1 with in_progress + recent start is ACTIVE", () => {
  const start = Date.parse("2026-06-01T16:00:00.000Z");
  const now = Date.parse("2026-06-01T16:30:00.000Z");
  const m = baseMatch({
    commenceTs: start,
    raw: {
      home: "A",
      away: "B",
      live: "1",
      event_status: "in_progress",
    },
  });
  assert.equal(classifyTennisMatch(m, now), EVENT_VALIDITY.ACTIVE);
});

test("classifyTennisMatch: finished keyword in event_status wins over live=1", () => {
  const now = Date.parse("2026-06-01T16:30:00.000Z");
  const m = baseMatch({
    commenceTs: Date.parse("2026-06-01T16:00:00.000Z"),
    raw: {
      home: "A",
      away: "B",
      live: "1",
      event_status: "Finished",
    },
  });
  assert.equal(classifyTennisMatch(m, now), EVENT_VALIDITY.FINISHED);
});

test("classifyTennisMatch: future start is UPCOMING", () => {
  const now = Date.parse("2026-06-01T10:00:00.000Z");
  const start = Date.parse("2026-06-01T18:00:00.000Z");
  const m = baseMatch({
    commenceTs: start,
    raw: {
      home: "A",
      away: "B",
      live: "0",
      event_status: "not_started",
    },
  });
  assert.equal(classifyTennisMatch(m, now), EVENT_VALIDITY.UPCOMING);
});
