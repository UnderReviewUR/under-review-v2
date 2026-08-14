import assert from "node:assert/strict";
import test from "node:test";
import { classifyNflGamePhase, formatNflGameStateLine } from "./nflGameState.js";

test("scheduled before kickoff is pregame", () => {
  const tip = Date.parse("2026-09-13T17:00:00.000Z");
  assert.equal(classifyNflGamePhase({ status: "scheduled", tipoffMs: tip }, tip - 60_000), "pregame");
  assert.match(formatNflGameStateLine({ status: "scheduled", tipoffMs: tip }, tip - 60_000), /pregame/);
});

test("inprogress is live even before we have a score", () => {
  assert.equal(classifyNflGamePhase({ status: "inprogress" }), "live");
  assert.equal(formatNflGameStateLine({ status: "inprogress" }), "LIVE");
});

test("final is final", () => {
  assert.equal(classifyNflGamePhase({ status: "final" }), "final");
  assert.equal(formatNflGameStateLine({ status: "closed" }), "final");
});

test("scheduled past kickoff stays pregame — do not invent LIVE", () => {
  const tip = Date.parse("2026-08-14T23:00:00.000Z");
  const now = tip + 15 * 60 * 1000;
  assert.equal(classifyNflGamePhase({ status: "scheduled", tipoffMs: tip }, now), "pregame");
  assert.match(formatNflGameStateLine({ status: "scheduled", tipoffMs: tip }, now), /pregame/);
});
