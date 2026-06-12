import assert from "node:assert/strict";
import test from "node:test";
import {
  buildBdlPlayerIdLookup,
  normalizeBdlPlayerPropsToMarkets,
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
