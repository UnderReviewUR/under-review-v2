import test from "node:test";
import assert from "node:assert/strict";
import { DERBY_EXPIRES, buildDerbyContext } from "./_derby2026.js";

test("buildDerbyContext includes valid JSON bundle or editorial-only fallback", () => {
  const at = new Date(DERBY_EXPIRES.getTime() - 60_000);
  const s = buildDerbyContext(at);
  const hasCompleteJson = s.includes('"horses"') && s.includes('"event"');
  const editorialOnly = s.includes("EDITORIAL SUMMARY (full JSON omitted for length)");
  assert.ok(hasCompleteJson || editorialOnly);
  assert.ok(s.includes("TOP PLAYS"));
});

test("buildDerbyContext stays within char budget", () => {
  const at = new Date(DERBY_EXPIRES.getTime() - 60_000);
  assert.ok(buildDerbyContext(at).length <= 3000);
});

test("buildDerbyContext is empty after expiry", () => {
  const at = new Date(DERBY_EXPIRES.getTime() + 60_000);
  assert.equal(buildDerbyContext(at), "");
});
