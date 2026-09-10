import assert from "node:assert/strict";
import test from "node:test";
import { resolveNflScopeTeamAbbrevSet } from "../api/_nflContext.js";
import { capNflAskScopeTeams, collectNflAskScopeFromQuestion, nflAskNamedPlayerHits } from "./nflAskScope.js";

const SLIP =
  "for tonights game, i bet: seahawks win, aj brown over 34.5, darnold under 249.5, doubs over 14.5, and maye under 239.5. thoughts?";

test("collectNflAskScopeFromQuestion adds NE from Brown/Doubs/Maye on a Seahawks slip", () => {
  const { teams, anchors } = collectNflAskScopeFromQuestion(SLIP);
  assert.ok(anchors.has("SEA"));
  assert.ok(teams.has("SEA"));
  assert.ok(teams.has("NE"));
});

test("rams vs 49ers resolves both teams, not first nickname only", () => {
  const q = "best player props for the rams vs 49ers game tonight?";
  const { teams, anchors } = collectNflAskScopeFromQuestion(q);
  assert.ok(anchors.has("LAR"), [...anchors].join(","));
  assert.ok(anchors.has("SF"), [...anchors].join(","));
  const scope = resolveNflScopeTeamAbbrevSet(q, null);
  assert.ok(scope.has("LAR"));
  assert.ok(scope.has("SF"));
  assert.equal(scope.size, 2);
});

test("kittle / kyren / mccaffrey follow-up scopes SF+LAR with no team nick", () => {
  const q = "any good props for kittle, kyren, kittle? mccaffrey?";
  const named = nflAskNamedPlayerHits(q);
  assert.ok(named.tokens.includes("kittle"));
  assert.ok(named.tokens.includes("kyren"));
  assert.ok(named.tokens.includes("mccaffrey"));
  const { teams } = collectNflAskScopeFromQuestion(q);
  assert.ok(teams.has("SF"), [...teams].join(","));
  assert.ok(teams.has("LAR"), [...teams].join(","));
  const scope = resolveNflScopeTeamAbbrevSet(q, null);
  assert.ok(scope.has("SF"));
  assert.ok(scope.has("LAR"));
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
