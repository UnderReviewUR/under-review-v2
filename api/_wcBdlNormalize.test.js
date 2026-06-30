import assert from "node:assert/strict";
import test from "node:test";
import {
  buildBdlPlayerIdLookup,
  collapseBdlIngestRowsOnePerPlayer,
  extractBdlRowTotals,
  normalizeBdlPlayerPropsToMarkets,
  pickBdlMatchOddsForMatch,
  pickBdlNestedBtts,
  pickBdlNestedDoubleChance,
  pickBdlNestedDrawNoBet,
  pickBdlNestedMatchSpread,
  pickBdlNestedToAdvanceOdds,
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

test("collapseBdlIngestRowsOnePerPlayer — prefers 1.5 line for shots milestones", () => {
  const rows = [
    { name: "Anthony Gordon", line: "0.5", side: "over", americanOdds: "-435" },
    { name: "Anthony Gordon", line: "1.5", side: "over", americanOdds: "+125" },
    { name: "Anthony Gordon", line: "2.5", side: "over", americanOdds: "+320" },
  ];
  const out = collapseBdlIngestRowsOnePerPlayer(rows, "player_shots_ou");
  assert.equal(out.length, 1);
  assert.equal(out[0].line, "1.5");
  assert.equal(out[0].americanOdds, "+125");
});

test("normalizeBdlPlayerPropsToMarkets — stores full Gordon ladder without ingest cap", () => {
  const lookupEntries = [{ id: 29892, name: "Anthony Gordon", country_code: "ENG" }];
  for (let p = 1; p <= 24; p += 1) {
    lookupEntries.push({ id: p, name: `Player ${p}`, country_code: "ENG" });
  }
  const lookup = buildBdlPlayerIdLookup(lookupEntries);
  /** @type {Array<Record<string, unknown>>} */
  const raw = [];
  for (let p = 1; p <= 25; p += 1) {
    for (const line of ["0.5", "1", "1.5", "2", "2.5"]) {
      raw.push({
        player_id: p === 25 ? 29892 : p,
        prop_type: "shots",
        line_value: line,
        vendor: "fanduel",
        market: { type: "milestone", odds: -100 - p },
      });
    }
  }
  raw.push({
    player_id: 29892,
    prop_type: "shots",
    line_value: "1.5",
    vendor: "betrivers",
    market: { type: "milestone", odds: 125 },
  });

  const markets = normalizeBdlPlayerPropsToMarkets(raw, lookup);
  const gordon = markets.player_shots_ou.filter((r) => /gordon/i.test(r.name));
  assert.equal(gordon.length, 5);
  const gordon15 = gordon.find((r) => r.line === "1.5");
  assert.ok(gordon15);
  assert.equal(gordon15.bookOdds?.betrivers, "+125");
  assert.equal(markets.player_shots_ou.length, 125);
});

test("collapseBdlIngestRowsOnePerPlayer — binary goal_or_assist keeps shortest price", () => {
  const rows = [
    { name: "Anthony Gordon", line: "1", side: "over", americanOdds: "+180" },
    { name: "Anthony Gordon", line: "1", side: "over", americanOdds: "+220" },
  ];
  const out = collapseBdlIngestRowsOnePerPlayer(rows, "player_goal_or_assist");
  assert.equal(out.length, 1);
  assert.equal(out[0].americanOdds, "+180");
});

test("pickBdlNestedToAdvanceOdds — reads nested to-advance market when present", () => {
  const odds = pickBdlNestedToAdvanceOdds([
    {
      name: "Team to Advance",
      outcomes: [
        { type: "home", american_odds: -130 },
        { type: "away", american_odds: 110 },
      ],
    },
  ]);
  assert.deepEqual(odds, { home: "-130", away: "+110" });

  const picked = pickBdlMatchOddsForMatch(
    [
      {
        match_id: 99,
        vendor: "draftkings",
        moneyline_home_odds: -140,
        moneyline_away_odds: 120,
        moneyline_draw_odds: 260,
        markets: [
          {
            name: "To Advance",
            outcomes: [
              { type: "home", american_odds: -125 },
              { type: "away", american_odds: 105 },
            ],
          },
        ],
      },
    ],
    99,
  );
  assert.equal(picked?.toAdvanceHome?.moneyline, "-125");
  assert.equal(picked?.toAdvanceAway?.moneyline, "+105");
});

test("pickBdlNestedBtts — reads both_teams_to_score yes/no", () => {
  const btts = pickBdlNestedBtts([
    {
      type: "both_teams_to_score",
      period: "match",
      scope: "both_teams",
      name: "Both Teams to Score",
      outcomes: [
        { type: "yes", name: "Yes", american_odds: -163 },
        { type: "no", name: "No", american_odds: 125 },
      ],
    },
  ]);
  assert.deepEqual(btts, { yes: "-163", no: "+125" });
});

test("pickBdlNestedDrawNoBet — reads draw_no_bet home/away", () => {
  const dnb = pickBdlNestedDrawNoBet([
    {
      type: "draw_no_bet",
      period: "match",
      scope: "match",
      name: "Draw No Bet",
      outcomes: [
        { type: "home", side: "home", american_odds: -120 },
        { type: "away", side: "away", american_odds: 240 },
      ],
    },
  ]);
  assert.deepEqual(dnb, { home: "-120", away: "+240" });
});

test("pickBdlNestedDoubleChance — classifies 1X / X2 / 12", () => {
  const dc = pickBdlNestedDoubleChance([
    {
      type: "double_chance",
      period: "match",
      scope: "match",
      name: "Double Chance",
      outcomes: [
        { type: "double_chance", side: "home", name: "Netherlands or Tie", american_odds: -260 },
        { type: "double_chance", side: "away", name: "Morocco or Tie", american_odds: 120 },
        { type: "double_chance", name: "Netherlands or Morocco", american_odds: -700 },
      ],
    },
  ]);
  assert.equal(dc?.homeOrDraw, "-260");
  assert.equal(dc?.awayOrDraw, "+120");
  assert.equal(dc?.homeOrAway, "-700");
});

test("pickBdlNestedMatchSpread — picks the most balanced handicap line", () => {
  const spread = pickBdlNestedMatchSpread([
    {
      type: "spread",
      period: "match",
      scope: "match",
      name: "2 Way Spread",
      outcomes: [
        { type: "home", side: "home", handicap: "-1.5", american_odds: 160 },
        { type: "away", side: "away", handicap: "+1.5", american_odds: -200 },
      ],
    },
    {
      type: "spread",
      period: "match",
      scope: "match",
      name: "2 Way Spread",
      outcomes: [
        { type: "home", side: "home", handicap: "-0.5", american_odds: -120 },
        { type: "away", side: "away", handicap: "+0.5", american_odds: -110 },
      ],
    },
  ]);
  assert.equal(spread?.line, -0.5);
  assert.equal(spread?.home, "-120");
  assert.equal(spread?.away, "-110");
});

test("pickBdlMatchOddsForMatch — surfaces BTTS, DNB, double chance from nested markets", () => {
  const odds = pickBdlMatchOddsForMatch(
    [
      {
        match_id: 51,
        vendor: "draftkings",
        moneyline_home_odds: 144,
        moneyline_away_odds: 245,
        moneyline_draw_odds: 210,
        markets: [
          {
            type: "both_teams_to_score",
            period: "match",
            scope: "both_teams",
            name: "Both Teams to Score",
            outcomes: [
              { type: "yes", american_odds: -163 },
              { type: "no", american_odds: 125 },
            ],
          },
          {
            type: "draw_no_bet",
            period: "match",
            scope: "match",
            name: "Draw No Bet",
            outcomes: [
              { type: "home", american_odds: -110 },
              { type: "away", american_odds: 160 },
            ],
          },
        ],
      },
    ],
    51,
  );
  assert.equal(odds?.home?.moneyline, "+144");
  assert.deepEqual(odds?.btts, { yes: "-163", no: "+125" });
  assert.deepEqual(odds?.drawNoBet, { home: "-110", away: "+160" });
});
