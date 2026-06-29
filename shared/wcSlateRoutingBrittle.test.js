import assert from "node:assert/strict";
import test from "node:test";
import { WC_TURN_LANE } from "./wcTurnConstants.js";
import { resolveWcTurnPlan } from "./wcTurnPlanner.js";
import { classifyWcQuestionIntent } from "./wcUrTakeIntent.js";
import {
  isWcDailyFixtureValueQuestion,
  isWcSlateMarketBoardQuestion,
  isWcTomorrowOrSlateBetQuestion,
  isWcWcTabImplicitSlateQuestion,
  resolveWcSlateMarketBoardMode,
  resolveWcSlateRoutingKind,
  WC_SLATE_ROUTING_KIND,
} from "./wcTakeRetentionQA.js";
import { resolveWcGroupSlatePrebuiltRoute } from "./wcGroupSlateRoute.js";

const MATCHES = [
  {
    homeTeam: "NED",
    awayTeam: "MAR",
    status: "NS",
    date: "2026-06-28",
    round: "Round of 32",
    odds: { totalLine: "2.5", totalOver: "-105", totalUnder: "-115" },
  },
];

/** @param {string} q @param {{ fromWcTab?: boolean }} [opts] */
function planFor(q, opts = {}) {
  return resolveWcTurnPlan({
    question: q,
    fullQuestion: q,
    history: [],
    isConversationFollowUp: false,
    hasImage: false,
    matches: MATCHES,
    hasKvFixture: true,
    mentionedTeams: [],
    wcRunnerUpFollowUpQuestion: false,
    fromWcTab: opts.fromWcTab ?? false,
  });
}

const SLATE_SHOULD_ROUTE = [
  "Will any games today hit the over?",
  "Are there unders worth taking on today's slate?",
  "Which matches today go over 2.5?",
  "Anything on the board today worth an over play?",
  "Do any of today's games see 3+ goals?",
  "Best moneylines on today's slate?",
  "Best ML on today slate",
  "Which fixture today is most mispriced?",
  "Most mispriced game today?",
  "One pick on today's board — direct answer",
  "Will any of todays games go over 2.5?",
];

for (const q of SLATE_SHOULD_ROUTE) {
  test(`slate routing — "${q.slice(0, 48)}…"`, () => {
    assert.equal(isWcTomorrowOrSlateBetQuestion(q), true, "tomorrow/slate classifier");
    const route = resolveWcGroupSlatePrebuiltRoute({ question: q, intent: classifyWcQuestionIntent(q, []) });
    assert.equal(route.eligible, true, "group slate route");
    const plan = planFor(q);
    assert.equal(plan.lane, WC_TURN_LANE.GROUP_SLATE, "planner lane");
    assert.notEqual(plan.reason, "structural_llm");
    assert.notEqual(plan.reason, "entity_pricing_llm");
  });
}

test("WC tab implicit — worth betting today", () => {
  const q = "What's worth betting today?";
  assert.equal(isWcWcTabImplicitSlateQuestion(q), true);
  assert.equal(isWcTomorrowOrSlateBetQuestion(q), false);
  const route = resolveWcGroupSlatePrebuiltRoute({
    question: q,
    intent: classifyWcQuestionIntent(q, []),
    fromWcTab: true,
  });
  assert.equal(route.eligible, true);
  assert.equal(planFor(q, { fromWcTab: true }).lane, WC_TURN_LANE.GROUP_SLATE);
});

test("WC tab implicit — give me one bet for tonight", () => {
  const q = "Give me one bet for tonight";
  assert.equal(isWcWcTabImplicitSlateQuestion(q), true);
  assert.equal(planFor(q, { fromWcTab: true }).lane, WC_TURN_LANE.GROUP_SLATE);
});

test("slate market board mode — bare over counts as totals", () => {
  assert.equal(resolveWcSlateMarketBoardMode("Will any games today hit the over?"), "totals");
  assert.equal(resolveWcSlateMarketBoardMode("Best moneylines on today's slate?"), "spreads");
});

test("daily fixture value — not group advancement", () => {
  const q = "Most mispriced game today?";
  assert.equal(isWcDailyFixtureValueQuestion(q), true);
  assert.equal(classifyWcQuestionIntent(q, []), "STRUCTURAL");
});

test("single-fixture totals stays matchup — not slate board", () => {
  const q = "Brazil Japan over 2.5?";
  assert.equal(isWcSlateMarketBoardQuestion(q), false);
  assert.equal(isWcTomorrowOrSlateBetQuestion(q), false);
  assert.equal(planFor(q).lane, WC_TURN_LANE.LLM_FULL);
});

test("WC tab implicit — what's the play today", () => {
  const q = "What's the play today?";
  assert.equal(isWcWcTabImplicitSlateQuestion(q), true);
  assert.equal(planFor(q, { fromWcTab: true }).lane, WC_TURN_LANE.GROUP_SLATE);
});

test("WC tab implicit — who should I bet on today", () => {
  const q = "Who should I bet on today?";
  assert.equal(isWcWcTabImplicitSlateQuestion(q), true);
  assert.equal(planFor(q, { fromWcTab: true }).lane, WC_TURN_LANE.GROUP_SLATE);
});

test("orchestrator precedence — daily fixture beats multi-match market board", () => {
  const q = "Most mispriced game today?";
  assert.equal(resolveWcSlateRoutingKind(q), WC_SLATE_ROUTING_KIND.DAILY_FIXTURE_VALUE);
  assert.equal(isWcSlateMarketBoardQuestion(q), false);
});

test("orchestrator precedence — market board beats broad slate bet", () => {
  const q = "Will any games today hit the over?";
  assert.equal(resolveWcSlateRoutingKind(q), WC_SLATE_ROUTING_KIND.SLATE_MARKET_BOARD);
});

test("orchestrator — WC tab implicit only with fromWcTab", () => {
  const q = "What's worth betting today?";
  assert.equal(resolveWcSlateRoutingKind(q), null);
  assert.equal(resolveWcSlateRoutingKind(q, { fromWcTab: true }), WC_SLATE_ROUTING_KIND.WC_TAB_IMPLICIT);
  assert.equal(isWcTomorrowOrSlateBetQuestion(q, { fromWcTab: true }), true);
});

test("group cross-value still routes cross_group not tomorrow", () => {
  const q = "Which group is most mispriced to advance?";
  const route = resolveWcGroupSlatePrebuiltRoute({
    question: q,
    intent: classifyWcQuestionIntent(q, []),
  });
  assert.equal(route.variant, "cross_group");
});
