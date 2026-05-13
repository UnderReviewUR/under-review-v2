import test from "node:test";
import assert from "node:assert/strict";

import {
  attachEstimatedEdgeLedgerMeta,
  buildEstimatedEdgeLedgerMeta,
  computeEstimatedEdgeDashboardStats,
  computeMissDistance,
  isThinPassLikeHeuristic,
} from "./_estimatedEdgeObservability.js";

test("buildEstimatedEdgeLedgerMeta captures presence flags and numerics", () => {
  const meta = buildEstimatedEdgeLedgerMeta({
    source: "estimated_edge",
    sport: "nba",
    marketType: "points",
    subject: "J. Tatum",
    projection: "27.5 pts",
    fairLine: "26.5",
    leanRead: "Lean over if you can get 25.5 or better.",
    confidence: "Medium",
    dataQuality: "strong",
    dataQualityReason: "Verified board",
  });
  assert.ok(meta);
  assert.equal(meta.sport, "nba");
  assert.equal(meta.marketType, "points");
  assert.equal(meta.subject, "J. Tatum");
  assert.equal(meta.dataQuality, "strong");
  assert.equal(meta.confidence, "Medium");
  assert.equal(meta.projectionPresent, true);
  assert.equal(meta.fairLinePresent, true);
  assert.equal(meta.leanReadPresent, true);
  assert.equal(meta.fairLineNumeric, 26.5);
  assert.equal(meta.projectionNumeric, 27.5);
  assert.equal(meta.userBetSignal, null);
  assert.equal(meta.outcome, null);
});

test("attachEstimatedEdgeLedgerMeta is a no-op without estimated edge", () => {
  const row = { id: "x", playLine: "y" };
  assert.strictEqual(attachEstimatedEdgeLedgerMeta(row, null), row);
});

test("computeMissDistance", () => {
  assert.equal(computeMissDistance(24.5, 26), 1.5);
  assert.equal(computeMissDistance(null, 1), null);
});

test("isThinPassLikeHeuristic", () => {
  const metaThin = { dataQuality: "thin", leanReadExcerpt: "wait" };
  assert.equal(
    isThinPassLikeHeuristic({ playLine: "Pass — no edge" }, metaThin),
    true,
  );
  assert.equal(
    isThinPassLikeHeuristic({ playLine: "Over 22.5" }, { ...metaThin, leanReadExcerpt: "pass this spot" }),
    true,
  );
  assert.equal(isThinPassLikeHeuristic({ playLine: "Over 22.5" }, metaThin), false);
});

test("computeEstimatedEdgeDashboardStats aggregates by data quality", () => {
  const takes = [
    {
      id: "1",
      playLine: "Side",
      estimatedEdgeMeta: {
        sport: "nba",
        dataQuality: "strong",
        projectionPresent: true,
        userBetSignal: "yes",
        outcome: { result: "win", missDistance: 1.2 },
      },
      betSignal: { betYes: true, at: "t" },
    },
    {
      id: "2",
      playLine: "Pass",
      estimatedEdgeMeta: {
        sport: "nba",
        dataQuality: "thin",
        projectionPresent: false,
        userBetSignal: "no",
        leanReadExcerpt: "pass",
        outcome: { result: "pass", missDistance: null },
      },
    },
    {
      id: "3",
      playLine: "x",
      estimatedEdgeMeta: {
        sport: "mlb",
        dataQuality: "usable",
        projectionPresent: true,
        userBetSignal: null,
        outcome: { result: "loss", missDistance: 2 },
      },
    },
  ];
  const d = computeEstimatedEdgeDashboardStats(takes);
  assert.equal(d.eeTakeCount, 3);
  assert.equal(d.bySport.nba, 2);
  assert.equal(d.bySport.mlb, 1);
  assert.equal(d.byDataQuality.strong.takes, 1);
  assert.equal(d.byDataQuality.strong.betYes, 1);
  assert.equal(d.byDataQuality.usable.graded, 1);
  assert.equal(d.byDataQuality.usable.avgMissDistanceWhenProjectionPresent, 2);
  assert.ok(d.thinHeuristic.thinPassLikeRate > 0);
});
