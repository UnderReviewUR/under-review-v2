import assert from "node:assert/strict";
import test from "node:test";
import {
  formatWcDetailAsOfEt,
  resolveWcXiStatus,
  wcXiStatusChipLabel,
} from "./wcXiStatus.js";

test("resolveWcXiStatus uses API xiStatus when present", () => {
  assert.equal(resolveWcXiStatus({ xiStatus: "confirmed", lineupConfirmed: false }), "confirmed");
});

test("resolveWcXiStatus falls back to lineupConfirmed and lastUpdated", () => {
  assert.equal(resolveWcXiStatus({ lineupConfirmed: true }), "confirmed");
  assert.equal(resolveWcXiStatus({ lastUpdated: 1710000000000 }), "pending");
  assert.equal(resolveWcXiStatus({}), "unavailable");
});

test("wcXiStatusChipLabel maps to user-facing copy", () => {
  assert.equal(wcXiStatusChipLabel("confirmed"), "Starting XI locked");
  assert.equal(wcXiStatusChipLabel("pending"), "Lineups updating");
  assert.equal(wcXiStatusChipLabel("unavailable"), "Pre-kickoff");
});

test("formatWcDetailAsOfEt returns ET string for valid ms", () => {
  const s = formatWcDetailAsOfEt(1717264800000);
  assert.ok(s && s.endsWith("ET"));
});
