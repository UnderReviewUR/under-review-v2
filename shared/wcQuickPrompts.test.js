import assert from "node:assert/strict";
import test from "node:test";
import { getWcQuickPrompts } from "./wcQuickPrompts.js";

test("getWcQuickPrompts — live phase", () => {
  const p = getWcQuickPrompts({ liveCount: 2, todayCount: 0 });
  assert.match(p[0], /live/i);
});

test("getWcQuickPrompts — default", () => {
  const p = getWcQuickPrompts({});
  assert.equal(p.length, 3);
  assert.match(p[0], /predictions|roundup|winner|dark horse/i);
});
