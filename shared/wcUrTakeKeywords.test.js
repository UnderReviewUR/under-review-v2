import test from "node:test";
import assert from "node:assert/strict";

import { questionMentionsWorldCup } from "./wcUrTakeKeywords.js";
import { inferSportFromQuestionText, resolveSportHint } from "./urTakeSportRouting.js";

test("Paraguay routes to World Cup", () => {
  assert.equal(questionMentionsWorldCup("Can Paraguay get out of Group D?"), true);
  assert.equal(inferSportFromQuestionText("Can Paraguay get out of Group D?"), "worldcup");
});

test("Group letter routes to World Cup", () => {
  assert.equal(questionMentionsWorldCup("Who tops Group C?"), true);
});

test("USA soccer routes to World Cup", () => {
  assert.equal(questionMentionsWorldCup("USA soccer golden boot pick"), true);
});

test("question text beats golf tab hint", () => {
  const h = resolveSportHint({
    incomingSportHint: "golf",
    question: "Paraguay path out of the group stage?",
    matchupContext: null,
    hasImage: false,
    golfContext: { currentEvent: { name: "PGA Championship" } },
  });
  assert.equal(h, "worldcup");
});

test("Jordan alone does not force World Cup", () => {
  assert.equal(questionMentionsWorldCup("Jordan PRA prop tonight"), false);
});
