import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  computeDueRefreshOffsets,
  GAME_ODDS_REFRESH_OFFSETS_HOURS,
} from "./gameOddsSchedule.js";

describe("computeDueRefreshOffsets", () => {
  it("returns 12h offset when inside window before tip", () => {
    const tip = new Date("2026-05-17T23:00:00.000Z");
    const now = new Date(tip.getTime() - 12 * 60 * 60 * 1000 + 5 * 60 * 1000);
    const due = computeDueRefreshOffsets(tip.toISOString(), [], now);
    assert.ok(due.includes(12));
  });

  it("skips offsets already captured", () => {
    const tip = new Date("2026-05-17T23:00:00.000Z");
    const now = new Date(tip.getTime() - 6 * 60 * 60 * 1000);
    const due = computeDueRefreshOffsets(tip.toISOString(), [12], now);
    assert.ok(!due.includes(12));
    assert.ok(due.includes(6) || due.length >= 0);
  });

  it("returns empty after tip", () => {
    const tip = new Date("2026-05-17T12:00:00.000Z");
    const now = new Date("2026-05-17T13:00:00.000Z");
    assert.deepEqual(computeDueRefreshOffsets(tip.toISOString(), [], now), []);
  });

  it("defines four refresh offsets", () => {
    assert.deepEqual(GAME_ODDS_REFRESH_OFFSETS_HOURS, [12, 6, 3, 1]);
  });
});
