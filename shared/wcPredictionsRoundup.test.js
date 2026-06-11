import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  detectRequestedRoundupSlots,
  expectedWcPredictionSlots,
  isWcPredictionsRoundupQuestion,
  parseWcPredictionSlots,
  wcPredictionsRoundupMissingSlots,
} from "./wcPredictionsRoundup.js";

const SIX_SLOT_QUESTION = `Fill in these predictions:
Champion:
Golden Boot:
Best player:
Best goalkeeper:
Dark horse:
Flop:`;

describe("wcPredictionsRoundup 6-slot", () => {
  it("detects six-slot roundup question", () => {
    assert.equal(isWcPredictionsRoundupQuestion(SIX_SLOT_QUESTION), true);
    const slots = detectRequestedRoundupSlots(SIX_SLOT_QUESTION);
    assert.equal(slots.length, 6);
    assert.deepEqual(
      slots.map((s) => s.key),
      ["champion", "goldenBoot", "bestPlayer", "goldenGlove", "darkHorse", "flop"],
    );
  });

  it("expects all six slots for labeled prompts", () => {
    const expected = expectedWcPredictionSlots(SIX_SLOT_QUESTION);
    assert.deepEqual(expected.map((s) => s.key), [
      "champion",
      "goldenBoot",
      "bestPlayer",
      "goldenGlove",
      "darkHorse",
      "flop",
    ]);
  });

  it("parses labeled deep answer with golden glove", () => {
    const deep = [
      "Champion: Spain — co-favorite with France at +450.",
      "Golden Boot: Kylian Mbappé — +700 market with adjusted model edge.",
      "Best player: Lamine Yamal — Golden Ball path on Spain's run.",
      "Best goalkeeper: Emiliano Martínez — +500 Golden Glove board leader.",
      "Dark horse: Colombia — bracket path and transition profile at +2500.",
      "Flop: Brazil — title hype overshoots knockout ceiling.",
    ].join("\n");

    const parsed = parseWcPredictionSlots(deep);
    assert.equal(parsed.length, 6);
    assert.equal(parsed.find((s) => s.key === "goldenGlove")?.value.includes("Martínez"), true);

    const missing = wcPredictionsRoundupMissingSlots(SIX_SLOT_QUESTION, parsed);
    assert.deepEqual(missing, []);
  });
});
