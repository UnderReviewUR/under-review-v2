/**
 * World Cup follow-up explain — Phase 2 routing + intent tests.
 */

import assert from "node:assert/strict";
import test from "node:test";
import { WC_CARD_CONTRACT_GOLDEN_CASES } from "./wcCardContractGolden.fixture.js";
import { shouldUseWcFixtureMatchupAltFollowUpPrebuilt } from "./wcFixtureMatchupPrebuilt.js";
import { shouldRunWcPlayerPropsFastPath } from "../api/ur-take/wcPlayerPropsFastPath.js";
import {
  buildWcPlayerPropExplainStructured,
  classifyWcFollowUpIntent,
  resolveWcFollowUpSubject,
  shouldBlockMatchupAltPrebuiltAfterPlayerPivot,
  applyWcFollowUpExplainDelivery,
  shouldAutoExpandWcBreakdown,
  isWcSlateDrilldownFollowUp,
  extractLastAssistantSlateStructured,
  buildWcSlateDrilldownFollowUpStructured,
} from "./wcFollowUpExplain.js";
import { classifyWcQuestionIntent, WC_INTENT } from "./wcUrTakeIntent.js";
import { scoreWcFollowUpRouting } from "./wcCardContractScorer.js";

test("pivot guard blocks matchup alt prebuilt after props list", () => {
  const row = WC_CARD_CONTRACT_GOLDEN_CASES.find((c) => c.id === "thread-pivot-props-then-totals");
  assert.ok(row);
  assert.equal(shouldBlockMatchupAltPrebuiltAfterPlayerPivot(row.question, row.history), true);
  const routing = scoreWcFollowUpRouting({
    question: row.question,
    expectedIntent: row.expectedIntent,
    history: row.history,
    wcIntent: classifyWcQuestionIntent(row.question, row.history),
    routingExpect: row.routingExpect,
  });
  assert.equal(routing.passed, true, routing.issues.join(", "));
});

test("props explain intents classify as PLAYER_PROP", () => {
  const cases = [
    "thread-props-list-why-second",
    "thread-props-explain-named-player",
    "thread-parlay-why-leg-3",
    "thread-player-prop-assist-why",
    "thread-parlay-correlation",
  ];
  for (const id of cases) {
    const row = WC_CARD_CONTRACT_GOLDEN_CASES.find((c) => c.id === id);
    assert.ok(row, id);
    assert.equal(
      classifyWcQuestionIntent(row.question, row.history),
      WC_INTENT.PLAYER_PROP,
      id,
    );
  }
});

test("over or under goals classifies MATCHUP with totals history", () => {
  const row = WC_CARD_CONTRACT_GOLDEN_CASES.find((c) => c.id === "thread-matchup-over-or-under");
  assert.ok(row);
  assert.equal(classifyWcQuestionIntent(row.question, row.history), WC_INTENT.MATCHUP);
});

test("why not Mbappé classifies GOLDEN_BOOT with golden boot history", () => {
  const row = WC_CARD_CONTRACT_GOLDEN_CASES.find((c) => c.id === "thread-golden-boot-why-not");
  assert.ok(row);
  assert.equal(classifyWcQuestionIntent(row.question, row.history), WC_INTENT.GOLDEN_BOOT);
});

test("buildWcPlayerPropExplainStructured returns distinct why and expanded breakdown", () => {
  const row = WC_CARD_CONTRACT_GOLDEN_CASES.find((c) => c.id === "thread-props-list-why-second");
  assert.ok(row);
  const subject = resolveWcFollowUpSubject(row.history, row.question);
  const built = buildWcPlayerPropExplainStructured({
    question: row.question,
    history: row.history,
    subject,
    tier: "verified",
  });
  assert.ok(built);
  assert.equal(built.breakdownDefaultExpanded, true);
  assert.notEqual(built.whyNow, row.history?.[1]?.structured?.whyNow);
});

test("props list explain routes to fast path not matchup prebuilt", () => {
  const row = WC_CARD_CONTRACT_GOLDEN_CASES.find((c) => c.id === "thread-props-list-why-second");
  assert.ok(row);
  const intent = classifyWcQuestionIntent(row.question, row.history);
  assert.equal(
    shouldRunWcPlayerPropsFastPath(intent, row.question, row.history, true),
    true,
  );
  assert.equal(
    shouldUseWcFixtureMatchupAltFollowUpPrebuilt(row.question, intent, {
      isConversationFollowUp: true,
      hasKvFixture: true,
      history: row.history,
    }),
    false,
  );
});

test("named player prop explain routes to player props fast path", () => {
  const row = WC_CARD_CONTRACT_GOLDEN_CASES.find(
    (c) => c.id === "thread-props-explain-named-player",
  );
  assert.ok(row);
  const intent = classifyWcQuestionIntent(row.question, row.history);
  assert.equal(
    shouldRunWcPlayerPropsFastPath(intent, row.question, row.history, true),
    true,
  );
});

test("applyWcFollowUpExplainDelivery repairs repeat why and expands breakdown", () => {
  const row = WC_CARD_CONTRACT_GOLDEN_CASES.find((c) => c.id === "thread-matchup-why-under");
  assert.ok(row);
  const applied = applyWcFollowUpExplainDelivery(
    {
      callType: "matchup",
      call: "Under 2.5 goals",
      lean: "Pass on ML — Lean Under 2.5 goals",
      whyNow:
        "Tight Group G opener — Egypt sits deep and Belgium rarely blows teams out in Game 1.",
      deep: "Some extra context.",
      breakdownAvailable: true,
    },
    row.question,
    row.history,
  );
  assert.equal(applied.breakdownDefaultExpanded, true);
  assert.doesNotMatch(applied.whyNow || "", /rarely blows teams out/i);
  assert.match(applied.whyNow || "", /Under 2\.5 cashes/i);
});

test("shouldAutoExpandWcBreakdown true for explain questions", () => {
  assert.equal(shouldAutoExpandWcBreakdown("why under 2.5 goals?"), true);
  assert.equal(shouldAutoExpandWcBreakdown("best bet BEL vs EGY"), false);
});

test("slate drilldown follow-up detects go deeper on each", () => {
  const history = [
    { role: "user", content: "goal totals for each match today?" },
    {
      role: "assistant",
      structured: {
        callType: "group_slate",
        tomorrowSlateAngles: [
          { label: "France vs Senegal", lean: "Under 2.5 goals" },
          { label: "Iraq vs Norway", lean: "Over 1.5 goals" },
        ],
        deep: "Match: France vs Senegal\nLean: Under 2.5 goals",
        breakdownAvailable: true,
      },
    },
  ];
  assert.equal(isWcSlateDrilldownFollowUp("go deeper on each of these", history), true);
  const rebuilt = buildWcSlateDrilldownFollowUpStructured(
    extractLastAssistantSlateStructured(history),
  );
  assert.equal(rebuilt?.callType, "tomorrow_slate");
  assert.equal(rebuilt?.breakdownDefaultExpanded, true);
});

test("totals thread — tempted to go over routes to MATCHUP not player props", () => {
  const q =
    "tempted to go over considering brazils ability to score multiple and japan pressured to respond";
  const history = [
    {
      role: "assistant",
      structured: {
        lean: "Lean Under 2.5 goals",
        callType: "matchup",
        fixtureHome: "BRA",
        fixtureAway: "JPN",
      },
    },
  ];
  const subject = resolveWcFollowUpSubject(history, q);
  assert.equal(subject.kind, "totals");
  assert.equal(classifyWcFollowUpIntent(q, history), "MATCHUP");
  assert.equal(classifyWcQuestionIntent(q, history), WC_INTENT.MATCHUP);
});
