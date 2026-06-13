import assert from "node:assert/strict";
import test from "node:test";
import {
  isWcCrossGroupMispriceQuestion,
  isWcTomorrowOrSlateBetQuestion,
  extractWcSlateDayFromQuestion,
} from "./wcTakeRetentionQA.js";
import { isWcGroupSlateQuestion } from "./wcUrTakeIntent.js";
import { shouldUseWcCrossGroupValuePrebuilt } from "./wcGroupComposition.js";
import { WC_INTENT } from "./wcUrTakeIntent.js";

test("isWcTomorrowOrSlateBetQuestion matches sneaky bets tomorrow", () => {
  const q = "What are sneaky good bets for World Cup matches tomorrow?";
  assert.ok(isWcTomorrowOrSlateBetQuestion(q));
  assert.ok(isWcCrossGroupMispriceQuestion(q));
  assert.ok(isWcGroupSlateQuestion(q));
  assert.ok(!shouldUseWcCrossGroupValuePrebuilt(q, WC_INTENT.STRUCTURAL));
});

test("isWcTomorrowOrSlateBetQuestion matches best world cup bets for tomorrow", () => {
  const q = "Best World Cup bets for tomorrow?";
  assert.ok(isWcTomorrowOrSlateBetQuestion(q));
  assert.ok(!shouldUseWcCrossGroupValuePrebuilt(q, WC_INTENT.GENERAL));
});

test("isWcTomorrowOrSlateBetQuestion skips player prop questions", () => {
  const q = "Best player prop on tomorrow's World Cup matches?";
  assert.ok(!isWcTomorrowOrSlateBetQuestion(q));
});

test("extractWcSlateDayFromQuestion prefers today for today's slate prompts", () => {
  assert.equal(extractWcSlateDayFromQuestion("Best bet on today's slate"), "today");
  assert.equal(extractWcSlateDayFromQuestion("Best World Cup bets for tomorrow?"), "tomorrow");
  assert.equal(extractWcSlateDayFromQuestion("What are sneaky good bets for World Cup matches tomorrow?"), "tomorrow");
});

test("isWcSlateOutcomePredictionQuestion matches predict each game today", () => {
  const q = "predict the outcomes for each world cup game today";
  assert.ok(isWcTomorrowOrSlateBetQuestion(q));
  assert.equal(extractWcSlateDayFromQuestion(q), "today");
});
