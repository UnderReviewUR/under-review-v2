import assert from "node:assert/strict";
import test from "node:test";
import { isUrLatestCompleteAiRow } from "./urFocusSession.js";

test("isUrLatestCompleteAiRow — last completed AI only", () => {
  const msgs = [
    { role: "user", text: "a" },
    { role: "ai", text: "first", loading: false },
    { role: "user", text: "b" },
    { role: "ai", text: "second", loading: false },
  ];
  assert.equal(isUrLatestCompleteAiRow(msgs, 1, msgs[1]), false);
  assert.equal(isUrLatestCompleteAiRow(msgs, 3, msgs[3]), true);
});
