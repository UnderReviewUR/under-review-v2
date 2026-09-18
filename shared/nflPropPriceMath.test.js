import assert from "node:assert/strict";
import test from "node:test";
import {
  americanToImpliedProb,
  americanToDecimal,
  removeTwoWayVig,
  flatBetEv,
  overPriceEdge,
  consensusOddsNearLine,
  isValidAmericanOdds,
  impliedProbToAmerican,
} from "./nflPropPriceMath.js";

test("americanToImpliedProb handles favorites and dogs", () => {
  assert.ok(Math.abs(americanToImpliedProb(-110) - 110 / 210) < 1e-9);
  assert.ok(Math.abs(americanToImpliedProb(100) - 0.5) < 1e-9);
  assert.ok(Math.abs(americanToImpliedProb(-115) - 115 / 215) < 1e-9);
});

test("removeTwoWayVig on -110/-110 is ~50/50 with vig", () => {
  const v = removeTwoWayVig(-110, -110);
  assert.ok(v);
  assert.ok(Math.abs(v.fairOver - 0.5) < 1e-9);
  assert.ok(Math.abs(v.fairUnder - 0.5) < 1e-9);
  assert.ok(v.vig > 0.04 && v.vig < 0.05);
});

test("flatBetEv: coin flip at -110 is negative hold", () => {
  const ev = flatBetEv(0.5, -110);
  assert.ok(ev != null && ev < 0);
  // classic ~-4.5% juice
  assert.ok(ev > -0.05 && ev < -0.04);
});

test("flatBetEv: 55% true at -110 is +EV", () => {
  const ev = flatBetEv(0.55, -110);
  assert.ok(ev != null && ev > 0);
});

test("overPriceEdge signs correctly", () => {
  assert.ok(overPriceEdge(0.55, 0.5) > 0);
  assert.ok(overPriceEdge(0.45, 0.5) < 0);
});

test("consensusOddsNearLine prefers quotes on the median line", () => {
  const c = consensusOddsNearLine(
    [
      { line: 72.5, overOdds: -115, underOdds: -105 },
      { line: 72.5, overOdds: -110, underOdds: -110 },
      { line: 75.5, overOdds: -200, underOdds: 150 },
    ],
    72.5,
  );
  assert.equal(c.booksAtLine, 2);
  assert.ok(isValidAmericanOdds(c.overOdds));
  assert.ok(isValidAmericanOdds(c.underOdds));
  // Should sit near -110/-110 band, not midpoint junk
  assert.ok(c.overOdds <= -100 && c.overOdds >= -120);
});

test("consensusOddsNearLine does not midpoint +100 and -110 into -5", () => {
  const c = consensusOddsNearLine(
    [
      { line: 5.5, overOdds: -110, underOdds: -110 },
      { line: 5.5, overOdds: 100, underOdds: -130 },
    ],
    5.5,
  );
  assert.ok(isValidAmericanOdds(c.overOdds));
  assert.ok(Math.abs(c.overOdds) >= 100);
});

test("impliedProbToAmerican round-trips favorites", () => {
  const p = americanToImpliedProb(-150);
  const back = impliedProbToAmerican(p);
  assert.equal(back, -150);
});

test("americanToDecimal matches juice", () => {
  assert.ok(Math.abs(americanToDecimal(-110) - (1 + 100 / 110)) < 1e-9);
  assert.ok(Math.abs(americanToDecimal(150) - 2.5) < 1e-9);
});
