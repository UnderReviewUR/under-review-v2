import test from "node:test";
import assert from "node:assert/strict";
import {
  isSubstantiveClosing,
  peelClosingFromMain,
  splitLastSentence,
} from "./urTakeClosingSentence.js";

test("single sentence ending in period does not produce closing peel", () => {
  const src = "Best read tonight is the pace-over with both teams top-10 in tempo.";
  const { closing } = peelClosingFromMain(src);
  assert.equal(closing, null);
});

test('"Try again." does not produce closing peel', () => {
  const { closing } = peelClosingFromMain("Try again.");
  assert.equal(closing, null);
});

test('"Wait for Game 2." produces substantive closing when preceded by another sentence', () => {
  const src = "Series context favors the favorite.\n\nWait for Game 2.";
  const { closing, rest } = peelClosingFromMain(src);
  assert.ok(closing && /Wait for Game 2/.test(closing));
  assert.ok(!rest.includes("Wait for Game 2"));
});

test("splitLastSentence falls through when only terminal punctuation would split", () => {
  const r = splitLastSentence("Only sentence.");
  assert.equal(r.body, "");
  assert.equal(r.last, "Only sentence.");
});

test("isSubstantiveClosing rejects punctuation-only", () => {
  assert.equal(isSubstantiveClosing("."), false);
  assert.equal(isSubstantiveClosing("Good."), true);
});
