import test from "node:test";
import assert from "node:assert/strict";
import { PROSPECTS_2026 } from "./data/nfl-draft-2026.js";
import { isProspectRealisticAtPick, simulateDraftRounds } from "./nfl-draft-engine.js";

test("simulateDraftRounds returns sensible scenario for Cowboys rounds 1-3", () => {
  const out = simulateDraftRounds({ teamAbbr: "DAL", rounds: 3, chaosMode: false });
  assert.equal(out.team, "DAL");
  assert.ok(Array.isArray(out.picks));
  const overalls = out.picks.map((p) => p.overall);
  assert.ok(overalls.includes(12));
  assert.ok(overalls.includes(20));
  assert.ok(overalls.includes(92));
  const at12 = out.picks.find((p) => p.overall === 12);
  assert.ok(at12 && at12.player !== "David Bailey");
  assert.equal(out.chaosEvent, null);
});

test("consensus ranges block Bailey far above his band", () => {
  const b = PROSPECTS_2026["David Bailey"];
  assert.ok(String(b.projectedRange).includes("15"));
  assert.equal(isProspectRealisticAtPick({ projectedRange: b.projectedRange }, 3), false);
  assert.equal(isProspectRealisticAtPick({ projectedRange: b.projectedRange }, 12), false);
  assert.equal(isProspectRealisticAtPick({ projectedRange: b.projectedRange }, 18), true);
});

test("Arvell Reese stays in top band through pick 12", () => {
  const r = PROSPECTS_2026["Arvell Reese"];
  assert.match(String(r.projectedRange), /^1-/);
  assert.equal(isProspectRealisticAtPick({ projectedRange: r.projectedRange }, 12), true);
});

test("simulateDraftRounds returns plausible chaos branch for Chiefs", () => {
  const out = simulateDraftRounds({ teamAbbr: "KC", rounds: 3, chaosMode: true });
  assert.equal(out.team, "KC");
  assert.ok(Array.isArray(out.picks));
  assert.ok(typeof out.chaosEvent === "string" && out.chaosEvent.length > 10);
});
