import assert from "node:assert/strict";
import test from "node:test";
import { isWcHomePromoWindow, isWcTournamentWindow } from "./wc2026Constants.js";

test("isWcHomePromoWindow includes 10-day pre-kickoff lead-in", () => {
  const june1 = Date.parse("2026-06-01T16:00:00Z");
  assert.equal(isWcHomePromoWindow(june1), true);
  assert.equal(isWcTournamentWindow(june1), false);
});

test("isWcHomePromoWindow ends after tournament ET end", () => {
  const after = Date.parse("2026-07-21T12:00:00Z");
  assert.equal(isWcHomePromoWindow(after), false);
});
