import test from "node:test";
import assert from "node:assert/strict";

import { isKvFresh } from "./selfHealingKv.js";

test("isKvFresh returns true when within maxAge", () => {
  const now = 1000000;
  assert.equal(isKvFresh(now - 500, 1000, now), true);
});

test("isKvFresh returns false when past maxAge", () => {
  const now = 1000000;
  assert.equal(isKvFresh(now - 2000, 1000, now), false);
});

test("isKvFresh returns false for null refreshedAtMs", () => {
  assert.equal(isKvFresh(null, 1000, Date.now()), false);
});

test("isKvFresh returns false for undefined refreshedAtMs", () => {
  assert.equal(isKvFresh(undefined, 1000, Date.now()), false);
});

test("isKvFresh returns false for zero refreshedAtMs", () => {
  assert.equal(isKvFresh(0, 1000, Date.now()), false);
});

test("isKvFresh returns false for negative refreshedAtMs", () => {
  assert.equal(isKvFresh(-100, 1000, Date.now()), false);
});

test("isKvFresh returns true at exact boundary (just under)", () => {
  const now = 2000;
  assert.equal(isKvFresh(1001, 1000, now), true);
});

test("isKvFresh returns false at exact boundary (equal age)", () => {
  const now = 2000;
  assert.equal(isKvFresh(1000, 1000, now), false);
});
