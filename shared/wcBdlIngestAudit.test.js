import assert from "node:assert/strict";
import test from "node:test";
import { auditBdlPlayerPropsIngest } from "./wcBdlIngestAudit.js";

test("auditBdlPlayerPropsIngest — flags missing player lookup", () => {
  const audit = auditBdlPlayerPropsIngest(
    [{ player_id: 403, prop_type: "shots", market: { type: "milestone", odds: -135 } }],
    { player_shots_ou: [] },
    {},
  );
  assert.equal(audit.missingPlayerLookup, 1);
  assert.equal(audit.healthy, false);
  assert.match(audit.warnings.join(" "), /missing_player_lookup/);
});

test("auditBdlPlayerPropsIngest — healthy when lookup resolves rows", () => {
  const markets = {
    player_shots_ou: [
      { name: "Son Heung-min", americanOdds: "-135", line: "3", side: "over" },
    ],
  };
  const audit = auditBdlPlayerPropsIngest(
    [{ player_id: 403, prop_type: "shots", market: { type: "milestone", odds: -135 } }],
    markets,
    { 403: { name: "Son Heung-min", nationAbbr: "KOR" } },
  );
  assert.equal(audit.healthy, true);
  assert.equal(audit.normalizedCount, 1);
});

test("auditBdlPlayerPropsIngest — maps goal_or_assist rows", () => {
  const markets = {
    player_goal_or_assist: [
      { name: "Raul Jimenez", americanOdds: "+200", line: "1", side: "over" },
    ],
  };
  const audit = auditBdlPlayerPropsIngest(
    [{ player_id: 1, prop_type: "goal_or_assist", market: { type: "milestone", odds: 200 } }],
    markets,
    { 1: { name: "Raul Jimenez", nationAbbr: "MEX" } },
  );
  assert.equal(audit.mappedRowCount, 1);
  assert.equal(audit.normalizedCount, 1);
  assert.equal(audit.unmappedPropTypes.goal_or_assist, undefined);
});

test("auditBdlPlayerPropsIngest — reports intentional unmapped BDL types", () => {
  const audit = auditBdlPlayerPropsIngest(
    [{ player_id: 1, prop_type: "unknown_future_prop", market: { type: "milestone", odds: 200 } }],
    {},
    { 1: { name: "Test Player" } },
  );
  assert.equal(audit.unmappedPropTypes.unknown_future_prop, 1);
  assert.ok(audit.warnings.join(" ").includes("unmapped_prop_types"));
});
