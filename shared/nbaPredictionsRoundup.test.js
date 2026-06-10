import assert from "node:assert/strict";
import test from "node:test";
import {
  detectNbaRoundupUnnamedMarketOdds,
  detectNbaSeriesChampionshipBleed,
  expectedNbaPredictionSlots,
  isNbaPredictionsRoundupQuestion,
  parseNbaPredictionSlots,
} from "./nbaPredictionsRoundup.js";
import { classifyNbaQuestionIntent, NBA_INTENT } from "./nbaUrTakeIntent.js";
import {
  nbaPredictionsRoundupQaRequiresRegeneration,
  runNbaPredictionsRoundupQA,
} from "../api/_nbaPredictionsRoundupQA.js";
import { runUnderReviewPostProcess } from "../api/_urTakeOutputQA.js";

const NBA_Q =
  "Give me your NBA Finals predictions — series favorites, breakout player, and best scoring prop";

const GOOD_TAKE = `Series favorites: Knicks +180 — books underprice home-court path vs Spurs in a tight series (~36% implied vs ~45% structural lean).
Breakout player: Stephon Castle — expanded Finals minutes if Wembanyama sits; usage spikes in short rotations.
Scoring prop: Jalen Brunson over 25.5 points — playoff pace ~26.4 PPG; medium-confidence lean, not a lock.
Lean: Knicks +180 series — Brunson usage and home court flip the close read.`;

test("isNbaPredictionsRoundupQuestion — multi-slot paraphrase", () => {
  assert.ok(isNbaPredictionsRoundupQuestion(NBA_Q));
  assert.equal(classifyNbaQuestionIntent(NBA_Q), NBA_INTENT.PREDICTIONS_ROUNDUP);
  assert.equal(expectedNbaPredictionSlots(NBA_Q).length, 3);
});

test("parseNbaPredictionSlots — labeled lines", () => {
  const slots = parseNbaPredictionSlots(GOOD_TAKE);
  assert.equal(slots.length, 3);
  assert.equal(slots[0].key, "seriesFavorites");
  assert.match(slots[2].value, /over 25\.5 points/i);
});

test("detectNbaSeriesChampionshipBleed — flags championship wording without series", () => {
  assert.ok(
    detectNbaSeriesChampionshipBleed("Lakers win the NBA championship at +900 — value play."),
  );
  assert.equal(
    detectNbaSeriesChampionshipBleed("Knicks +180 series — home court edge."),
    null,
  );
});

test("detectNbaRoundupUnnamedMarketOdds — breakout adjusted odds", () => {
  const slots = parseNbaPredictionSlots(
    "Breakout player: Castle — +1200 adjusted odds without a market label.",
  );
  assert.ok(detectNbaRoundupUnnamedMarketOdds(slots));
});

test("runNbaPredictionsRoundupQA — good take passes", () => {
  const qa = runNbaPredictionsRoundupQA({
    responseText: GOOD_TAKE,
    question: NBA_Q,
    nbaIntent: NBA_INTENT.PREDICTIONS_ROUNDUP,
  });
  assert.equal(qa.passed, true, qa.issueCodes.join(", "));
});

test("runUnderReviewPostProcess — not a lock does not regen NBA prop take", () => {
  const post = runUnderReviewPostProcess(GOOD_TAKE, { sport: "nba" });
  assert.equal(post.qa.shouldRegenerate, false, post.qa.criticalRegenerationCodes.join(", "));
});

test("nbaPredictionsRoundupQaRequiresRegeneration — incomplete slots", () => {
  const qa = runNbaPredictionsRoundupQA({
    responseText: "Knicks win the series.",
    question: NBA_Q,
    nbaIntent: NBA_INTENT.PREDICTIONS_ROUNDUP,
  });
  assert.equal(qa.passed, false);
  assert.ok(nbaPredictionsRoundupQaRequiresRegeneration(qa));
});
