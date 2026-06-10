import assert from "node:assert/strict";
import test from "node:test";
import {
  countUrUserTurns,
  isUrFirstAnswerRow,
  isUrFocusSession,
  urUserTurnNumberAtAiIndex,
} from "./urFocusSession.js";

test("isUrFocusSession is true for first and second user turns only", () => {
  const one = [{ role: "user" }, { role: "ai", loading: false }];
  const two = [...one, { role: "user" }, { role: "ai", loading: false }];
  const three = [...two, { role: "user" }];
  assert.equal(isUrFocusSession([]), false);
  assert.equal(isUrFocusSession(one), true);
  assert.equal(isUrFocusSession(two), true);
  assert.equal(isUrFocusSession(three), false);
});

test("isUrFirstAnswerRow detects first AI reply", () => {
  const msgs = [
    { role: "user", text: "q1" },
    { role: "ai", loading: false, text: "a1" },
    { role: "user", text: "q2" },
    { role: "ai", loading: false, text: "a2" },
  ];
  assert.equal(isUrFirstAnswerRow(msgs, 1, msgs[1]), true);
  assert.equal(isUrFirstAnswerRow(msgs, 3, msgs[3]), false);
  assert.equal(urUserTurnNumberAtAiIndex(msgs, 3), 2);
  assert.equal(countUrUserTurns(msgs), 2);
});
