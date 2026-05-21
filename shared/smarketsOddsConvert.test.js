import test from "node:test";
import assert from "node:assert/strict";
import {
  decimalToAmericanOdds,
  smarketsBidToOdds,
  smarketsTickToDecimal,
} from "./smarketsOddsConvert.js";

test("smarketsTickToDecimal", () => {
  assert.equal(smarketsTickToDecimal(357), 3.57);
  assert.equal(smarketsTickToDecimal(2564), 25.64);
  assert.equal(smarketsTickToDecimal(0), null);
  assert.equal(smarketsTickToDecimal(50), null);
});

test("decimalToAmericanOdds", () => {
  assert.equal(decimalToAmericanOdds(3.57), 257);
  assert.equal(decimalToAmericanOdds(2), 100);
  assert.equal(decimalToAmericanOdds(1.5), -200);
});

test("smarketsBidToOdds sample bid", () => {
  const row = smarketsBidToOdds(357);
  assert.ok(row);
  assert.equal(row.decimalOdds, 3.57);
  assert.equal(row.americanOdds, 257);
});
