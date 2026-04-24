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
    nflDraftMeta: {
      phase: "pre_draft",
      boardLocation: "Pittsburgh, PA",
      fullOrderCount: 257,
    },
    promoNowMs: Date.parse("2026-04-10T17:00:00.000Z"),
  });
  const draftCard = cards.find((c) => c.id === "nfl-draft-predictor");
  assert.ok(draftCard);
  assert.equal(draftCard.defaultPrompt, "Which team has the most interesting draft situation?");
  assert.equal(draftCard.quickHitters?.[0], "Which team has the most interesting draft situation?");
  assert.equal(draftCard.quickHitters?.[1], "Simulate Cowboys rounds 1-3");
  assert.equal(draftCard.quickHitters?.[2], "Who are the best EDGE prospects?");
  assert.ok(String(draftCard.blurb || "").includes("Ask about your team's picks"));
});

test("shows draft predictor during pre-draft even when nflSeasonMode is off", () => {
  const cards = buildHomeTrackerCards({
    performanceData: { summary: { settled: 10, roiUnits: 1.2, winRate: 0.56 } },
    nbaGames: [],
    mlbData: { games: [] },
    golfData: null,
    f1Data: null,
    nflSeasonMode: false,
    nflDraftMeta: {
      phase: "pre_draft",
      boardLocation: "Pittsburgh, PA",
      fullOrderCount: 257,
    },
    promoNowMs: Date.parse("2026-04-10T17:00:00.000Z"),
  });
  assert.ok(cards.some((c) => c.id === "nfl-draft-predictor"));
});

test("draft predictor copy promotes Rounds 2–3 on calendar day", () => {
  const cards = buildHomeTrackerCards({
    performanceData: { summary: { settled: 10, roiUnits: 1.2, winRate: 0.56 } },
    nbaGames: [],
    mlbData: { games: [] },
    golfData: null,
    f1Data: null,
    nflDraftMeta: {
      phase: "during_draft",
      fullOrderCount: 257,
      event: {
        dates: { round1: "2026-04-23", rounds2to3: "2026-04-24", rounds4to7: "2026-04-25" },
      },
    },
    promoNowMs: Date.parse("2026-04-24T17:00:00.000Z"),
  });
  const draftCard = cards.find((c) => c.id === "nfl-draft-predictor");
  assert.ok(draftCard);
  assert.match(String(draftCard.time || ""), /Rounds 2/i);
  assert.match(String(draftCard.defaultPrompt || ""), /Round 2/i);
});

test("hides draft predictor card after draft window", () => {
  const cards = buildHomeTrackerCards({
    performanceData: { summary: { settled: 10, roiUnits: 1.2, winRate: 0.56 } },
    nbaGames: [],
    mlbData: { games: [] },
    golfData: null,
    f1Data: null,
    nflDraftMeta: {
      phase: "post_draft",
      boardLocation: "Pittsburgh, PA",
      fullOrderCount: 257,
    },
  });
  assert.equal(cards.some((c) => c.id === "nfl-draft-predictor"), false);
});

test("home tracker card carries P-PR4b thesis copy", () => {
  const cards = buildHomeTrackerCards({
    performanceData: { summary: { settled: 12, roiUnits: 2.1, winRate: 0.55 } },
    nbaGames: [],
    mlbData: { games: [] },
    golfData: null,
    f1Data: null,
    nflDraftMeta: { phase: "post_draft", fullOrderCount: 257 },
    excludeEventKeys: new Set(),
  });
  const tracker = cards.find((c) => c.id === "ur-home-tracker");
  assert.ok(tracker);
  assert.equal(tracker.title, "Today's edges + verified record");
  assert.match(String(tracker.whatMatters || ""), /Three different market types/);
  assert.match(String(tracker.blurb || ""), /VERIFIED RECORD/);
});
