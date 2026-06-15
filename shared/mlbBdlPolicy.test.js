import test from "node:test";
import assert from "node:assert/strict";
import { isMlbBdlPaidTierEnabled, isMlbBdlGamesEnabled } from "./mlbBdlPolicy.js";

test("MLB BDL defaults to free tier (no paid odds/props)", () => {
  const saved = process.env.MLB_BDL_PAID;
  delete process.env.MLB_BDL_PAID;
  assert.equal(isMlbBdlPaidTierEnabled(), false);
  if (saved === undefined) delete process.env.MLB_BDL_PAID;
  else process.env.MLB_BDL_PAID = saved;
});

test("MLB_BDL_PAID=1 enables paid BDL endpoints", () => {
  const saved = process.env.MLB_BDL_PAID;
  process.env.MLB_BDL_PAID = "1";
  assert.equal(isMlbBdlPaidTierEnabled(), true);
  if (saved === undefined) delete process.env.MLB_BDL_PAID;
  else process.env.MLB_BDL_PAID = saved;
});
