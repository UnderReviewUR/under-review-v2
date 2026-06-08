import assert from "node:assert/strict";
import test from "node:test";
import {
  buildWcFullSquadBioIndex,
  detectWcPlayerAgeMismatches,
  resetWcFullSquadBioCacheForTests,
  wcFullSquadBioPlayerCount,
  wcPlayerAgeYears,
} from "./wcPlayerBio.js";

resetWcFullSquadBioCacheForTests();
import { playerRegistryKey } from "./wcPlayerRegistry.js";

test("wcPlayerAgeYears — Yamal is 18 at Jun 2026 kickoff", () => {
  const { byKey } = buildWcFullSquadBioIndex();
  const yamal = byKey.get(playerRegistryKey("Lamine Yamal", "ESP"));
  assert.ok(yamal?.birthDate);
  assert.equal(wcPlayerAgeYears(yamal.birthDate), 18);
});

test("wcFullSquadBioPlayerCount — full FIFA squads indexed", () => {
  assert.ok(wcFullSquadBioPlayerCount() >= 1200);
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
