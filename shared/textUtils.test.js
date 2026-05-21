import assert from "node:assert/strict";
import test from "node:test";

import { dropIncompleteSentenceFragment, trimToCompleteSentence } from "./textUtils.js";

test("trimToCompleteSentence ends on punctuation before maxChars", () => {
  const text =
    "OKC's rim protection sets the edge. The market is overweight on narrative while pace control decides the cover.";
  const out = trimToCompleteSentence(text, 72);
  assert.ok(!/\bCar\b/.test(out));
  assert.ok(!out.endsWith("Car"));
  assert.match(out, /[.!?]$/);
  assert.ok(out.length <= 72);
});

test("trimToCompleteSentence drops window with no sentence end", () => {
  const text = "This fragment has no terminal stop until the very end.";
  const out = trimToCompleteSentence("This fragment has no terminal", 24);
  assert.equal(out, "");
});

test("dropIncompleteSentenceFragment strips trailing incomplete clause", () => {
  assert.equal(dropIncompleteSentenceFragment("First sentence. Second starts here"), "First sentence.");
  assert.equal(dropIncompleteSentenceFragment("No punctuation at all"), "");
});
