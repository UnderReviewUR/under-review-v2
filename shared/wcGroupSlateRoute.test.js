import assert from "node:assert/strict";
import test from "node:test";
import { WC_TURN_LANE } from "./wcTurnConstants.js";
import { resolveWcTurnPlan } from "./wcTurnPlanner.js";
import { buildWcStructuredForPlan } from "./wcTurnDelivery.js";
import {
  WC_GROUP_SLATE_VARIANT,
  buildWcGroupSlateLaneStructured,
  resolveWcFlagshipGroupSlatePick,
  resolveWcGroupSlatePrebuiltRoute,
} from "./wcGroupSlateRoute.js";

test("resolveWcGroupSlatePrebuiltRoute — today's totals slate", () => {
  const q = "Any of today's matches go over 2.5 total goals?";
  const route = resolveWcGroupSlatePrebuiltRoute({
    question: q,
    intent: "STRUCTURAL",
    isConversationFollowUp: false,
    wcRunnerUpFollowUpQuestion: false,
  });
  assert.equal(route.eligible, true);
  assert.equal(route.variant, WC_GROUP_SLATE_VARIANT.TOMORROW_SLATE);
  assert.equal(route.reason, "tomorrow_slate_question");
});

test("resolveWcGroupSlatePrebuiltRoute — knockout value is tomorrow slate variant", () => {
  const q = "What's the best knockout value bet right now — one pick, direct answer?";
  const route = resolveWcGroupSlatePrebuiltRoute({
    question: q,
    intent: "STRUCTURAL",
    isConversationFollowUp: false,
    wcRunnerUpFollowUpQuestion: false,
  });
  assert.equal(route.eligible, true);
  assert.equal(route.variant, WC_GROUP_SLATE_VARIANT.TOMORROW_SLATE);
});

test("resolveWcTurnPlan — slate routes before structural LLM", () => {
  const q = "Any of today's matches go over 2.5 total goals?";
  const plan = resolveWcTurnPlan({
    question: q,
    fullQuestion: q,
    history: [],
    isConversationFollowUp: false,
    hasImage: false,
    matches: [
      {
        homeTeam: "NED",
        awayTeam: "MAR",
        status: "NS",
        date: "2026-06-28",
        round: "Round of 32",
        odds: { totalLine: "2.5", totalOver: "-105", totalUnder: "-115" },
      },
    ],
    hasKvFixture: true,
    mentionedTeams: [],
    wcRunnerUpFollowUpQuestion: false,
  });
  assert.equal(plan.lane, WC_TURN_LANE.GROUP_SLATE);
  assert.equal(plan.reason, "tomorrow_slate_question");
  assert.equal(plan.shouldUseFastPath, true);
  assert.notEqual(plan.reason, "structural_llm");
});

test("buildWcGroupSlateLaneStructured — cross-group miss does not fall back to Paraguay", async () => {
  const route = resolveWcGroupSlatePrebuiltRoute({
    question: "Which group has the biggest misprice to advance?",
    intent: "STRUCTURAL",
    isConversationFollowUp: false,
    wcRunnerUpFollowUpQuestion: false,
  });
  assert.equal(route.variant, WC_GROUP_SLATE_VARIANT.CROSS_GROUP);
  const built = await buildWcGroupSlateLaneStructured({
    route,
    question: "Which group has the biggest misprice to advance?",
    teamStats: null,
    bdlFutures: null,
  });
  assert.equal(built, null);
});

test("buildWcGroupSlateLaneStructured — knockout with group-only board returns pass card", async () => {
  const q = "What's the best knockout value bet right now — one pick, direct answer?";
  const route = resolveWcGroupSlatePrebuiltRoute({
    question: q,
    intent: "STRUCTURAL",
    isConversationFollowUp: false,
    wcRunnerUpFollowUpQuestion: false,
  });
  const nowMs = Date.parse("2026-06-28T18:00:00-04:00");
  const built = await buildWcGroupSlateLaneStructured({
    route,
    question: q,
    matches: [{ homeTeam: "TUR", awayTeam: "PAR", group: "D", status: "NS", date: "2026-06-11" }],
    nowMs,
  });
  assert.ok(built?.structured);
  assert.doesNotMatch(String(built.structured.lean || ""), /advance in Group/i);

  const plan = resolveWcTurnPlan({
    question: q,
    fullQuestion: q,
    history: [],
    isConversationFollowUp: false,
    hasImage: false,
    matches: [{ homeTeam: "TUR", awayTeam: "PAR", group: "D", status: "NS", date: "2026-06-11" }],
    hasKvFixture: true,
    mentionedTeams: [],
    wcRunnerUpFollowUpQuestion: false,
  });
  const delivered = await buildWcStructuredForPlan(plan, {
    question: q,
    matches: [{ homeTeam: "TUR", awayTeam: "PAR", group: "D", status: "NS", date: "2026-06-11" }],
    nowMs,
    wcContext: {
      allMatches: [{ homeTeam: "TUR", awayTeam: "PAR", group: "D", status: "NS", date: "2026-06-11" }],
    },
  });
  assert.ok(delivered?.structured);
  assert.doesNotMatch(String(delivered.structured.lean || ""), /advance in Group/i);
});

test("resolveWcFlagshipGroupSlatePick — explicit group uses contender not hardcoded PAR", () => {
  const pick = resolveWcFlagshipGroupSlatePick("best value to advance from Group K");
  assert.equal(pick.groupLetter, "K");
  assert.equal(pick.pickAbbr, "COL");
});
