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

test("sanitizeUrTakeBody preserves wcEventId for World Cup match scope", () => {
  const { ok, body } = sanitizeUrTakeBody({
    question: "World Cup 2026: Mexico vs South Africa",
    sportHint: "worldcup",
    wcEventId: "760415",
  });
  assert.equal(ok, true);
  assert.equal(body.wcEventId, "760415");
});

test("sanitizeUrTakeBody preserves structured flag and bettingStyle", () => {
  const { ok, body } = sanitizeUrTakeBody({
    question: "Edge?",
    sportHint: "nba",
    structured: true,
    bettingStyle: "limits",
  });
  assert.equal(ok, true);
  assert.equal(body.structured, true);
  assert.equal(body.bettingStyle, "limits");
});

test("sanitizeUrTakeBody coerces structured/bettingStyle safely", () => {
  const { ok, body } = sanitizeUrTakeBody({
    question: "x",
    structured: "yes",
    bettingStyle: "wild",
  });
  assert.equal(ok, true);
  assert.equal(body.structured, false);
  assert.equal(body.bettingStyle, "balanced");
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

test("sanitizeUrTakeBody allows large base64 image without counting it toward JSON context cap", () => {
  const bigImage = "x".repeat(900_000);
  const { ok, body } = sanitizeUrTakeBody({
    question: "Brunson PRA — read the slip",
    sportHint: "nba",
    image: { base64: bigImage, mediaType: "image/jpeg" },
  });
  assert.equal(ok, true);
  assert.equal(body.image.base64.length, 900_000);
});
