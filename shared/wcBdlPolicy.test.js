import assert from "node:assert/strict";
import test from "node:test";

import {
  WC_BDL_GOAT_FIXTURE_ODDS_POLICY,
  WC_BDL_GOAT_MATCH_ML_RULE,
} from "./wcBdlPolicy.js";

test("WC_BDL_GOAT_FIXTURE_ODDS_POLICY forbids unposted-line copy", () => {
  assert.match(WC_BDL_GOAT_FIXTURE_ODDS_POLICY, /BDL GOAT/i);
  assert.match(WC_BDL_GOAT_FIXTURE_ODDS_POLICY, /never tell the user that book lines are unavailable/i);
  assert.doesNotMatch(WC_BDL_GOAT_FIXTURE_ODDS_POLICY, /No live 1X2 lines/i);
});

test("WC_BDL_GOAT_MATCH_ML_RULE assumes posted lines", () => {
  assert.match(WC_BDL_GOAT_MATCH_ML_RULE, /BDL posts lines for every World Cup fixture/i);
});
