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
