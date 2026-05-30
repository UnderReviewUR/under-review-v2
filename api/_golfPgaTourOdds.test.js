import test from "node:test";
import assert from "node:assert/strict";
import { parsePgaTourAmericanOdds, parsePgaTourOddsPayload } from "./_golfPgaTourOdds.js";

test("parsePgaTourAmericanOdds normalizes PGA Tour odds strings", () => {
  assert.equal(parsePgaTourAmericanOdds("+1400"), 1400);
  assert.equal(parsePgaTourAmericanOdds("-320"), -320);
  assert.equal(parsePgaTourAmericanOdds(""), null);
});

test("parsePgaTourOddsPayload extracts winner and finish markets", () => {
  const markets = {
    availableMarkets: [
      { id: 2360, marketType: "ODDS_TO_WIN", displayName: "To Win", book: "fanduel" },
      { id: 2361, marketType: "FINISH", displayName: "Finishes", book: "fanduel" },
    ],
  };
  const winMarket = {
    marketDisplayName: "To Win",
    subMarkets: [
      {
        subMarketName: "Win Only",
        oddsDataGroup: [
          {
            oddsData: [
              {
                group: [
                  {
                    players: [{ playerId: "1", displayName: "Eric Cole" }],
                    oddsValue: "+650",
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  };
  const finishMarket = {
    marketDisplayName: "Finishes",
    subMarkets: [
      {
        subMarketName: "Top 5",
        oddsDataGroup: [
          {
            oddsData: [
              {
                group: [
                  {
                    players: [{ playerId: "1", displayName: "Eric Cole" }],
                    oddsValue: "+160",
                  },
                ],
              },
            ],
          },
        ],
      },
      {
        subMarketName: "Top 10",
        oddsDataGroup: [
          {
            oddsData: [
              {
                group: [
                  {
                    players: [{ playerId: "1", displayName: "Eric Cole" }],
                    oddsValue: "-110",
                  },
                ],
              },
            ],
          },
        ],
      },
      {
        subMarketName: "Top 20",
        oddsDataGroup: [
          {
            oddsData: [
              {
                group: [
                  {
                    players: [{ playerId: "1", displayName: "Eric Cole" }],
                    oddsValue: "-250",
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  };

  const parsed = parsePgaTourOddsPayload(
    "R2026021",
    markets,
    new Map([
      ["ODDS_TO_WIN", winMarket],
      ["FINISH", finishMarket],
    ])
  );

  assert.equal(parsed.source, "pgatour_site");
  assert.equal(parsed.hasPostedLines, true);
  assert.equal(parsed.outrights[0].player, "Eric Cole");
  assert.equal(parsed.outrights[0].odds, 650);
  assert.equal(parsed.topFinish.top_5[0].odds, 160);
  assert.equal(parsed.topFinish.top_10[0].odds, -110);
  assert.equal(parsed.topFinish.top_20[0].odds, -250);
});
