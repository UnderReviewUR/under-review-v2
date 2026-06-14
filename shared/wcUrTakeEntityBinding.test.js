import assert from "node:assert/strict";
import test from "node:test";
import { resolveRequiredEntities } from "./wcUrTakeEntityBinding.js";
import { resolveWcPlayerPropFixtureTeams } from "./wcPlayerPropFixture.js";
import { WC_INTENT } from "./wcUrTakeIntent.js";

test("resolveRequiredEntities — this matchup inherits prior fixture teams", () => {
  const history = [
    { role: "user", content: "Best bet on SWE vs TUN if I only know the moneyline?" },
    { role: "assistant", content: "Lean Under 2.5 goals." },
  ];
  const entities = resolveRequiredEntities(
    "best player props for this matchup?",
    history,
    WC_INTENT.PLAYER_PROP,
  );
  assert.deepEqual(entities.sort(), ["SWE", "TUN"]);
});

test("resolveWcPlayerPropFixtureTeams — this game from assistant structured fixture", () => {
  const history = [
    { role: "user", content: "Best bet on SWE vs TUN if I only know the moneyline?" },
    {
      role: "assistant",
      content: "Lean Under 2.5 goals.",
      structured: { fixtureHome: "SWE", fixtureAway: "TUN", call: "Lean Under 2.5 goals" },
    },
  ];
  const teams = resolveWcPlayerPropFixtureTeams("best player props for this game?", history);
  assert.deepEqual(teams.sort(), ["SWE", "TUN"]);
});
