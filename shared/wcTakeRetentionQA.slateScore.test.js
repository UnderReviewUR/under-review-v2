import assert from "node:assert/strict";
import test from "node:test";
import {
  extractWcSlateDayFromQuestion,
  isWcSlateOutcomePredictionQuestion,
  isWcSlateScorelineQuestion,
  isWcTomorrowOrSlateBetQuestion,
  resolveWcSlateRoutingKind,
  WC_SLATE_ROUTING_KIND,
} from "./wcTakeRetentionQA.js";

/** @typedef {{ q: string, route?: boolean, routingKind?: string | null, outcome?: boolean, scoreline?: boolean, slateDay?: string }} PhrasingCase */

/** @param {PhrasingCase} c */
function assertPhrasing(c) {
  const { q } = c;
  if (c.route != null) {
    assert.equal(isWcTomorrowOrSlateBetQuestion(q), c.route, `route mismatch for: ${q}`);
  }
  if (c.routingKind !== undefined) {
    assert.equal(resolveWcSlateRoutingKind(q), c.routingKind, `routingKind mismatch for: ${q}`);
  }
  if (c.outcome != null) {
    assert.equal(isWcSlateOutcomePredictionQuestion(q), c.outcome, `outcome mismatch for: ${q}`);
  }
  if (c.scoreline != null) {
    assert.equal(isWcSlateScorelineQuestion(q), c.scoreline, `scoreline mismatch for: ${q}`);
  }
  if (c.slateDay != null) {
    assert.equal(extractWcSlateDayFromQuestion(q), c.slateDay, `slateDay mismatch for: ${q}`);
  }
}

test("isWcSlateScorelineQuestion — home tab score slate ask", () => {
  assertPhrasing({
    q: "predict the scores for each world cup match today?",
    route: true,
    routingKind: WC_SLATE_ROUTING_KIND.SLATE_OUTCOME_PREDICTION,
    outcome: true,
    scoreline: true,
    slateDay: "today",
  });
});

test("isWcSlateScorelineQuestion — results ask is not scoreline-only", () => {
  assertPhrasing({
    q: "predict the results of each world cup match today",
    route: true,
    routingKind: WC_SLATE_ROUTING_KIND.SLATE_OUTCOME_PREDICTION,
    outcome: true,
    scoreline: false,
  });
});

test("slate score phrasing matrix — broad natural language coverage", () => {
  const hits = [
    {
      q: "predict the scores for each match today",
      route: true,
      routingKind: WC_SLATE_ROUTING_KIND.SLATE_OUTCOME_PREDICTION,
      outcome: true,
      scoreline: true,
    },
    {
      q: "what will the final scores be for every game today?",
      route: true,
      routingKind: WC_SLATE_ROUTING_KIND.SLATE_OUTCOME_PREDICTION,
      outcome: true,
      scoreline: true,
    },
    {
      q: "score predictions for today's slate",
      route: true,
      routingKind: WC_SLATE_ROUTING_KIND.SLATE_OUTCOME_PREDICTION,
      outcome: true,
      scoreline: true,
    },
    {
      q: "give me scorelines for each wc match tomorrow",
      route: true,
      routingKind: WC_SLATE_ROUTING_KIND.SLATE_OUTCOME_PREDICTION,
      outcome: true,
      scoreline: true,
      slateDay: "tomorrow",
    },
    {
      q: "predict final scores for all matches tomorrow",
      route: true,
      routingKind: WC_SLATE_ROUTING_KIND.SLATE_OUTCOME_PREDICTION,
      outcome: true,
      scoreline: true,
    },
    {
      q: "model scores for each match on the board today",
      route: true,
      routingKind: WC_SLATE_ROUTING_KIND.SLATE_OUTCOME_PREDICTION,
      outcome: true,
      scoreline: true,
    },
    {
      q: "what are the scores gonna be for every match tonight",
      route: true,
      routingKind: WC_SLATE_ROUTING_KIND.SLATE_OUTCOME_PREDICTION,
      outcome: true,
      scoreline: true,
      slateDay: "today",
    },
    {
      q: "tonight's world cup matches — predict the scores",
      route: true,
      routingKind: WC_SLATE_ROUTING_KIND.SLATE_OUTCOME_PREDICTION,
      outcome: true,
      scoreline: true,
      slateDay: "today",
    },
    {
      q: "what scores do you think today's wc games end at?",
      route: true,
      routingKind: WC_SLATE_ROUTING_KIND.SLATE_OUTCOME_PREDICTION,
      outcome: true,
      scoreline: true,
    },
  ];

  for (const c of hits) assertPhrasing(c);
});

test("slate score phrasing matrix — intentional non-scoreline or non-slate", () => {
  const misses = [
    {
      q: "predict the outcomes for each world cup game today",
      route: true,
      routingKind: WC_SLATE_ROUTING_KIND.SLATE_OUTCOME_PREDICTION,
      outcome: true,
      scoreline: false,
    },
    {
      q: "who wins each game today",
      route: true,
      routingKind: WC_SLATE_ROUTING_KIND.SLATE_OUTCOME_PREDICTION,
      outcome: true,
      scoreline: false,
    },
    {
      q: "best bets for today's slate",
      route: true,
      routingKind: WC_SLATE_ROUTING_KIND.BROAD_SLATE_BET,
      outcome: false,
      scoreline: false,
    },
    {
      q: "predict scores today",
      route: false,
      outcome: false,
      scoreline: false,
    },
    {
      q: "top 5 scores for USA vs PAR",
      route: false,
      outcome: false,
      scoreline: false,
    },
    {
      q: "how do you think today's games finish score-wise?",
      route: false,
      outcome: false,
      scoreline: false,
    },
  ];

  for (const c of misses) assertPhrasing(c);
});
