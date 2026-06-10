import assert from "node:assert/strict";
import test from "node:test";
import { classifyNbaQuestionIntent, NBA_INTENT } from "./nbaUrTakeIntent.js";

test("classifyNbaQuestionIntent — distinguishes series vs MVP", () => {
  assert.equal(
    classifyNbaQuestionIntent("Are the Knicks mispriced to win the Finals series?"),
    NBA_INTENT.SERIES_WINNER,
  );
  assert.equal(
    classifyNbaQuestionIntent("Finals MVP value on Wembanyama at +220"),
    NBA_INTENT.FINALS_MVP,
  );
  assert.equal(classifyNbaQuestionIntent("Who wins the series?"), NBA_INTENT.SERIES_WINNER);
  assert.equal(
    classifyNbaQuestionIntent("Game 3 preview — who has the edge?"),
    NBA_INTENT.PREGAME_MATCHUP,
  );
});

test("classifyNbaQuestionIntent — predictions roundup multi-slot", () => {
  assert.equal(
    classifyNbaQuestionIntent(
      "Give me your NBA Finals predictions — series favorites, breakout player, and best scoring prop",
    ),
    NBA_INTENT.PREDICTIONS_ROUNDUP,
  );
});

test("classifyNbaQuestionIntent — Game 3 pregame vs live false positives", () => {
  assert.equal(
    classifyNbaQuestionIntent("Who covers the spread in Game 3?"),
    NBA_INTENT.PREGAME_MATCHUP,
  );
  assert.equal(
    classifyNbaQuestionIntent("Best prop angle on Jalen Brunson tonight?"),
    NBA_INTENT.PROP_PLAYER,
  );
  assert.equal(
    classifyNbaQuestionIntent("Is Victor Wembanyama playing tonight?"),
    NBA_INTENT.GENERAL,
  );
  assert.equal(
    classifyNbaQuestionIntent("Who is starting for the Knicks tonight?"),
    NBA_INTENT.GENERAL,
  );
  assert.equal(
    classifyNbaQuestionIntent("We're in Q2 of Knicks vs Spurs — live Brunson props?"),
    NBA_INTENT.LIVE_IN_GAME,
  );
});
