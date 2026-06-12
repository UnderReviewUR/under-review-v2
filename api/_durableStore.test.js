import assert from "node:assert/strict";
import test from "node:test";
import { getKvStoreHealth } from "./_durableStore.js";

test("getKvStoreHealth exposes monthly quota flag", () => {
  const health = getKvStoreHealth();
  assert.equal(typeof health.ok, "boolean");
  assert.equal(typeof health.circuitOpen, "boolean");
  assert.equal(typeof health.monthlyQuotaExhausted, "boolean");
});
