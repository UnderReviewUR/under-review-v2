/**
 * Follow-up / explain thread scorer — Phase 1 golden gate unit tests.
 */

import assert from "node:assert/strict";
import test from "node:test";
import {
  WC_CARD_CONTRACT_GOLDEN_CASES,
  WC_CARD_CONTRACT_THREAD_CASES,
} from "./wcCardContractGolden.fixture.js";
import {
  isWcCardContractExplainFollowUp,
  scoreWcFollowUpExplainContract,
} from "./wcCardContractFollowUpScorer.js";
import {
  scoreWcFollowUpRouting,
} from "./wcCardContractScorer.js";
import { classifyWcQuestionIntent } from "./wcUrTakeIntent.js";

test("golden fixture has thread cases for follow-up gate", () => {
  assert.ok(WC_CARD_CONTRACT_GOLDEN_CASES.length >= 33);
  assert.ok(WC_CARD_CONTRACT_THREAD_CASES.length >= 12);
});

test("isWcCardContractExplainFollowUp detects totals and prop explains", () => {
  assert.equal(isWcCardContractExplainFollowUp("why under 2.5 goals?"), true);
  assert.equal(isWcCardContractExplainFollowUp("why the second pick?"), true);
  assert.equal(isWcCardContractExplainFollowUp("why leg 3?"), true);
  assert.equal(isWcCardContractExplainFollowUp("Over or under goals?"), false);
});

test("thread-matchup-why-under exemplarGood passes follow-up contract", () => {
  const row = WC_CARD_CONTRACT_GOLDEN_CASES.find((c) => c.id === "thread-matchup-why-under");
  assert.ok(row?.exemplarGood);
  const scored = scoreWcFollowUpExplainContract({
    question: row.question,
    structured: row.exemplarGood,
    history: row.history,
    expect: row.followUpExpect,
  });
  assert.equal(scored.passed, true, scored.issues.join(", "));
});

test("thread-matchup-why-under exemplarBad fails flip and repeat", () => {
  const row = WC_CARD_CONTRACT_GOLDEN_CASES.find((c) => c.id === "thread-matchup-why-under");
  assert.ok(row?.exemplarBad);
  const scored = scoreWcFollowUpExplainContract({
    question: row.question,
    structured: row.exemplarBad,
    history: row.history,
    expect: row.followUpExpect,
  });
  assert.equal(scored.passed, false);
  assert.ok(scored.issues.includes("wc_follow_up_totals_lean_flipped"));
  assert.ok(scored.issues.includes("wc_follow_up_why_repeats_prior"));
});

test("thread-pivot routing passes after pivot guard", () => {
  const row = WC_CARD_CONTRACT_GOLDEN_CASES.find((c) => c.id === "thread-pivot-props-then-totals");
  assert.ok(row);
  const routing = scoreWcFollowUpRouting({
    question: row.question,
    expectedIntent: row.expectedIntent,
    history: row.history,
    wcIntent: classifyWcQuestionIntent(row.question, row.history),
    routingExpect: row.routingExpect,
  });
  assert.equal(routing.passed, true, routing.issues.join(", "));
});

test("thread-props-explain-named-player classifies PLAYER_PROP", () => {
  const row = WC_CARD_CONTRACT_GOLDEN_CASES.find(
    (c) => c.id === "thread-props-explain-named-player",
  );
  assert.ok(row);
  const actual = classifyWcQuestionIntent(row.question, row.history);
  assert.equal(actual, row.expectedIntent);
});

test("all thread cases with exemplarGood pass follow-up contract scorer", () => {
  for (const row of WC_CARD_CONTRACT_THREAD_CASES.filter((c) => c.exemplarGood && c.followUpExpect)) {
    const scored = scoreWcFollowUpExplainContract({
      question: row.question,
      structured: row.exemplarGood,
      history: row.history,
      expect: row.followUpExpect,
    });
    assert.equal(
      scored.passed,
      true,
      `${row.id}: ${scored.issues.join(", ")}`,
    );
  }
});
