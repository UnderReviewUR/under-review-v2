import test from "node:test";
import assert from "node:assert/strict";

import {
  parseAmericanOddsValue,
  americanToDecimal,
  decimalToAmerican,
  calculateParlayOdds,
  formatParlayAmericanOdds,
  resolveParlayCombinedOddsDisplay,
} from "./calculateParlayOdds.js";

// --- parseAmericanOddsValue ---

test("parseAmericanOddsValue parses positive string", () => {
  assert.equal(parseAmericanOddsValue("+150"), 150);
});

test("parseAmericanOddsValue parses negative string", () => {
  assert.equal(parseAmericanOddsValue("-110"), -110);
});

test("parseAmericanOddsValue parses number", () => {
  assert.equal(parseAmericanOddsValue(-200), -200);
});

test("parseAmericanOddsValue returns null for null/undefined/empty", () => {
  assert.equal(parseAmericanOddsValue(null), null);
  assert.equal(parseAmericanOddsValue(undefined), null);
  assert.equal(parseAmericanOddsValue(""), null);
});

test("parseAmericanOddsValue returns null for TBD", () => {
  assert.equal(parseAmericanOddsValue("TBD"), null);
});

test("parseAmericanOddsValue returns null for zero", () => {
  assert.equal(parseAmericanOddsValue(0), null);
  assert.equal(parseAmericanOddsValue("0"), null);
});

test("parseAmericanOddsValue returns null for non-numeric string", () => {
  assert.equal(parseAmericanOddsValue("abc"), null);
});

test("parseAmericanOddsValue truncates fractional numbers", () => {
  assert.equal(parseAmericanOddsValue(150.7), 150);
});

test("parseAmericanOddsValue returns null for Infinity", () => {
  assert.equal(parseAmericanOddsValue(Infinity), null);
});

// --- americanToDecimal ---

test("americanToDecimal converts negative odds", () => {
  const dec = americanToDecimal(-200);
  assert.ok(Math.abs(dec - 1.5) < 0.001);
});

test("americanToDecimal converts positive odds", () => {
  const dec = americanToDecimal(150);
  assert.ok(Math.abs(dec - 2.5) < 0.001);
});

test("americanToDecimal -110 equals ~1.909", () => {
  const dec = americanToDecimal(-110);
  assert.ok(Math.abs(dec - 1.909) < 0.01);
});

// --- decimalToAmerican ---

test("decimalToAmerican converts decimal >= 2 to positive american", () => {
  assert.equal(decimalToAmerican(2.5), 150);
});

test("decimalToAmerican converts decimal < 2 to negative american", () => {
  assert.equal(decimalToAmerican(1.5), -200);
});

// --- calculateParlayOdds ---

test("calculateParlayOdds combines two -110 legs", () => {
  const result = calculateParlayOdds([-110, -110]);
  assert.ok(result != null);
  assert.ok(result > 200 && result < 300);
});

test("calculateParlayOdds returns null for fewer than 2 legs", () => {
  assert.equal(calculateParlayOdds([-110]), null);
  assert.equal(calculateParlayOdds([]), null);
});

test("calculateParlayOdds returns null for non-array", () => {
  assert.equal(calculateParlayOdds(null), null);
  assert.equal(calculateParlayOdds("not array"), null);
});

test("calculateParlayOdds returns null if any leg is null/invalid", () => {
  assert.equal(calculateParlayOdds([-110, "abc"]), null);
});

test("calculateParlayOdds handles string odds in legs", () => {
  const result = calculateParlayOdds(["-110", "+150"]);
  assert.ok(result != null);
});

test("calculateParlayOdds three legs produces higher odds", () => {
  const two = calculateParlayOdds([-110, -110]);
  const three = calculateParlayOdds([-110, -110, -110]);
  assert.ok(three > two);
});

// --- formatParlayAmericanOdds ---

test("formatParlayAmericanOdds adds + to positive", () => {
  assert.equal(formatParlayAmericanOdds(264), "+264");
});

test("formatParlayAmericanOdds keeps - for negative", () => {
  assert.equal(formatParlayAmericanOdds(-110), "-110");
});

test("formatParlayAmericanOdds returns empty for zero", () => {
  assert.equal(formatParlayAmericanOdds(0), "");
});

test("formatParlayAmericanOdds returns empty for NaN", () => {
  assert.equal(formatParlayAmericanOdds(NaN), "");
});

// --- resolveParlayCombinedOddsDisplay ---

test("resolveParlayCombinedOddsDisplay computes from leg odds", () => {
  const result = resolveParlayCombinedOddsDisplay(
    [{ odds: "-110" }, { odds: "-110" }],
    null,
  );
  assert.ok(result != null);
  assert.ok(result.startsWith("+"));
});

test("resolveParlayCombinedOddsDisplay falls back to total odds", () => {
  const result = resolveParlayCombinedOddsDisplay(
    [{ odds: null }, { odds: null }],
    "+500",
  );
  assert.equal(result, "+500");
});

test("resolveParlayCombinedOddsDisplay returns null for insufficient legs", () => {
  assert.equal(resolveParlayCombinedOddsDisplay([{ odds: "-110" }], null), null);
});

test("resolveParlayCombinedOddsDisplay returns null when no data", () => {
  assert.equal(resolveParlayCombinedOddsDisplay(null, null), null);
});
