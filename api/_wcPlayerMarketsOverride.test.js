import assert from "node:assert/strict";
import test from "node:test";
import {
  applyGoldenBootManualPatches,
  applyInjuriesManualPatches,
} from "./_wcPlayerMarketsOverride.js";

test("applyGoldenBootManualPatches merges manual odds", () => {
  const patched = applyGoldenBootManualPatches({
    rows: [{ name: "Kylian Mbappé", americanOdds: "+600", nationAbbr: "FRA" }],
    _manualPatches: [{ name: "Kylian Mbappé", americanOdds: "+450", nationAbbr: "FRA" }],
  });
  const row = patched.rows.find((r) => r.name.includes("Mbapp"));
  assert.equal(row.americanOdds, "+450");
  assert.equal(row.bookOdds.manual, "+450");
});

test("applyInjuriesManualPatches adds high-impact row", () => {
  const patched = applyInjuriesManualPatches(
    { rows: [], starsOut: [] },
    { injuryPatches: [{ name: "Neymar", teamAbbr: "BRA", status: "OUT" }] },
  );
  assert.ok(patched.rows.some((r) => /Neymar/i.test(r.name)));
  assert.ok(patched.starsOut.some((n) => /Neymar/i.test(n)));
});
