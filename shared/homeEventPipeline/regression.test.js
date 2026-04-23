import test from "node:test";
import assert from "node:assert/strict";
import { buildHomeEventPipeline } from "./buildHomeEventPipeline.js";
import { mergeTennisNormalizedByPairDate } from "./tennisMerge.js";
import { PRIORITY_BASE } from "./priority.js";

test("empty MLB array does not pull games from mlbData.games into snapshot keys via passthrough", () => {
  const pipeline = buildHomeEventPipeline({
    nbaGames: [],
    mlbGames: [],
    mlbData: {
      games: [{ id: "x", state: "pre", awayTeam: { abbr: "A" }, homeTeam: { abbr: "B" }, date: "2026-04-23T18:00:00Z" }],
    },
    tennisMatches: [],
    f1Data: {},
    golfData: null,
    isNflSlateActive: false,
    golfSnapshotKeyFn: () => null,
  });
  assert.equal(pipeline.mlbGamesForHome.length, 0);
  assert.ok(!pipeline.liveSnapshotKeys.some((k) => String(k).startsWith("mlb:")));
});

test("NBA playoff context scores above tennis tier", () => {
  const nbaPlayoff = PRIORITY_BASE.NBA_PLAYOFF + 50_000;
  const tennis = PRIORITY_BASE.TENNIS;
  assert.ok(nbaPlayoff > tennis);
});

test("merge tennis prefers BDL-keyed row over odds-only for same pair+date", () => {
  const pairDate = "2026-04-20";
  const a = {
    sport: "tennis",
    event_id: "tennis:odds:1",
    priority_score: 500_000,
    raw: {
      home: "nadal",
      away: "alcaraz",
      event_date: pairDate,
      raw: { odds_event_id: "odds1", truth_layer: "odds_market_fallback" },
    },
  };
  const b = {
    sport: "tennis",
    event_id: "tennis:bdl:99",
    priority_score: 500_000,
    raw: {
      home: "nadal",
      away: "alcaraz",
      event_date: pairDate,
      raw: { bdl_match_id: "99", truth_layer: "bdl_fixture" },
    },
  };
  const merged = mergeTennisNormalizedByPairDate([a, b]);
  assert.equal(merged.length, 1);
  assert.match(String(merged[0].event_id), /bdl:99|tennis:bdl:99/);
});
