import test from "node:test";
import assert from "node:assert/strict";

import { etDateStringToEspnYmd, addCalendarDaysEt } from "./_espnEtDates.js";

// --- etDateStringToEspnYmd ---

test("etDateStringToEspnYmd strips dashes", () => {
  assert.equal(etDateStringToEspnYmd("2025-06-15"), "20250615");
});

test("etDateStringToEspnYmd handles null", () => {
  assert.equal(etDateStringToEspnYmd(null), "");
});

test("etDateStringToEspnYmd handles already-stripped input", () => {
  assert.equal(etDateStringToEspnYmd("20250615"), "20250615");
});

// --- addCalendarDaysEt ---

test("addCalendarDaysEt adds one day", () => {
  const result = addCalendarDaysEt("2025-06-15", 1);
  assert.equal(result, "2025-06-16");
});

test("addCalendarDaysEt subtracts one day", () => {
  const result = addCalendarDaysEt("2025-06-15", -1);
  assert.equal(result, "2025-06-14");
});

test("addCalendarDaysEt handles month boundary", () => {
  const result = addCalendarDaysEt("2025-01-31", 1);
  assert.equal(result, "2025-02-01");
});

test("addCalendarDaysEt handles year boundary", () => {
  const result = addCalendarDaysEt("2025-12-31", 1);
  assert.equal(result, "2026-01-01");
});

test("addCalendarDaysEt adds zero days", () => {
  const result = addCalendarDaysEt("2025-06-15", 0);
  assert.equal(result, "2025-06-15");
});

test("addCalendarDaysEt falls back to today for invalid input", () => {
  const result = addCalendarDaysEt("invalid", 0);
  assert.match(result, /^\d{4}-\d{2}-\d{2}$/);
});

test("addCalendarDaysEt handles null input", () => {
  const result = addCalendarDaysEt(null, 1);
  assert.match(result, /^\d{4}-\d{2}-\d{2}$/);
});
