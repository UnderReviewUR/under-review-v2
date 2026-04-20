import test from "node:test";
import assert from "node:assert/strict";
import { simulateDraftRounds } from "./nfl-draft-engine.js";

test("simulateDraftRounds returns sensible scenario for Cowboys rounds 1-3", () => {
  const out = simulateDraftRounds({ teamAbbr: "DAL", rounds: 3, chaosMode: false });
  assert.equal(out.team, "DAL");
  assert.ok(Array.isArray(out.picks));
  assert.ok(out.picks.some((p) => p.overall === 12));
  assert.ok(out.picks.some((p) => p.overall === 20));
  assert.equal(out.chaosEvent, null);
});

test("simulateDraftRounds returns plausible chaos branch for Chiefs", () => {
  const out = simulateDraftRounds({ teamAbbr: "KC", rounds: 3, chaosMode: true });
  assert.equal(out.team, "KC");
  assert.ok(Array.isArray(out.picks));
  assert.ok(typeof out.chaosEvent === "string" && out.chaosEvent.length > 10);
});
