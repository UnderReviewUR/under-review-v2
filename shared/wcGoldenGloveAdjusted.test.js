import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  adjustGoldenGloveOdds,
  formatAdjustedGoldenGloveForPrompt,
  formatGoldenGloveOddsForPrompt,
  lookupStarterGoalkeeper,
} from "./wcGoldenGloveAdjusted.js";
import { shouldInjectGoldenGloveBlocks } from "./wcAdjustedGoldenGloveInject.js";
import { WC_INTENT } from "./wcUrTakeIntent.js";

describe("wcGoldenGloveAdjusted", () => {
  it("shouldInjectGoldenGloveBlocks for roundup and glove intent", () => {
    assert.equal(shouldInjectGoldenGloveBlocks(WC_INTENT.PREDICTIONS_ROUNDUP, ""), true);
    assert.equal(shouldInjectGoldenGloveBlocks(WC_INTENT.GOLDEN_GLOVE, ""), true);
    assert.equal(
      shouldInjectGoldenGloveBlocks(WC_INTENT.GENERAL, "Who wins the Golden Glove?"),
      true,
    );
    assert.equal(shouldInjectGoldenGloveBlocks(WC_INTENT.GENERAL, "Spain vs France"), false);
  });

  it("lookupStarterGoalkeeper prefers isStarterLikely", () => {
    const registry = {
      teams: {
        ARG: {
          players: [
            { name: "Backup GK", position: "GK", isStarterLikely: false },
            { name: "Emiliano Martínez", position: "GK", isStarterLikely: true },
          ],
        },
      },
    };
    const gk = lookupStarterGoalkeeper(registry, "ARG");
    assert.equal(gk?.name, "Emiliano Martínez");
  });

  it("adjustGoldenGloveOdds boosts deep-run favorites", () => {
    const rows = [
      { name: "Emiliano Martínez", americanOdds: "+500", nationAbbr: "ARG" },
      { name: "Unai Simón", americanOdds: "+550", nationAbbr: "ESP" },
    ];
    const teamStats = {
      ARG: { r32Pct: 80, r16Pct: 60, qfPct: 40, sfPct: 25, finalPct: 15 },
      ESP: { r32Pct: 75, r16Pct: 55, qfPct: 35, sfPct: 20, finalPct: 12 },
    };
    const adjusted = adjustGoldenGloveOdds(rows, { teamStats, playerRegistry: {} });
    assert.ok(adjusted.rows.length >= 2);
    assert.equal(adjusted.rows[0].name, "Emiliano Martínez");
    assert.ok(Number(adjusted.rows[0].expectedGames) > 4);
  });

  it("formats prompt blocks from KV payload", () => {
    const kv = {
      source: "goal.com",
      lastUpdated: Date.now(),
      rows: [{ name: "Emiliano Martínez", americanOdds: "+500", nationAbbr: "ARG" }],
      freshness: { ageText: "2h ago", isStale: false },
    };
    const oddsBlock = formatGoldenGloveOddsForPrompt(kv, 5);
    assert.match(oddsBlock, /GOLDEN GLOVE/);
    assert.match(oddsBlock, /Martínez/);

    const adjusted = adjustGoldenGloveOdds(kv.rows, {
      teamStats: { ARG: { r32Pct: 70, r16Pct: 50, qfPct: 30 } },
      playerRegistry: {},
    });
    const adjBlock = formatAdjustedGoldenGloveForPrompt(adjusted, 5);
    assert.match(adjBlock, /ADJUSTED GOLDEN GLOVE/);
  });
});
