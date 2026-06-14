import assert from "node:assert/strict";
import test from "node:test";
import {
  buildBdlPlayerIdLookup,
  extractBdlRowTotals,
  normalizeBdlPlayerPropsToMarkets,
  pickBdlMatchOddsForMatch,
  pickMainNestedMatchTotal,
} from "./_wcBdlNormalize.js";

test("normalizeBdlPlayerPropsToMarkets — resolves player_id via lookup", () => {
  const lookup = buildBdlPlayerIdLookup([
    { id: 403, name: "Son Heung-min", country_code: "KOR" },
  ]);
  const markets = normalizeBdlPlayerPropsToMarkets(
    [
      {
        player_id: 403,
        prop_type: "shots",
        line_value: "2",
        vendor: "draftkings",
        market: { type: "milestone", odds: -400 },
      },
    ],
    lookup,
  );
  assert.equal(markets.player_shots_ou.length, 1);
  assert.equal(markets.player_shots_ou[0].name, "Son Heung-min");
  assert.equal(markets.player_shots_ou[0].line, "2");
  assert.equal(markets.player_shots_ou[0].side, "over");
  assert.equal(markets.player_shots_ou[0].americanOdds, "-400");
  assert.equal(markets.player_shots_ou[0].nationAbbr, "KOR");
});

test("normalizeBdlPlayerPropsToMarkets — maps goal_or_assist milestone", () => {
  const lookup = buildBdlPlayerIdLookup([
    { id: 88, name: "Raul Jimenez", country_code: "MEX" },
  ]);
  const markets = normalizeBdlPlayerPropsToMarkets(
    [
      {
        player_id: 88,
        prop_type: "goal_or_assist",
        line_value: "1",
        vendor: "draftkings",
        market: { type: "milestone", odds: 180 },
      },
    ],
    lookup,
  );
  assert.equal(markets.player_goal_or_assist.length, 1);
  assert.equal(markets.player_goal_or_assist[0].name, "Raul Jimenez");
  assert.equal(markets.player_goal_or_assist[0].americanOdds, "+180");
  assert.equal(markets.player_goal_or_assist[0].nationAbbr, "MEX");
});

test("pickBdlMatchOddsForMatch — DK moneyline with FD nested 4.5 total", () => {
  const odds = pickBdlMatchOddsForMatch(
    [
      {
        match_id: 9,
        vendor: "draftkings",
        moneyline_home_odds: -4000,
        moneyline_away_odds: 3000,
        moneyline_draw_odds: 1600,
        total_value: null,
        total_over_odds: null,
        markets: [{ type: "total", name: "Moneyline / Over/Under 2.5", period: "match", scope: "match", line_value: "2.5", outcomes: [] }],
      },
      {
        match_id: 9,
        vendor: "fanduel",
        moneyline_home_odds: -5000,
        moneyline_away_odds: 4000,
        moneyline_draw_odds: 2000,
        total_value: null,
        total_over_odds: null,
        markets: [
          {
            type: "total",
            period: "match",
            scope: "match",
            line_value: "3.5",
            name: "Over/Under 3.5 Goals",
            outcomes: [
              { type: "over", american_odds: -240 },
              { type: "under", american_odds: 190 },
            ],
          },
          {
            type: "total",
            period: "match",
            scope: "match",
            line_value: "4.5",
            name: "Over/Under 4.5 Goals",
            outcomes: [
              { type: "over", american_odds: 104 },
              { type: "under", american_odds: -130 },
            ],
          },
        ],
      },
    ],
    9,
  );
  assert.equal(odds?.provider, "draftkings");
  assert.equal(odds?.home?.moneyline, "-4000");
  assert.equal(odds?.totalLine, "4.5");
  assert.equal(odds?.totalOver, "+104");
});

test("extractBdlRowTotals — prefers top-level vendor totals", () => {
  const totals = extractBdlRowTotals({
    total_value: "4.5",
    total_over_odds: 110,
    total_under_odds: -135,
    markets: [],
  });
  assert.equal(totals.totalLine, "4.5");
  assert.equal(totals.totalOver, "+110");
  assert.equal(totals.totalUnder, "-135");
});

test("pickMainNestedMatchTotal — ignores goal bands and combo markets", () => {
  const totals = pickMainNestedMatchTotal([
    {
      type: "total",
      period: "match",
      scope: "match",
      name: "Total Goals Bands",
      line_value: null,
      outcomes: [{ type: "score", american_odds: -475 }],
    },
    {
      type: "total",
      period: "match",
      scope: "match",
      line_value: "2.5",
      name: "Over/Under 2.5 Goals",
      outcomes: [
        { type: "over", american_odds: -650 },
        { type: "under", american_odds: 440 },
      ],
    },
    {
      type: "total",
      period: "match",
      scope: "match",
      line_value: "4.5",
      name: "Over/Under 4.5 Goals",
      outcomes: [
        { type: "over", american_odds: 104 },
        { type: "under", american_odds: -130 },
      ],
    },
  ]);
  assert.equal(totals?.totalLine, "4.5");
  assert.equal(totals?.totalOver, "+104");
});

test("normalizeBdlPlayerPropsToMarkets — skips rows without name or lookup", () => {
  const markets = normalizeBdlPlayerPropsToMarkets([
    {
      player_id: 999,
      prop_type: "shots",
      line_value: "2",
      vendor: "draftkings",
      market: { type: "milestone", odds: -400 },
    },
  ]);
  assert.equal(markets.player_shots_ou.length, 0);
});
