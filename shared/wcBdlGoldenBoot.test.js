import test from "node:test";
import assert from "node:assert/strict";
import {
  extractBdlGoldenBootRowsFromFutures,
  isBdlGoldenBootMarketType,
} from "./wcBdlGoldenBoot.js";

test("isBdlGoldenBootMarketType matches scorer markets", () => {
  assert.equal(isBdlGoldenBootMarketType("top_goalscorer"), true);
  assert.equal(isBdlGoldenBootMarketType("golden_boot"), true);
  assert.equal(isBdlGoldenBootMarketType("outright"), false);
});

test("extractBdlGoldenBootRowsFromFutures maps player subjects", () => {
  const rows = extractBdlGoldenBootRowsFromFutures([
    {
      market_type: "top_goalscorer",
      vendor: "draftkings",
      american_odds: 450,
      subject: { first_name: "Kylian", last_name: "Mbappé", team: { abbreviation: "FRA" } },
    },
    {
      market_type: "outright",
      vendor: "draftkings",
      american_odds: 1400,
      subject: { abbreviation: "GER", name: "Germany" },
    },
  ]);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].name, "Kylian Mbappé");
  assert.equal(rows[0].nationAbbr, "FRA");
  assert.equal(rows[0].americanOdds, "+450");
});
