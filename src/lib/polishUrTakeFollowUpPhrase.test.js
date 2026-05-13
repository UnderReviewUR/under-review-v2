import test from "node:test";
import assert from "node:assert/strict";
import { polishUrTakeFollowUpPhrase } from "./polishUrTakeFollowUpPhrase.js";

test("maps fragment parlay chips to full phrases", () => {
  assert.equal(polishUrTakeFollowUpPhrase("Best single leg"), "What's the best single leg?");
  assert.equal(polishUrTakeFollowUpPhrase("Sharpen to 2 legs"), "Sharpen this to 2 legs.");
  assert.equal(polishUrTakeFollowUpPhrase("What breaks this parlay"), "What breaks this parlay?");
});

test("keeps already-punctuated API strings when not in map", () => {
  assert.equal(polishUrTakeFollowUpPhrase("Still like this line?"), "Still like this line?");
});

test("adds question mark for obvious questions", () => {
  assert.equal(polishUrTakeFollowUpPhrase("What is the live edge"), "What is the live edge?");
});

test("adds period for imperative fragments", () => {
  assert.equal(polishUrTakeFollowUpPhrase("Narrow to one play"), "Narrow to one play.");
});
