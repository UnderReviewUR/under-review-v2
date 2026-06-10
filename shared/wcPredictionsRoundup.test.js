import assert from "node:assert/strict";
import test from "node:test";
import {
  expectedWcPredictionSlots,
  isWcPredictionsRoundupQuestion,
  parseWcPredictionSlots,
  wcPredictionsRoundupMissingSlots,
} from "./wcPredictionsRoundup.js";
import { buildWcCompactStructured } from "./wcUrTakeCompactDelivery.js";
import { classifyWcQuestionIntent, WC_INTENT } from "./wcUrTakeIntent.js";
import { runWcUrTakeQA } from "../api/_wcUrTakeQA.js";

const ROUNDUP_Q =
  "The World Cup starts this week! Let's hear your predictions: 🏆 Winners: 🐎 Dark horse: 📈 Breakout player: 🔝 Top goalscorer:";

const ROUNDUP_DEEP = `Winners: Spain — sims make them the path favorite at 44% with the softest bracket.
Dark horse: Norway — books still treat them as a novelty despite Haaland's volume in a winnable Group I.
Breakout player: Lamine Yamal — primary creator on the favorite with 7+ expected matches.
Top goalscorer: Lamine Yamal +900 — volume edge over Mbappé when you weight minutes and path.
Watch for Spain lineup confirmation before locking the scorer leg.
Lean: Yamal +900 over the field — structural games-played edge.`;

test("isWcPredictionsRoundupQuestion — multi-slot prompt", () => {
  assert.ok(isWcPredictionsRoundupQuestion(ROUNDUP_Q));
});

test("isWcPredictionsRoundupQuestion — paraphrase without emoji labels", () => {
  const q =
    "Give me your full tournament predictions — winner, dark horse, breakout player, and Golden Boot";
  assert.ok(isWcPredictionsRoundupQuestion(q));
  assert.equal(classifyWcQuestionIntent(q), WC_INTENT.PREDICTIONS_ROUNDUP);
  assert.equal(expectedWcPredictionSlots(q).length, 4);
});

test("classifyWcQuestionIntent — roundup beats Golden Boot", () => {
  assert.equal(classifyWcQuestionIntent(ROUNDUP_Q), WC_INTENT.PREDICTIONS_ROUNDUP);
});

test("parseWcPredictionSlots — labeled deep lines", () => {
  const slots = parseWcPredictionSlots(ROUNDUP_DEEP);
  assert.equal(slots.length, 4);
  assert.equal(slots[0].key, "winners");
  assert.match(slots[0].value, /Spain/i);
  assert.equal(slots[3].key, "topScorer");
  assert.match(slots[3].value, /Yamal/i);
});

test("buildWcCompactStructured — predictions_roundup card shape", () => {
  const summary =
    "Spain's path dominates the board — books underprice how many knockout minutes Yamal sees. Sims 44% win · 84% QF locks volume for Spain's right side.";
  const structured = buildWcCompactStructured({
    question: ROUNDUP_Q,
    wcIntent: WC_INTENT.PREDICTIONS_ROUNDUP,
    summary,
    deep: ROUNDUP_DEEP,
  });
  assert.equal(structured.callType, "predictions_roundup");
  assert.equal(structured.predictionSlots.length, 4);
  assert.ok(structured.call.includes("Spain") || structured.call.length > 10);
  assert.ok(structured.edge);
  assert.ok(structured.lean);
});

test("runWcUrTakeQA — fails incomplete roundup", () => {
  const qa = runWcUrTakeQA({
    responseText: "Spain wins and Yamal scores.",
    structured: buildWcCompactStructured({
      question: ROUNDUP_Q,
      wcIntent: WC_INTENT.PREDICTIONS_ROUNDUP,
      summary: "Spain wins.",
      deep: "Top goalscorer: Yamal +900.",
    }),
    question: ROUNDUP_Q,
    wcIntent: WC_INTENT.PREDICTIONS_ROUNDUP,
  });
  assert.ok(qa.issueCodes.includes("wc_predictions_roundup_incomplete"));
});

test("runWcUrTakeQA — passes complete roundup", () => {
  const structured = buildWcCompactStructured({
    question: ROUNDUP_Q,
    wcIntent: WC_INTENT.PREDICTIONS_ROUNDUP,
    summary:
      "Spain's path dominates — Yamal's minutes edge is what the board still misprices. Sims 44% win · 84% QF vs Mbappé's shorter run.",
    deep: ROUNDUP_DEEP,
  });
  const qa = runWcUrTakeQA({
    responseText: structured.call,
    structured,
    question: ROUNDUP_Q,
    wcIntent: WC_INTENT.PREDICTIONS_ROUNDUP,
  });
  assert.equal(wcPredictionsRoundupMissingSlots(ROUNDUP_Q, structured.predictionSlots).length, 0);
  assert.equal(expectedWcPredictionSlots(ROUNDUP_Q).length, 4);
  assert.ok(qa.passed, qa.issueCodes.join(", "));
});

test("buildWcCompactStructured — repairs prod-shaped bad PLAY and face", () => {
  const PROD_SUMMARY =
    "Spain's path dominance and France's creator depth make them the only two teams that clear 40% win probability — but the market is pricing them fairly.\nThe real edge sits in the dark horse tier, where Colombia and Norway offer structural value at longer odds.";
  const PROD_DEEP = `Winners: Spain — 44.33% win rate in sims with 7.1 expected games.
Dark horse: Colombia — 2.45% sims but 43.32% QF rate means they survive the bracket.
Breakout player: Lamine Yamal (Spain) — 17 years old, 7.1 expected games.
Top goalscorer: Kylian Mbappé (France) — adjusted odds +318 vs raw +600, 6 expected games.
Watch for injury or tactical shift to a back-three that benches him.
PLAY: Lean: that actually holds.`;

  const structured = buildWcCompactStructured({
    question: ROUNDUP_Q,
    wcIntent: WC_INTENT.PREDICTIONS_ROUNDUP,
    summary: PROD_SUMMARY,
    deep: PROD_DEEP,
  });

  assert.ok(!structured.lean.includes("that actually holds"));
  assert.ok(/Mbappé|Yamal/i.test(structured.lean));
  assert.ok(/Market|UR|\+|sims/i.test(structured.line));
  assert.ok(!/\bhim\b/i.test(structured.edge) || /Yamal|Mbappé/i.test(structured.edge));
  assert.match(structured.whyNow, /Winners|Dark horse|Breakout|Top goalscorer/i);

  const qa = runWcUrTakeQA({
    responseText: PROD_DEEP,
    structured,
    question: ROUNDUP_Q,
    wcIntent: WC_INTENT.PREDICTIONS_ROUNDUP,
  });
  assert.ok(qa.issueCodes.includes("wc_player_age_mismatch"));
  assert.equal(qa.issueCodes.includes("wc_play_line_invalid"), false);
});
