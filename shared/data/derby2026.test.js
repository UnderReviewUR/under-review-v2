import test from "node:test";
import assert from "node:assert/strict";
import { DERBY_EXPIRES, isDerbyActive } from "./derby2026.js";

test("isDerbyActive is true before expiry", () => {
  assert.equal(isDerbyActive(new Date(DERBY_EXPIRES.getTime() - 60_000)), true);
});

test("isDerbyActive is false at or after expiry", () => {
  assert.equal(isDerbyActive(new Date(DERBY_EXPIRES.getTime())), false);
  assert.equal(isDerbyActive(new Date(DERBY_EXPIRES.getTime() + 60_000)), false);
});
