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
