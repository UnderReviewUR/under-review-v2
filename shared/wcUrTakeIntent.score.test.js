import assert from "node:assert/strict";
import test from "node:test";
import {
  WC_INTENT,
  classifyWcQuestionIntent,
  isWcScorePredictionQuestion,
} from "./wcUrTakeIntent.js";

test("isWcScorePredictionQuestion — top 5 scores", () => {
  assert.equal(isWcScorePredictionQuestion("predict the top 5 scores to consider"), true);
  assert.equal(classifyWcQuestionIntent("predict the top 5 scores to consider"), WC_INTENT.SCORE_PREDICTION);
});

test("isWcScorePredictionQuestion — not golden boot", () => {
  assert.equal(isWcScorePredictionQuestion("who wins golden boot?"), false);
});
