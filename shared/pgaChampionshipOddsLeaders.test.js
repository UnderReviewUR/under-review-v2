import test from "node:test";
import assert from "node:assert/strict";
import { formatAmericanOddsDisplay } from "./pgaChampionshipOddsLeaders.js";

test("formatAmericanOddsDisplay formats plus and minus", () => {
  assert.equal(formatAmericanOddsDisplay(450), "+450");
  assert.equal(formatAmericanOddsDisplay(-110), "-110");
  assert.equal(formatAmericanOddsDisplay(0), "EVEN");
});
