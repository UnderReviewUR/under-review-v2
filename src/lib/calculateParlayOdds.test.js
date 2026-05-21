import assert from "node:assert/strict";
import test from "node:test";
import {
  americanToDecimal,
  calculateParlayOdds,
  decimalToAmerican,
  formatParlayAmericanOdds,
  parseAmericanOddsValue,
  resolveParlayCombinedOddsDisplay,
} from "./calculateParlayOdds.js";

test("parseAmericanOddsValue accepts signed strings and numbers", () => {
  assert.equal(parseAmericanOddsValue("-110"), -110);
  assert.equal(parseAmericanOddsValue("+150"), 150);
  assert.equal(parseAmericanOddsValue("150"), 150);
  assert.equal(parseAmericanOddsValue(-110), -110);
  assert.equal(parseAmericanOddsValue("TBD"), null);
  assert.equal(parseAmericanOddsValue(""), null);
});

test("americanToDecimal and decimalToAmerican round-trip favorites", () => {
  assert.equal(americanToDecimal(-110), 100 / 110 + 1);
  assert.equal(decimalToAmerican(100 / 110 + 1), -110);
});

test("calculateParlayOdds — three -110 legs compound to ~+596", () => {
  const combined = calculateParlayOdds([-110, -110, -110]);
  assert.equal(combined, 596);
  assert.equal(formatParlayAmericanOdds(combined), "+596");
});

test("calculateParlayOdds — two -110 legs compound to ~+264", () => {
  const combined = calculateParlayOdds([-110, -110]);
  assert.equal(combined, 264);
  assert.equal(formatParlayAmericanOdds(combined), "+264");
});

test("calculateParlayOdds — mixed positive and negative legs", () => {
  const combined = calculateParlayOdds([150, -110]);
  assert.equal(combined, 377);
});

test("resolveParlayCombinedOddsDisplay prefers leg math over API total", () => {
  const legs = [
    { odds: "-110" },
    { odds: "-110" },
    { odds: "-110" },
  ];
  assert.equal(resolveParlayCombinedOddsDisplay(legs, "+760"), "+596");
});

test("resolveParlayCombinedOddsDisplay falls back when legs lack prices", () => {
  const legs = [{ odds: "-110" }, { odds: "TBD" }];
  assert.equal(resolveParlayCombinedOddsDisplay(legs, "+760"), "+760");
});

test("resolveParlayCombinedOddsDisplay returns null when nothing is usable", () => {
  const legs = [{ odds: "TBD" }, { odds: "TBD" }];
  assert.equal(resolveParlayCombinedOddsDisplay(legs, "TBD"), null);
});
