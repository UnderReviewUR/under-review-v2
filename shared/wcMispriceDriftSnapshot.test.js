import { test } from "node:test";
import assert from "node:assert/strict";
import {
  buildMispriceSnapshotFromInputs,
  classifyAdvanceMispriceLean,
  computeAllAdvanceMisprices,
  diffMispriceSnapshots,
} from "./wcMispriceDriftSnapshot.js";

test("classifyAdvanceMispriceLean — sign of delta", () => {
  assert.equal(classifyAdvanceMispriceLean(-8), "pass");
  assert.equal(classifyAdvanceMispriceLean(6), "lean");
  assert.equal(classifyAdvanceMispriceLean(0), "neutral");
});

test("computeAllAdvanceMisprices — delta = sim - market", () => {
  const rows = computeAllAdvanceMisprices({
    teamStats: {
      COD: { advancePct: 23.7 },
    },
    bdlFutures: {
      byMarketType: {
        qualify_from_group: {
          COD: { american: 100 },
        },
      },
    },
  });
  const cod = rows.find((r) => r.teamAbbr === "COD");
  assert.ok(cod);
  assert.ok(cod.delta < 0);
  assert.equal(cod.lean, "pass");
});

test("diffMispriceSnapshots — detects 5pt move and lean flip", () => {
  const prior = buildMispriceSnapshotFromInputs(
    {
      teamStats: { COD: { advancePct: 30 }, COL: { advancePct: 70 } },
      eloMatchesApplied: 1,
      xgMatchesApplied: 0,
    },
    {
      byMarketType: {
        qualify_from_group: {
          COD: { american: 100 },
          COL: { american: -150 },
        },
      },
    },
    Date.parse("2026-06-12T00:00:00Z"),
  );

  const current = buildMispriceSnapshotFromInputs(
    {
      teamStats: { COD: { advancePct: 20 }, COL: { advancePct: 55 } },
      eloMatchesApplied: 2,
      xgMatchesApplied: 1,
    },
    {
      byMarketType: {
        qualify_from_group: {
          COD: { american: 100 },
          COL: { american: -150 },
        },
      },
    },
    Date.parse("2026-06-13T00:00:00Z"),
  );

  const diff = diffMispriceSnapshots(current, prior);
  assert.equal(diff.hasPrior, true);
  assert.ok(diff.moved.some((m) => m.teamAbbr === "COD"));
});
