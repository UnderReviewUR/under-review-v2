import test from "node:test";
import assert from "node:assert/strict";
import {
  americanOddsProfit,
  americanToDecimal,
  extractFirstAmericanOddsToken,
  formatAmericanOddsStakeProfitPhrase,
  formatOddsAmerican,
  parseAmericanOddsValue,
} from "./formatOddsAmerican.js";

test("parseAmericanOddsValue — positive, negative, invalid", () => {
  assert.equal(parseAmericanOddsValue("+15000"), 15000);
  assert.equal(parseAmericanOddsValue("-110"), -110);
  assert.equal(parseAmericanOddsValue(null), null);
  assert.equal(parseAmericanOddsValue("TBD"), null);
  assert.equal(parseAmericanOddsValue("evens"), null);
});

test("extractFirstAmericanOddsToken — at-price and bare negative", () => {
  assert.equal(
    extractFirstAmericanOddsToken("It's Germany at -669. Does that go to like -575?"),
    "-669",
  );
  assert.equal(extractFirstAmericanOddsToken("Norway at +2500 — mispriced?"), "+2500");
  assert.equal(extractFirstAmericanOddsToken("scoreless 0-0 at five mins"), null);
});

test("americanToDecimal", () => {
  assert.equal(americanToDecimal(15000), 151);
  assert.ok(Math.abs(americanToDecimal(-110) - 1.909090909) < 0.001);
  assert.equal(americanToDecimal(0), null);
});

test("formatOddsAmerican — dual display", () => {
  assert.equal(formatOddsAmerican("+15000"), "+15000 (151.00)");
  assert.equal(formatOddsAmerican("-110"), "-110 (1.91)");
  assert.equal(formatOddsAmerican(null), "—");
  assert.equal(formatOddsAmerican(""), "—");
  assert.equal(formatOddsAmerican("—"), "—");
});

test("americanOddsProfit — field at -3300 and longshot +3000", () => {
  assert.equal(americanOddsProfit(20, -3300), 0.61);
  assert.equal(americanOddsProfit(20, 3000), 600);
});

test("formatAmericanOddsStakeProfitPhrase — conversational cents and dollars", () => {
  assert.equal(formatAmericanOddsStakeProfitPhrase(20, -3300), "about 61 cents");
  assert.equal(formatAmericanOddsStakeProfitPhrase(20, 3000), "$600 profit");
});
