import test from "node:test";
import assert from "node:assert/strict";

import { formatUrTakeTimestampEt } from "./urTakeTimestampEt.js";

test("formatUrTakeTimestampEt accepts valid epoch ms", () => {
  const s = formatUrTakeTimestampEt(1_700_000_000_000);
  assert.ok(typeof s === "string");
  assert.ok(s.endsWith("ET"));
});

test("formatUrTakeTimestampEt nullish and empty string → null", () => {
  assert.equal(formatUrTakeTimestampEt(null), null);
  assert.equal(formatUrTakeTimestampEt(undefined), null);
  assert.equal(formatUrTakeTimestampEt(""), null);
});

test("formatUrTakeTimestampEt rejects symbol and function without throwing", () => {
  assert.equal(formatUrTakeTimestampEt(Symbol("x")), null);
  assert.equal(
    formatUrTakeTimestampEt(() => {}),
    null,
  );
});

test("formatUrTakeTimestampEt invalid date inputs → null", () => {
  assert.equal(formatUrTakeTimestampEt({}), null);
  assert.equal(formatUrTakeTimestampEt([]), null);
  assert.equal(formatUrTakeTimestampEt("not-a-real-date-zzz"), null);
});

test("formatUrTakeTimestampEt bigint coerces inside Date (or null if invalid)", () => {
  const out = formatUrTakeTimestampEt(BigInt(1_700_000_000_000));
  assert.ok(out === null || out.endsWith("ET"));
});
