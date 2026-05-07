import test from "node:test";
import assert from "node:assert/strict";

import {
  splitSentencesForUrTakeDisplay,
  takeFirstSentenceSpan,
} from "./urTakeSentenceBoundaries.js";

test("takeFirstSentenceSpan does not break on decimal in prop range", () => {
  const s =
    "That's SGA — lean his assist line if it posts in the 6.5-7.5 range. Next sentence here.";
  const { first, rest } = takeFirstSentenceSpan(s);
  assert.match(first, /6\.5-7\.5 range\.$/);
  assert.match(rest, /^Next sentence here\.$/);
});

test("takeFirstSentenceSpan does not break on single decimal stat", () => {
  const { first, rest } = takeFirstSentenceSpan("SGA averaged 6.4 assists. Still like the over.");
  assert.match(first, /6\.4 assists\.$/);
  assert.match(rest, /^Still like the over\.$/);
});

test("splitSentencesForUrTakeDisplay keeps decimals in one sentence", () => {
  const parts = splitSentencesForUrTakeDisplay("James' line (7.2 season avg). Fade the over.");
  assert.equal(parts.length, 2);
  assert.match(parts[0], /7\.2 season avg/);
  assert.match(parts[1], /Fade the over/);
});

test("splitSentencesForUrTakeDisplay: multiple decimals in one sentence", () => {
  const parts = splitSentencesForUrTakeDisplay(
    "If his line opens under 34.5 combined points we're interested. Done.",
  );
  assert.equal(parts.length, 2);
  assert.match(parts[0], /34\.5 combined/);
});
