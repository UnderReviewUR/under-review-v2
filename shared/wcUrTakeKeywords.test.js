import assert from "node:assert/strict";
import test from "node:test";
import {
  inferWorldCupFromPlayerMarketQuestion,
  questionMentionsWorldCup,
  questionImpliesWcSoccerPlayerProp,
} from "./wcUrTakeKeywords.js";
import {
  hasNflAskLexicon,
  inferSportFromQuestionText,
} from "./urTakeSportRouting.js";
import { detectSportFromQuestion } from "../src/lib/detectSportFromQuestion.js";

test("bare home 'player props week 1' is NFL, not World Cup", () => {
  const q = "what ar ethe best player props to watch for for week 1?";
  assert.equal(inferWorldCupFromPlayerMarketQuestion(q), false);
  assert.equal(questionMentionsWorldCup(q), false);
  assert.equal(hasNflAskLexicon(q), true);
  assert.equal(inferSportFromQuestionText(q), "nfl");
  assert.equal(detectSportFromQuestion(q, "home"), "nfl");
});

test("player props with WC team is WC-shaped but coerced off the live surface", () => {
  const q = "Best player props for Brazil vs France?";
  assert.equal(inferWorldCupFromPlayerMarketQuestion(q), true);
  assert.equal(inferSportFromQuestionText(q), null);
});

test("anytime scorer keyword still looks like soccer; live surface is La Liga", () => {
  assert.equal(questionImpliesWcSoccerPlayerProp("Best anytime scorer value today?"), true);
  assert.equal(inferWorldCupFromPlayerMarketQuestion("Best anytime scorer value today?"), true);
  assert.equal(inferSportFromQuestionText("Best anytime scorer value today?"), "laliga");
  assert.equal(detectSportFromQuestion("Best anytime scorer value today?", "home"), "laliga");
});

test("bare player props alone does not force World Cup", () => {
  assert.equal(inferWorldCupFromPlayerMarketQuestion("best player props tonight?"), false);
  assert.equal(questionMentionsWorldCup("best player props tonight?"), false);
});
