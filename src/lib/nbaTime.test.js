import test from "node:test";
import assert from "node:assert/strict";
import { isNbaTimeMismatch } from "./nbaTime.js";

test("pre game without start time is mismatch", () => {
  assert.equal(
    isNbaTimeMismatch({
      state: "pre",
      startTimeUtc: "",
      startTimeSource: "bdl_start_time",
    }),
    true,
  );
});

test("pre game with invalid ISO is mismatch", () => {
  assert.equal(
    isNbaTimeMismatch({
      state: "pre",
      startTimeUtc: "not-a-date",
      startTimeSource: "bdl_start_time",
    }),
    true,
  );
});

test("pre game with valid ISO is ok", () => {
  assert.equal(
    isNbaTimeMismatch({
      state: "pre",
      startTimeUtc: "2026-04-23T23:00:00Z",
      startTimeSource: "bdl_start_time",
    }),
    false,
  );
});

test("live game ignores time check", () => {
  assert.equal(
    isNbaTimeMismatch({
      state: "in",
      startTimeUtc: "",
    }),
    false,
  );
});
