import assert from "node:assert/strict";
import test from "node:test";
import { questionMentionsWorldCup } from "./wcUrTakeKeywords.js";

test("questionMentionsWorldCup — hyphenated group-stage", () => {
  assert.equal(
    questionMentionsWorldCup(
      "What's the best group-stage value bet right now — one pick, direct answer?",
    ),
    true,
  );
});

test("questionMentionsWorldCup — soccer prop line without nation name (home page)", () => {
  assert.equal(questionMentionsWorldCup("Jimenez 2+ shots?"), true);
  assert.equal(questionMentionsWorldCup("Son 2.5 shots?"), true);
  assert.equal(questionMentionsWorldCup("Raul Jimenez to score or assist"), true);
  assert.equal(questionMentionsWorldCup("Mexico team to score the first goal"), true);
});

test("questionMentionsWorldCup — does not steal obvious NBA questions", () => {
  assert.equal(questionMentionsWorldCup("Wembanyama rebounds over 11.5"), false);
});
