/**
 * World Cup Card Contract — golden fixture intent + layout scorer smoke tests.
 */

import assert from "node:assert/strict";
import test from "node:test";
import { WC_CARD_CONTRACT_GOLDEN_CASES } from "../shared/wcCardContractGolden.fixture.js";
import {
  scoreWcCardContractIntent,
  scoreWcCardContractLayout,
} from "../shared/wcCardContractScorer.js";
import { scoreWcCardContractVoice } from "../shared/wcCardContractVoice.js";
import { classifyWcQuestionIntent } from "../shared/wcUrTakeIntent.js";

test("golden fixture has twenty cases across intents", () => {
  assert.equal(WC_CARD_CONTRACT_GOLDEN_CASES.length, 20);
  const intents = new Set(WC_CARD_CONTRACT_GOLDEN_CASES.map((c) => c.expectedIntent));
  assert.ok(intents.has("RULES"));
  assert.ok(intents.has("PLAYER_PROP"));
  assert.ok(intents.has("GOLDEN_BOOT"));
});

test("layout scorer enforces headline cap and labeled fields", () => {
  const good = scoreWcCardContractLayout({
    call: "Brazil value at +800 outright",
    confidence: "Medium",
    whyNow: "Group path is clean.",
    edge: "Watch late injury news.",
    callType: "analysis",
  });
  assert.equal(good.passed, true);

  const bad = scoreWcCardContractLayout({
    call:
      "Brazil is structurally mispriced at plus eight hundred given group depth and knockout path and squad quality",
    confidence: "Medium",
    whyNow: "Group path is clean.",
    edge: "Watch late injury news.",
    callType: "analysis",
  });
  assert.equal(bad.passed, false);
  assert.ok(bad.issues.includes("headline_over_12_words"));
});

test("intent scorer flags France vs Brazil prop question", () => {
  const row = WC_CARD_CONTRACT_GOLDEN_CASES.find((c) => c.id === "player-prop-scorer");
  assert.ok(row);
  const intent = scoreWcCardContractIntent(row.question, row.expectedIntent);
  assert.equal(intent.passed, true);
  assert.equal(classifyWcQuestionIntent(row.question), "PLAYER_PROP");
});

test("sample golden case passes layout scorer with mock structured payload", () => {
  const row = WC_CARD_CONTRACT_GOLDEN_CASES.find((c) => c.id === "outright-mispriced");
  assert.ok(row);
  const payload = {
    call: "Brazil +450 is fair — market prices group I chaos correctly.",
    confidence: "Medium",
    whyNow: "Group I depth and knockout variance cap upside at +450.",
    edge: "Injury news on Vinícius could reprice this.",
    lean: "Pass at +450 — no edge on the outright.",
    callType: "analysis",
  };
  const layout = scoreWcCardContractLayout(payload);
  assert.equal(layout.passed, true, layout.issues?.join(", "));
  const voice = scoreWcCardContractVoice(payload);
  assert.equal(voice.passed, true, voice.issues?.join(", "));
  const intent = scoreWcCardContractIntent(row.question, row.expectedIntent);
  assert.equal(intent.passed, true);
});

test("golden day-one cases expect arguing voice", () => {
  const dayOne = WC_CARD_CONTRACT_GOLDEN_CASES.filter((c) => c.cardVoice === "argue");
  assert.ok(dayOne.length >= 10);
});
