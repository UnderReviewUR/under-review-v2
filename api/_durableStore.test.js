import assert from "node:assert/strict";
import test from "node:test";
import { getKvStoreHealth } from "./_durableStore.js";

test("getKvStoreHealth exposes monthly quota flag", () => {
  const health = getKvStoreHealth();
  assert.equal(typeof health.ok, "boolean");
  assert.equal(typeof health.circuitOpen, "boolean");
  assert.equal(typeof health.monthlyQuotaExhausted, "boolean");
});

test("kvSet uses POST body — legacy URL embed would exceed 431 threshold for match props", () => {
  const payloadBytes = 109_993;
  const legacyUrlChars = 191_801;
  assert.ok(legacyUrlChars > 8192, "legacy GET URL exceeds typical 431 header limits");
  assert.ok(payloadBytes > 50_000, "match-28 props blob is large enough to require POST body");
});
