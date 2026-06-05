import test from "node:test";
import assert from "node:assert/strict";
import {
  FREE_QUESTION_LIMIT,
  getFreeUsedStorageKey,
  getFreeUsedStorageKeyForDay,
  getLocalDateKey,
  getUtcDateKey,
  incrementFreeTierUsedToday,
  isFreeTierQuotaAvailable,
  readFreeTierUsedToday,
} from "./freeTierLimits.js";

test("FREE_QUESTION_LIMIT is 3 per day", () => {
  assert.equal(FREE_QUESTION_LIMIT, 3);
});

test("daily storage key includes UTC calendar day", () => {
  const key = getFreeUsedStorageKey(new Date("2026-05-21T15:00:00Z"));
  assert.equal(key, "ur_free_used_2026-05-21");
});

test("readFreeTierUsedToday resets when date key changes", () => {
  const storage = new Map();
  const prev = globalThis.localStorage;
  globalThis.localStorage = {
    getItem: (k) => storage.get(k) ?? null,
    setItem: (k, v) => storage.set(k, v),
    removeItem: (k) => storage.delete(k),
  };

  const yesterdayKey = getFreeUsedStorageKeyForDay(getUtcDateKey(new Date("2026-05-20T12:00:00Z")));
  const todayKey = getFreeUsedStorageKeyForDay(getUtcDateKey());

  storage.set(yesterdayKey, "2");
  assert.equal(readFreeTierUsedToday(), 0);

  storage.set(todayKey, "2");
  assert.equal(readFreeTierUsedToday(), 2);
  assert.equal(isFreeTierQuotaAvailable(2, 3), true);
  assert.equal(isFreeTierQuotaAvailable(3, 3), false);

  globalThis.localStorage = prev;
});

test("incrementFreeTierUsedToday bumps today key only", () => {
  const storage = new Map();
  const prev = globalThis.localStorage;
  globalThis.localStorage = {
    getItem: (k) => storage.get(k) ?? null,
    setItem: (k, v) => storage.set(k, v),
    removeItem: (k) => storage.delete(k),
  };

  assert.equal(incrementFreeTierUsedToday(), 1);
  assert.equal(readFreeTierUsedToday(), 1);

  globalThis.localStorage = prev;
});

test("getLocalDateKey uses local calendar day", () => {
  const key = getLocalDateKey(new Date(2026, 4, 21, 23, 30));
  assert.match(key, /^\d{4}-\d{2}-\d{2}$/);
});
