import test from "node:test";
import assert from "node:assert/strict";
import { buildHomeTrackerCards } from "./buildHomeTrackerCards.js";

test("shows draft predictor card during pre-draft window", () => {
  const cards = buildHomeTrackerCards({
    performanceData: { summary: { settled: 10, roiUnits: 1.2, winRate: 0.56 } },
    nbaGames: [],
    mlbData: { games: [] },
    golfData: null,
    f1Data: null,
    nflSeasonMode: true,
    nflDraftMeta: {
      phase: "pre_draft",
      boardLocation: "Pittsburgh, PA",
      fullOrderCount: 257,
    },
  });
  assert.ok(cards.some((c) => c.id === "nfl-draft-predictor"));
});

test("hides draft predictor card after draft window", () => {
  const cards = buildHomeTrackerCards({
    performanceData: { summary: { settled: 10, roiUnits: 1.2, winRate: 0.56 } },
    nbaGames: [],
    mlbData: { games: [] },
    golfData: null,
    f1Data: null,
    nflSeasonMode: true,
    nflDraftMeta: {
      phase: "post_draft",
      boardLocation: "Pittsburgh, PA",
      fullOrderCount: 257,
    },
  });
  assert.equal(cards.some((c) => c.id === "nfl-draft-predictor"), false);
});
