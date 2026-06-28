import assert from "node:assert/strict";
import test from "node:test";
import { getWcQuickPrompts } from "./wcQuickPrompts.js";

test("getWcQuickPrompts — live phase", () => {
  const p = getWcQuickPrompts({ liveCount: 2, todayCount: 0 });
  assert.match(p[0], /live/i);
});

test("getWcQuickPrompts — knockout phase", () => {
  const p = getWcQuickPrompts({ tournamentPhase: "ROUND_OF_32" });
  assert.match(p[0], /knockout/i);
});

test("getWcQuickPrompts — default", () => {
  const p = getWcQuickPrompts({});
  assert.equal(p.length, 4);
  assert.match(p[0], /group-stage value|Golden Boot|mispriced|moneyline/i);
});
