import assert from "node:assert/strict";
import test from "node:test";
import {
  extractWcPlayerParlayRankCount,
  isWcLiveMatchProbabilityQuestion,
  isWcMatchProbabilityQuestion,
  isWcPlayerParlaySlateQuestion,
} from "./wcMatchProbabilityQuestion.js";
import { classifyWcQuestionIntent, WC_INTENT } from "./wcUrTakeIntent.js";
import { shouldUseWcFixtureMatchupPrebuilt } from "./wcFixtureMatchupPrebuilt.js";
import { detectParlayIntent, extractParlayLegCount } from "./detectParlayIntent.js";

test("detectParlayIntent — plural parlays", () => {
  assert.equal(detectParlayIntent("what are the best player parlays today"), true);
  assert.equal(extractParlayLegCount("rank the best 5 player parlays today"), 5);
});

test("isWcPlayerParlaySlateQuestion — slate and trap prompts", () => {
  assert.ok(isWcPlayerParlaySlateQuestion("create the best player parlays on todays slate"));
  assert.ok(isWcPlayerParlaySlateQuestion("what are the player parlay traps today"));
  assert.ok(isWcPlayerParlaySlateQuestion("what are the player parlays no one is talking about"));
  assert.equal(extractWcPlayerParlayRankCount("rank the best 5 player parlays today"), 5);
});

test("classifyWcQuestionIntent — player parlay slate is PLAYER_PROP", () => {
  assert.equal(
    classifyWcQuestionIntent("rank the best 5 player parlays today"),
    WC_INTENT.PLAYER_PROP,
  );
});

test("isWcMatchProbabilityQuestion — team goal threshold vs fixture", () => {
  const q = "what are the chances ecuador ends up scoring more than 2 goals vs ivory coast";
  assert.ok(isWcMatchProbabilityQuestion(q));
  assert.equal(classifyWcQuestionIntent(q), WC_INTENT.MATCHUP);
  assert.equal(shouldUseWcFixtureMatchupPrebuilt(q, WC_INTENT.MATCHUP, { hasKvFixture: true }), false);
});

test("isWcLiveMatchProbabilityQuestion — minute and score state", () => {
  assert.ok(
    isWcLiveMatchProbabilityQuestion(
      "its 1-0 in the 65th minute, whats the chances this ends in a draw",
    ),
  );
  assert.ok(
    isWcLiveMatchProbabilityQuestion(
      "theres 10 mins left, whats the chances ecuador gets a winner",
    ),
  );
  assert.equal(
    classifyWcQuestionIntent("theres 10 mins left, whats the chances ecuador concedes a winner"),
    WC_INTENT.MATCHUP,
  );
});

test("classifyWcQuestionIntent — named player prop beats matchup", () => {
  assert.equal(classifyWcQuestionIntent("best player prop for CIV vs ECU"), WC_INTENT.PLAYER_PROP);
  assert.equal(classifyWcQuestionIntent("Will Jimenez score vs Canada?"), WC_INTENT.PLAYER_PROP);
});
