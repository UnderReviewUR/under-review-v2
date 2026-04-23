import test from "node:test";
import assert from "node:assert/strict";
import { shouldRetainRecentFinishedTennisFinals } from "./tennisIntent.js";

test("home intent drops recent-finals retention window", () => {
  assert.equal(shouldRetainRecentFinishedTennisFinals("home"), false);
});

test("board intent keeps retention policy", () => {
  assert.equal(shouldRetainRecentFinishedTennisFinals("board"), true);
  assert.equal(shouldRetainRecentFinishedTennisFinals(""), true);
});
