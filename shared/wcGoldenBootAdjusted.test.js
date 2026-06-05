import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { adjustGoldenBootOdds, formatAdjustedGoldenBootForPrompt } from "./wcGoldenBootAdjusted.js";

const SEED_ROWS = [
  { name: "Kylian Mbappé", nationAbbr: "FRA", americanOdds: "+600" },
  { name: "Harry Kane", nationAbbr: "ENG", americanOdds: "+700" },
  { name: "Erling Haaland", nationAbbr: "NOR", americanOdds: "+800" },
  { name: "Lamine Yamal", nationAbbr: "ESP", americanOdds: "+900" },
  { name: "Vinícius Júnior", nationAbbr: "BRA", americanOdds: "+1000" },
];

const MOCK_SIM_STATS = {
  FRA: { advancePct: 99, r32Pct: 99, r16Pct: 80, qfPct: 55, sfPct: 35, finalPct: 20 },
  ENG: { advancePct: 98, r32Pct: 98, r16Pct: 75, qfPct: 50, sfPct: 30, finalPct: 15 },
  NOR: { advancePct: 80, r32Pct: 70, r16Pct: 35, qfPct: 15, sfPct: 5, finalPct: 2 },
  ESP: { advancePct: 99, r32Pct: 99, r16Pct: 90, qfPct: 70, sfPct: 55, finalPct: 40 },
  BRA: { advancePct: 99, r32Pct: 99, r16Pct: 85, qfPct: 60, sfPct: 40, finalPct: 25 },
};

describe("adjustGoldenBootOdds", () => {
  test("adjusts all seed rows", () => {
    const result = adjustGoldenBootOdds(SEED_ROWS, { teamStats: MOCK_SIM_STATS });
    assert.equal(result.rows.length, 5);
    assert.equal(result.method, "minutes_weighted_poisson_elo");
  });

  test("ranks are sequential 1..N", () => {
    const result = adjustGoldenBootOdds(SEED_ROWS, { teamStats: MOCK_SIM_STATS });
    for (let i = 0; i < result.rows.length; i++) {
      assert.equal(result.rows[i].adjustedRank, i + 1);
    }
  });

  test("team with deeper path gets probability boost", () => {
    const result = adjustGoldenBootOdds(SEED_ROWS, { teamStats: MOCK_SIM_STATS });
    // ESP has deepest path (55% SF, 40% Final) — Yamal should get minutes boost
    const yamal = result.rows.find((r) => r.name === "Lamine Yamal");
    assert.ok(yamal);
    assert.ok(yamal.minutesMultiplier > 1, `Yamal multiplier should be > 1: ${yamal.minutesMultiplier}`);

    // NOR has shallowest path — Haaland should get minutes penalty
    const haaland = result.rows.find((r) => r.name === "Erling Haaland");
    assert.ok(haaland);
    assert.ok(haaland.minutesMultiplier < yamal.minutesMultiplier, "Haaland should have lower multiplier than Yamal");
  });

  test("PK taker is flagged", () => {
    const result = adjustGoldenBootOdds(SEED_ROWS, { teamStats: MOCK_SIM_STATS });
    const mbappe = result.rows.find((r) => r.name === "Kylian Mbappé");
    assert.ok(mbappe);
    assert.equal(mbappe.pkTaker, true);

    // Yamal is NOT PK taker for ESP (Morata is)
    const yamal = result.rows.find((r) => r.name === "Lamine Yamal");
    assert.ok(yamal);
    assert.equal(yamal.pkTaker, false);
  });

  test("works without sim stats", () => {
    const result = adjustGoldenBootOdds(SEED_ROWS, {});
    assert.equal(result.rows.length, 5);
    // Without sim stats, all teams get baseline 3 games → lower multiplier
    for (const r of result.rows) {
      assert.ok(r.expectedGames === 3, `Expected 3 games without sim: ${r.expectedGames}`);
    }
  });

  test("handles empty input", () => {
    const result = adjustGoldenBootOdds([], {});
    assert.equal(result.rows.length, 0);
  });
});

describe("formatAdjustedGoldenBootForPrompt", () => {
  test("produces formatted output", () => {
    const result = adjustGoldenBootOdds(SEED_ROWS, { teamStats: MOCK_SIM_STATS });
    const text = formatAdjustedGoldenBootForPrompt(result);
    assert.ok(text.includes("ADJUSTED GOLDEN BOOT"));
    assert.ok(text.includes("minutes-weighted"));
    assert.ok(text.includes("Mbappé") || text.includes("Mbappe"));
  });

  test("respects maxRows", () => {
    const result = adjustGoldenBootOdds(SEED_ROWS, { teamStats: MOCK_SIM_STATS });
    const text = formatAdjustedGoldenBootForPrompt(result, 2);
    const playerLines = text.split("\n").filter((l) => /^\s+\d+\./.test(l));
    assert.equal(playerLines.length, 2);
  });

  test("handles empty input", () => {
    assert.equal(formatAdjustedGoldenBootForPrompt({ rows: [] }), "");
    assert.equal(formatAdjustedGoldenBootForPrompt(null), "");
  });
});
