import test from "node:test";
import assert from "node:assert/strict";
import { DERBY_EXPIRES } from "./data/derby2026.js";
import { questionReferencesDerby } from "./derbyIntent.js";

const activeDay = new Date(DERBY_EXPIRES.getTime() - 86_400_000);
const expiredDay = new Date(DERBY_EXPIRES.getTime() + 86_400_000);

test("Kentucky Derby phrase matches during active window", () => {
  assert.equal(
    questionReferencesDerby("Strongest play in the Kentucky Derby tonight?", { at: activeDay }),
    true,
  );
});

test("generic board question does not match", () => {
  assert.equal(
    questionReferencesDerby("Best value on the board today?", { at: activeDay }),
    false,
  );
});

test("Arkansas Derby does not hijack Kentucky Derby routing", () => {
  assert.equal(
    questionReferencesDerby("Who wins the Arkansas Derby?", { at: activeDay }),
    false,
  );
});

test("Kentucky alone does not match (narrow routing)", () => {
  assert.equal(questionReferencesDerby("Kentucky basketball line?", { at: activeDay }), false);
});

test("restricted horse name does not match without Derby companion", () => {
  assert.equal(questionReferencesDerby("Is Renegade live?", { at: activeDay }), false);
});

test("restricted horse name matches with Derby companion", () => {
  assert.equal(
    questionReferencesDerby("Is Renegade a Kentucky Derby fade?", { at: activeDay }),
    true,
  );
});

test("inactive window returns false even with derby phrase", () => {
  assert.equal(
    questionReferencesDerby("Kentucky Derby angles?", { at: expiredDay }),
    false,
  );
});

test("requireActive false allows testing phrase logic after expiry", () => {
  assert.equal(
    questionReferencesDerby("Kentucky Derby angles?", {
      at: expiredDay,
      requireActive: false,
    }),
    true,
  );
});
