import test from "node:test";
import assert from "node:assert/strict";

/**
 * detectIntent lives in ur-take.js (ordering vs fade/sleeper/outright).
 * Slip routing helpers are tested without loading the handler in api/_slipImageIntent.test.js
 */
import { detectIntent } from "./ur-take.js";

test("detectIntent — image + thoughts? → slip_review (vision pass confirms betting UI)", () => {
  assert.equal(detectIntent("thoughts?", true), "slip_review");
});

test("detectIntent — image + empty message → slip_review (vague / image-first; same routing as thoughts?)", () => {
  assert.equal(detectIntent("", true), "slip_review");
});

test("detectIntent — image + who won? → general (not slip_review)", () => {
  assert.equal(detectIntent("who won?", true), "general");
});

test("detectIntent — image + fade this team total → fade, not slip_review", () => {
  assert.equal(detectIntent("fade this team total", true), "fade");
});

test("detectIntent — slip_review when copy looks like a slip (or keyword betting UI)", () => {
  assert.equal(detectIntent("check my parlay", true), "slip_review");
  assert.equal(detectIntent("what do you think of these odds", true), "slip_review");
});

test("detectIntent — image + analyze screenshot markets routes slip_review", () => {
  assert.equal(
    detectIntent("analyze the options on this screenshot. whats best to play?", true),
    "slip_review",
  );
  assert.equal(detectIntent("see attached", true), "slip_review");
});
