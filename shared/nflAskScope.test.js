import assert from "node:assert/strict";
import test from "node:test";
import { resolveNflScopeTeamAbbrevSet } from "../api/_nflContext.js";
import { capNflAskScopeTeams, collectNflAskScopeFromQuestion } from "./nflAskScope.js";

const SLIP =
  "for tonights game, i bet: seahawks win, aj brown over 34.5, darnold under 249.5, doubs over 14.5, and maye under 239.5. thoughts?";

test("collectNflAskScopeFromQuestion adds NE from Brown/Doubs/Maye on a Seahawks slip", () => {
  const { teams, anchors } = collectNflAskScopeFromQuestion(SLIP);
  assert.ok(anchors.has("SEA"));
  assert.ok(teams.has("SEA"));
  assert.ok(teams.has("NE"));
});

test("resolveNflScopeTeamAbbrevSet keeps SEA+NE with null matchup", () => {
  const scope = resolveNflScopeTeamAbbrevSet(SLIP, null);
  assert.equal(scope.size, 2);
  assert.ok(scope.has("SEA"));
  assert.ok(scope.has("NE"));
});

test("capNflAskScopeTeams keeps nickname anchors when size > 2", () => {
  const capped = capNflAskScopeTeams(new Set(["SEA", "KC", "MIN"]), new Set(["SEA"]));
  assert.deepEqual([...capped], ["SEA"]);
});

test("capNflAskScopeTeams does not invent a game for a pure-prop 3-team slip", () => {
  const q =
    "i bet: aj brown over 34.5, kelce over 50.5, jefferson over 80.5, and lamb over 70.5. thoughts?";
  const { teams, anchors } = collectNflAskScopeFromQuestion(q);
  assert.equal(anchors.size, 0);
  assert.ok(teams.size > 2);
  const capped = capNflAskScopeTeams(teams, anchors);
  assert.equal(capped.size, 0);
});
