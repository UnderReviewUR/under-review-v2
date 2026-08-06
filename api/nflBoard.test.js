import assert from "node:assert/strict";
import test from "node:test";

import { impliedTwoWayFromAmerican, roundProb } from "../shared/nflOddsImplied.js";
import {
  normalizeNflMoneylineMarket,
  normalizeNflSpreadMarket,
  normalizeNflTotalMarket,
} from "./_nflBoardNormalize.js";
import { parseActionNetworkNflGameProps } from "./_nflPropsParse.js";

test("impliedTwoWayFromAmerican de-vigs -110/-110 to ~50/50", () => {
  const tw = impliedTwoWayFromAmerican(-110, -110);
  assert.ok(tw);
  assert.ok(Math.abs(tw.aRaw - 0.5238) < 0.01);
  assert.equal(roundProb(tw.aDevig), 0.5);
  assert.equal(roundProb(tw.bDevig), 0.5);
});

test("normalizeNflTotalMarket attaches over/under implied probs", () => {
  const market = normalizeNflTotalMarket(
    [
      { side: "under", odds: -110, value: 34.5 },
      { side: "over", odds: -110, value: 34.5 },
    ],
    15,
  );
  assert.equal(market.line, 34.5);
  assert.equal(market.book, "DraftKings");
  assert.equal(market.overImpliedDevig, 0.5);
  assert.equal(market.underImpliedDevig, 0.5);
});

test("normalizeNflSpreadMarket builds display line for favorite", () => {
  const market = normalizeNflSpreadMarket(
    [
      { side: "away", odds: -110, value: -1.5 },
      { side: "home", odds: -115, value: 1.5 },
    ],
    15,
    "ARI",
    "CAR",
  );
  assert.equal(market.favoriteAbbr, "CAR");
  assert.equal(market.displayLine, "CAR -1.5");
  assert.ok(market.awayImpliedDevig != null);
});

test("normalizeNflMoneylineMarket returns both sides", () => {
  const market = normalizeNflMoneylineMarket(
    [
      { side: "home", odds: 105 },
      { side: "away", odds: -125 },
    ],
    15,
    "ARI",
    "CAR",
  );
  assert.equal(market.homeOdds, 105);
  assert.equal(market.awayOdds, -125);
  assert.ok(market.awayImplied > market.homeImplied);
});

test("parseActionNetworkNflGameProps maps pass yards consensus", () => {
  const parsed = parseActionNetworkNflGameProps(
    {
      core_bet_type_9_passing_yards: [
        {
          player_id: 7761,
          player_abbr: "J.Brissett",
          lines: {
            15: [
              { side: "over", odds: -125, value: 239.5, book_id: 15 },
              { side: "under", odds: -105, value: 239.5, book_id: 15 },
            ],
          },
        },
      ],
    },
    {
      7761: { id: 7761, abbr: "J.Brissett", full_name: "Jacoby Brissett", team_id: 153 },
    },
    290801,
  );

  assert.equal(parsed.playerCount, 1);
  assert.equal(parsed.hasPostedLines, true);
  assert.equal(parsed.players[0].fullName, "Jacoby Brissett");
  assert.equal(parsed.players[0].props.pass_yds.over.line, 239.5);
  assert.equal(parsed.players[0].props.pass_yds.over.odds, -125);
});
