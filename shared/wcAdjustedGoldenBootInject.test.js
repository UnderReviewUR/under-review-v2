import assert from "node:assert/strict";
import test from "node:test";
import { WC_INTENT } from "./wcUrTakeIntent.js";
import {
  buildAdjustedGoldenBootPromptBlock,
  shouldInjectAdjustedGoldenBoot,
} from "./wcAdjustedGoldenBootInject.js";

test("shouldInjectAdjustedGoldenBoot — predictions roundup", () => {
  assert.ok(shouldInjectAdjustedGoldenBoot(WC_INTENT.PREDICTIONS_ROUNDUP));
  assert.ok(shouldInjectAdjustedGoldenBoot(WC_INTENT.GOLDEN_BOOT));
  assert.equal(shouldInjectAdjustedGoldenBoot(WC_INTENT.RULES), false);
});

test("buildAdjustedGoldenBootPromptBlock — ranks and rule line", () => {
  const block = buildAdjustedGoldenBootPromptBlock({
    goldenBootKv: {
      rows: [
        { name: "Kylian Mbappé", nationAbbr: "FRA", americanOdds: "+600" },
        { name: "Lamine Yamal", nationAbbr: "ESP", americanOdds: "+900" },
      ],
      lastUpdated: Date.now(),
      source: "seed",
    },
    playersKv: {
      teams: {
        FRA: { players: [{ name: "Kylian Mbappé", position: "F", isStarterLikely: true }] },
        ESP: { players: [{ name: "Lamine Yamal", position: "F", isStarterLikely: true }] },
      },
    },
    tournamentSimResults: {
      teamStats: {
        FRA: { advancePct: 80, r32Pct: 75, r16Pct: 60, qfPct: 45, sfPct: 30, finalPct: 18 },
        ESP: { advancePct: 85, r32Pct: 84, r16Pct: 70, qfPct: 55, sfPct: 40, finalPct: 44 },
      },
    },
    maxRows: 10,
  });
  assert.match(block, /ADJUSTED GOLDEN BOOT/i);
  assert.match(block, /Mbappé/i);
  assert.match(block, /TOP GOALSCORER RULE/i);
});
