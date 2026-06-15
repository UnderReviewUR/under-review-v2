import test from "node:test";
import assert from "node:assert/strict";
import {
  isWcBdlSource,
  shouldPreferBdlRefreshOverKv,
} from "./wcBdlPolicy.js";

test("isWcBdlSource recognizes BDL variants", () => {
  assert.equal(isWcBdlSource("balldontlie"), true);
  assert.equal(isWcBdlSource("balldontlie_live"), true);
  assert.equal(isWcBdlSource("balldontlie_players_rosters"), true);
  assert.equal(isWcBdlSource("espn"), false);
});

test("shouldPreferBdlRefreshOverKv returns false when GOAT off", () => {
  const prev = process.env.WC_BDL_GOAT_PRIMARY;
  process.env.WC_BDL_GOAT_PRIMARY = "0";
  process.env.BALLDONTLIE_API_KEY = "";
  assert.equal(shouldPreferBdlRefreshOverKv({ source: "espn" }), false);
  if (prev === undefined) delete process.env.WC_BDL_GOAT_PRIMARY;
  else process.env.WC_BDL_GOAT_PRIMARY = prev;
});
