import assert from "node:assert/strict";
import test from "node:test";
import {
  pickWcBookFavorite,
  reconcileWcMatchOddsHomeAway,
} from "./wcMatchMoneylineProbs.js";

const INVERTED_PAR_FRA = {
  home: { moneyline: "-550" },
  away: { moneyline: "+1800" },
  draw: { moneyline: "+650" },
};

test("reconcileWcMatchOddsHomeAway — swaps inverted PAR home / FRA away ML", () => {
  const out = reconcileWcMatchOddsHomeAway(INVERTED_PAR_FRA, "PAR", "FRA");
  assert.equal(out?.home?.moneyline, "+1800");
  assert.equal(out?.away?.moneyline, "-550");
  assert.equal(out?.oddsHomeAwayReconciled, true);
});

test("pickWcBookFavorite — FRA -550 after PAR-home attach inversion", () => {
  const fav = pickWcBookFavorite("PAR", "FRA", INVERTED_PAR_FRA);
  assert.equal(fav.abbr, "FRA");
  assert.equal(fav.odds, "-550");
});
