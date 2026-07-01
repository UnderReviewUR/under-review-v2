import assert from "node:assert/strict";
import test from "node:test";
import {
  buildWcXiCaveatLine,
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

test("buildWcXiCaveatLine — confirmed XI omits caveat", () => {
  assert.equal(buildWcXiCaveatLine({ xiStatus: "confirmed" }), "");
});

test("buildWcXiCaveatLine — pending and unavailable copy", () => {
  assert.match(buildWcXiCaveatLine({ xiStatus: "pending" }), /updating/i);
  assert.match(buildWcXiCaveatLine({}), /Pre-kickoff/i);
});

test("buildWcXiCaveatLine — a match enriched with a confirmed lineup drops the 'no Starting XI' caveat", () => {
  // Regression: pre-match fixtures were passed to the prebuilt as bare KV rows (no lineup
  // fields) and always reported "no confirmed Starting XI yet" even after lineups dropped.
  // Once the match detail is loaded and merged (lineupConfirmed:true), the caveat must clear.
  const bare = buildWcXiCaveatLine({ homeTeam: "MEX", awayTeam: "ECU", status: "NS" });
  assert.match(bare, /no confirmed Starting XI yet/i);

  const enriched = buildWcXiCaveatLine({
    homeTeam: "MEX",
    awayTeam: "ECU",
    status: "NS",
    lineupConfirmed: true,
    lastUpdated: Date.now(),
  });
  assert.equal(enriched, "");
});
