import assert from "node:assert/strict";
import test from "node:test";
import {
  detectWcPlayerAgeMismatches,
  wcPlayerAgeYears,
  WC_NOTABLE_PLAYER_BIOS,
} from "./wcPlayerBio.js";
import { playerRegistryKey } from "./wcPlayerRegistry.js";

test("wcPlayerAgeYears — Yamal is 18 at Jun 2026 kickoff", () => {
  const yamal = WC_NOTABLE_PLAYER_BIOS[playerRegistryKey("Lamine Yamal", "ESP")];
  assert.equal(wcPlayerAgeYears(yamal.birthDate), 18);
});

test("detectWcPlayerAgeMismatches — flags Yamal 17", () => {
  const hit = detectWcPlayerAgeMismatches(
    "Breakout player: Lamine Yamal — 17 years old, primary winger.",
  );
  assert.ok(hit);
  assert.equal(hit.expected, 18);
  assert.equal(hit.claimed, 17);
});

test("detectWcPlayerAgeMismatches — accepts Yamal 18", () => {
  const hit = detectWcPlayerAgeMismatches("Lamine Yamal is 18 years old on this squad.");
  assert.equal(hit, null);
});
