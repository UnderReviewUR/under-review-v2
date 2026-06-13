import { test } from "node:test";
import assert from "node:assert/strict";
import {
  FIFA2026_ANNEX_C_ASSIGNMENTS,
  assignThirdPlaceToR32SlotsAnnexC,
  buildAnnexCCombinationKey,
  lookupAnnexCAssignment,
} from "./wc2026AnnexC.js";
import { WC2026_KNOCKOUT_BRACKET } from "./wc2026KnockoutBracket.js";

test("FIFA2026_ANNEX_C_ASSIGNMENTS — 495 combinations", () => {
  assert.equal(Object.keys(FIFA2026_ANNEX_C_ASSIGNMENTS).length, 495);
});

test("buildAnnexCCombinationKey — sorted comma join", () => {
  assert.equal(buildAnnexCCombinationKey(["H", "A", "C", "B", "G", "F", "E", "D"]), "A,B,C,D,E,F,G,H");
});

test("lookupAnnexCAssignment — ABCDEFGH row matches Annex C #1", () => {
  const rows = "ABCDEFGH".split("").map((group) => ({ group, team: { abbreviation: `T${group}` } }));
  const mapping = lookupAnnexCAssignment(rows);
  assert.deepEqual(mapping, {
    "1A": "3H",
    "1B": "3G",
    "1D": "3B",
    "1E": "3C",
    "1G": "3A",
    "1I": "3F",
    "1K": "3D",
    "1L": "3E",
  });
});

test("assignThirdPlaceToR32SlotsAnnexC — maps M79 1A vs third from H", () => {
  const r32 = WC2026_KNOCKOUT_BRACKET.find((r) => r.round === "r32")?.matches || [];
  const bestThird = "ABCDEFGH".split("").map((group) => ({
    team: { abbreviation: `T${group}` },
    group,
  }));

  const byNum = assignThirdPlaceToR32SlotsAnnexC(r32, bestThird);
  assert.equal(byNum.get(79)?.abbreviation, "TH");
});
