import assert from "node:assert/strict";
import test from "node:test";
import {
  isWcCrossGroupMispriceQuestion,
  isWcTomorrowOrSlateBetQuestion,
} from "./wcTakeRetentionQA.js";
import { isWcGroupSlateQuestion } from "./wcUrTakeIntent.js";
import { shouldUseWcCrossGroupValuePrebuilt } from "./wcGroupComposition.js";
import { WC_INTENT } from "./wcUrTakeIntent.js";

test("isWcTomorrowOrSlateBetQuestion matches sneaky bets tomorrow", () => {
  const q = "What are sneaky good bets for World Cup matches tomorrow?";
  assert.ok(isWcTomorrowOrSlateBetQuestion(q));
  assert.ok(isWcCrossGroupMispriceQuestion(q));
  assert.ok(isWcGroupSlateQuestion(q));
  assert.ok(shouldUseWcCrossGroupValuePrebuilt(q, WC_INTENT.STRUCTURAL));
});

test("isWcTomorrowOrSlateBetQuestion skips player prop questions", () => {
  const q = "Best player prop on tomorrow's World Cup matches?";
  assert.ok(!isWcTomorrowOrSlateBetQuestion(q));
});
