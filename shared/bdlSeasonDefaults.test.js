import assert from "node:assert/strict";
import test from "node:test";
import {
  inferNflSeasonYear,
  inferLaligaSeasonStartYear,
  formatLaligaSeasonLabel,
} from "./bdlSeasonDefaults.js";

test("inferNflSeasonYear — Sep uses fall year, Feb uses prior year", () => {
  assert.equal(inferNflSeasonYear(new Date("2026-09-01T12:00:00Z")), 2026);
  assert.equal(inferNflSeasonYear(new Date("2026-02-15T12:00:00Z")), 2025);
  assert.equal(inferNflSeasonYear(new Date("2025-09-01T12:00:00Z")), 2025);
});

test("inferLaligaSeasonStartYear — Aug+ uses current year start", () => {
  assert.equal(inferLaligaSeasonStartYear(new Date("2026-09-01T12:00:00Z")), 2026);
  assert.equal(inferLaligaSeasonStartYear(new Date("2026-07-01T12:00:00Z")), 2025);
  assert.equal(inferLaligaSeasonStartYear(new Date("2025-08-15T12:00:00Z")), 2025);
});

test("formatLaligaSeasonLabel", () => {
  assert.equal(formatLaligaSeasonLabel(2025), "2025-26");
  assert.equal(formatLaligaSeasonLabel(2026), "2026-27");
});
