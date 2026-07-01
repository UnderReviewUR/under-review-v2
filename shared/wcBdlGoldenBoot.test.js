import test from "node:test";
import assert from "node:assert/strict";
import {
  extractBdlGoldenBootRowsFromFutures,
  extractBdlGoldenGloveRowsFromFutures,
  isBdlGoldenBootMarketType,
  isBdlGoldenGloveMarketType,
} from "./wcBdlGoldenBoot.js";

test("isBdlGoldenBootMarketType matches scorer markets", () => {
  assert.equal(isBdlGoldenBootMarketType("top_goalscorer"), true);
  assert.equal(isBdlGoldenBootMarketType("golden_boot"), true);
  assert.equal(isBdlGoldenBootMarketType("outright"), false);
});

test("golden boot vs glove market types do not collide", () => {
  assert.equal(isBdlGoldenGloveMarketType("golden_glove"), true);
  assert.equal(isBdlGoldenGloveMarketType("top_goalkeeper"), true);
  assert.equal(isBdlGoldenGloveMarketType("most_clean_sheets"), true);
  // "top_goalkeeper" must NOT count as Golden Boot
  assert.equal(isBdlGoldenBootMarketType("top_goalkeeper"), false);
  assert.equal(isBdlGoldenBootMarketType("golden_glove"), false);
  assert.equal(isBdlGoldenGloveMarketType("top_goalscorer"), false);
});

test("extractBdlGoldenGloveRowsFromFutures maps keeper subjects", () => {
  const rows = extractBdlGoldenGloveRowsFromFutures([
    {
      market_type: "golden_glove",
      vendor: "draftkings",
      american_odds: 600,
      subject: { first_name: "Gianluigi", last_name: "Donnarumma", team: { abbreviation: "ITA" } },
    },
    {
      market_type: "top_goalscorer",
      vendor: "draftkings",
      american_odds: 450,
      subject: { first_name: "Kylian", last_name: "Mbappé", team: { abbreviation: "FRA" } },
    },
  ]);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].name, "Gianluigi Donnarumma");
  assert.equal(rows[0].nationAbbr, "ITA");
  assert.equal(rows[0].americanOdds, "+600");
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
