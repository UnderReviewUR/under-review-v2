import test from "node:test";
import assert from "node:assert/strict";

import { UR_TAKE_TELEMETRY } from "./urTakeTelemetry.js";
import {
  normalizeFollowUpText,
  computeUrTakeFollowUpMetrics,
  groupFollowUpPerformance,
  evaluateUrTakeFollowUpGuardrails,
  logUrTakeFollowUpGuardrails,
  topPerformingFollowUps,
  GUARDRAIL_MIN_CLICK_RATE,
  GUARDRAIL_MAX_AVG_MS_TO_CLICK,
  GUARDRAIL_MIN_COMPLETION_SUCCESS,
} from "./urTakeTelemetryMetrics.js";

const E = UR_TAKE_TELEMETRY;

function ev(name, props = {}) {
  return { event: name, ...props };
}

test("normalizeFollowUpText collapses casing and spaces", () => {
  assert.equal(
    normalizeFollowUpText("  Still   like THIS line?  "),
    normalizeFollowUpText("still like this line?"),
  );
});

test("computeUrTakeFollowUpMetrics aggregates counts and averages", () => {
  const events = [
    ev(E.LIVE_RESPONSE_GENERATED, { sport: "nba" }),
    ev(E.LIVE_RESPONSE_GENERATED, {}),
    ev(E.FOLLOWUPS_ATTACHED, { followUpCount: 3 }),
    ev(E.FOLLOWUP_CLICK, { msSinceResponseShown: 1000 }),
    ev(E.FOLLOWUP_CLICK, { msSinceResponseShown: 3000 }),
    ev(E.FOLLOWUP_RESPONSE_COMPLETED, {
      success: true,
      roundTripMs: 400,
      sessionUserTurns: 2,
      followUpText: "test?",
    }),
    ev(E.FOLLOWUP_RESPONSE_COMPLETED, {
      success: false,
      roundTripMs: 600,
      sessionUserTurns: 4,
      followUpText: "other?",
    }),
    ev(E.FOLLOWUP_SUBMIT, { sessionUserTurns: 3 }),
  ];

  const m = computeUrTakeFollowUpMetrics(events);
  assert.deepEqual(m.counts, {
    liveResponses: 2,
    followUpsAttached: 1,
    followUpClicks: 2,
    completionsTotal: 2,
    completionsSuccess: 1,
  });
  assert.equal(m.followUpClickRate, 2); /* clicks / attach batches — can exceed 1 */
  assert.equal(m.continuationRate, 0.5);
  assert.equal(m.completionSuccessRate, 0.5);
  assert.equal(m.avgTimeToClickMs, 2000);
  assert.equal(m.avgRoundTripMs, 500);
  assert.equal(m.avgSessionDepth, 3);
});

test("followUpClickRate and continuationRate null when denominators zero", () => {
  const m = computeUrTakeFollowUpMetrics([]);
  assert.equal(m.followUpClickRate, null);
  assert.equal(m.continuationRate, null);
});

test("groupFollowUpPerformance groups copy and computes ctr when followUpTexts provided", () => {
  const events = [
    ev(E.FOLLOWUPS_ATTACHED, {
      followUpCount: 2,
      followUpTexts: ["Still like this line?", "good for second half?"],
    }),
    ev(E.FOLLOWUP_CLICK, { followUpText: "still like this line?", msSinceResponseShown: 100 }),
    ev(E.FOLLOWUP_RESPONSE_COMPLETED, {
      success: true,
      followUpText: "still like this line?",
    }),
  ];

  const { rows } = groupFollowUpPerformance(events);
  const line = rows.find((r) => r.followUpText === "still like this line?");
  assert.ok(line);
  assert.equal(line.impressions, 1);
  assert.equal(line.clicks, 1);
  assert.equal(line.clickThroughRate, 1);
  assert.equal(line.completionRate, 1);
  assert.equal(line.impressionsEstimated, false);
});

test("groupFollowUpPerformance uses click floor when attach texts absent", () => {
  const events = [
    ev(E.FOLLOWUPS_ATTACHED, { followUpCount: 3 }),
    ev(E.FOLLOWUP_CLICK, { followUpText: "pair this with anything?" }),
  ];
  const { rows } = groupFollowUpPerformance(events);
  const r = rows.find((x) => x.followUpText === "pair this with anything?");
  assert.ok(r);
  assert.equal(r.impressions, 1);
  assert.equal(r.clicks, 1);
  assert.equal(r.impressionsEstimated, true);
});

test("evaluateUrTakeFollowUpGuardrails fires low CTR when sample large enough", () => {
  /** 100 attached, 4 clicks => 4% < 5% */
  const events = [];
  for (let i = 0; i < 100; i++) events.push(ev(E.FOLLOWUPS_ATTACHED, { followUpCount: 3 }));
  for (let i = 0; i < 4; i++) events.push(ev(E.FOLLOWUP_CLICK, { msSinceResponseShown: 100 }));

  const metrics = computeUrTakeFollowUpMetrics(events);
  assert.ok(metrics.followUpClickRate != null && metrics.followUpClickRate < GUARDRAIL_MIN_CLICK_RATE);

  const w = evaluateUrTakeFollowUpGuardrails(metrics, {
    minAttached: 20,
    minClicks: 10,
    minCompletions: 15,
  });
  assert.ok(w.some((x) => x.code === "low_followup_ctr"));
});

test("evaluateUrTakeFollowUpGuardrails fires slow time-to-click", () => {
  const events = [];
  for (let i = 0; i < 15; i++) {
    events.push(ev(E.FOLLOWUP_CLICK, { msSinceResponseShown: 9000 }));
  }
  const metrics = computeUrTakeFollowUpMetrics(events);
  assert.ok(metrics.avgTimeToClickMs > GUARDRAIL_MAX_AVG_MS_TO_CLICK);
  const w = evaluateUrTakeFollowUpGuardrails(metrics, {
    minAttached: 100,
    minClicks: 10,
    minCompletions: 100,
  });
  assert.ok(w.some((x) => x.code === "slow_time_to_click"));
});

test("evaluateUrTakeFollowUpGuardrails fires completion friction", () => {
  const events = [];
  for (let i = 0; i < 20; i++) {
    events.push(
      ev(E.FOLLOWUP_RESPONSE_COMPLETED, {
        success: i < 10,
        followUpText: "x?",
      }),
    );
  }
  const metrics = computeUrTakeFollowUpMetrics(events);
  assert.equal(metrics.completionSuccessRate, 0.5);
  assert.ok(metrics.completionSuccessRate < GUARDRAIL_MIN_COMPLETION_SUCCESS);
  const w = evaluateUrTakeFollowUpGuardrails(metrics, {
    minAttached: 100,
    minClicks: 100,
    minCompletions: 15,
  });
  assert.ok(w.some((x) => x.code === "followup_completion_friction"));
});

test("logUrTakeFollowUpGuardrails returns warnings without throwing", () => {
  const events = [
    ev(E.FOLLOWUPS_ATTACHED, { followUpCount: 1 }),
    ev(E.FOLLOWUP_CLICK, { msSinceResponseShown: 100 }),
  ];
  const out = logUrTakeFollowUpGuardrails(events, {
    minAttached: 999,
    minClicks: 999,
    minCompletions: 999,
  });
  assert.ok(out.metrics);
  assert.equal(out.warnings.length, 0);
});

test("topPerformingFollowUps ranks by ctr and completionRate", () => {
  const events = [
    ev(E.FOLLOWUPS_ATTACHED, {
      followUpTexts: ["alpha?", "beta?", "gamma?"],
    }),
    ev(E.FOLLOWUPS_ATTACHED, {
      followUpTexts: ["alpha?", "delta?"],
    }),
    ev(E.FOLLOWUP_CLICK, { followUpText: "alpha?" }),
    ev(E.FOLLOWUP_CLICK, { followUpText: "alpha?" }),
    ev(E.FOLLOWUP_CLICK, { followUpText: "beta?" }),
    ev(E.FOLLOWUP_RESPONSE_COMPLETED, { success: true, followUpText: "alpha?" }),
    ev(E.FOLLOWUP_RESPONSE_COMPLETED, { success: true, followUpText: "alpha?" }),
    ev(E.FOLLOWUP_RESPONSE_COMPLETED, { success: false, followUpText: "beta?" }),
  ];

  const top = topPerformingFollowUps(events, { limit: 5, minClicks: 1 });
  assert.ok(top.byClickThroughRate.length >= 1);
  assert.ok(top.byCompletionRate.length >= 1);
  assert.equal(top.byCompletionRate[0].followUpText, "alpha?");
});
