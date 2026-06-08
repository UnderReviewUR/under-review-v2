import assert from "node:assert/strict";
import test from "node:test";
import {
  capWcDeepWords,
  endsWithEllipsisTruncation,
  isWcCompleteSentence,
  splitWcSentences,
  wcWordCount,
} from "./wcSentenceBoundaries.js";

test("splitWcSentences respects decimals", () => {
  const s = splitWcSentences("Spain wins 45.2% of sims. France path is shorter.");
  assert.equal(s.length, 2);
  assert.match(s[0], /45\.2%/);
});

test("splitWcSentences keeps American odds intact", () => {
  const s = splitWcSentences("Market +600 · UR path ~+318. Pass at +600.");
  assert.equal(s.length, 2);
  assert.match(s[0], /\+600/);
});

test("splitWcSentences handles parentheses", () => {
  const s = splitWcSentences("Germany (Contender) is undervalued. Netherlands path is a coin flip.");
  assert.equal(s.length, 2);
  assert.match(s[0], /\(Contender\)/);
});

test("splitWcSentences handles vs abbreviation", () => {
  const s = splitWcSentences("France vs Norway is a path read. Lean France.");
  assert.equal(s.length, 2);
});

test("isWcCompleteSentence rejects ellipsis truncation", () => {
  assert.equal(isWcCompleteSentence("Market has the name — France's path is what…"), false);
  assert.equal(endsWithEllipsisTruncation("Books price Spain to win…"), true);
});

test("isWcCompleteSentence accepts list stub", () => {
  assert.equal(
    isWcCompleteSentence("Top 5 — tap to view full breakdown.", { allowListStub: true }),
    true,
  );
});

test("capWcDeepWords safety cap only", () => {
  const words = Array.from({ length: 650 }, (_, i) => `w${i}`).join(" ");
  const capped = capWcDeepWords(words, 600);
  assert.equal(wcWordCount(capped.replace(/…$/, "")), 600);
});
