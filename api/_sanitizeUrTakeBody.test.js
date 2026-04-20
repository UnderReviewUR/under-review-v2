import test from "node:test";
import assert from "node:assert/strict";
import { sanitizeUrTakeBody } from "./_sanitizeUrTakeBody.js";

test("sanitizeUrTakeBody strips unknown keys", () => {
  const { ok, body } = sanitizeUrTakeBody({
    question: "hello",
    hacker: "drop table",
  });
  assert.equal(ok, true);
  assert.equal(body.question, "hello");
  assert.equal("hacker" in body, false);
});

test("sanitizeUrTakeBody caps question length", () => {
  const long = "x".repeat(20000);
  const { ok, body } = sanitizeUrTakeBody({ question: long });
  assert.equal(ok, true);
  assert.ok(body.question.length <= 12000);
});

test("sanitizeUrTakeBody golden snapshot for minimal ask", () => {
  const { ok, body } = sanitizeUrTakeBody({
    question: "Best NBA prop tonight?",
    sportHint: "nba",
    userEmail: "a@b.com",
  });
  assert.equal(ok, true);
  assert.deepEqual(body, {
    question: "Best NBA prop tonight?",
    sportHint: "nba",
    userEmail: "a@b.com",
  });
});
