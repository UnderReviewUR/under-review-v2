import assert from "node:assert/strict";
import { test } from "node:test";
import { buildRegistryFromFifaStatic } from "./wcPlayerRegistry.js";
import {
  WC_SQUAD_SIZE,
  WC_TEAM_COUNT,
  isWcRosterComplete,
  wcRosterCompleteness,
} from "./wcRosterCompleteness.js";

test("fifa static registry is 48x26 complete", () => {
  const registry = buildRegistryFromFifaStatic();
  const c = wcRosterCompleteness(registry);
  assert.equal(c.teamCount, WC_TEAM_COUNT);
  assert.equal(c.playerCount, WC_TEAM_COUNT * WC_SQUAD_SIZE);
  assert.equal(c.missingTeams.length, 0);
  assert.equal(c.wrongSquadSize.length, 0);
  assert.equal(isWcRosterComplete(registry), true);
  for (const team of Object.values(registry.teams)) {
    assert.equal(team.players.length, WC_SQUAD_SIZE);
  }
});
