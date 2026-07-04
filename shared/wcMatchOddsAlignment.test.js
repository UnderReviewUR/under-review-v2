import assert from "node:assert/strict";
import test from "node:test";
import {
  alignWcMatchOddsToSlateTeams,
  resolveBdlMatchIdForOddsAttach,
  swapWcMatchOddsHomeAway,
  validateWcMoneylinePublicationGuard,
} from "./wcMatchOddsAlignment.js";
import { attachBdlMoneylinesToMatches } from "../api/_wcBdlNormalize.js";
import { pickWcBookFavorite, reconcileWcMatchOddsHomeAway } from "./wcMatchMoneylineProbs.js";

const INVERTED_PAR_FRA = {
  home: { moneyline: "-550" },
  away: { moneyline: "+1800" },
  draw: { moneyline: "+650" },
};

test("swapWcMatchOddsHomeAway — flips ML sides", () => {
  const out = swapWcMatchOddsHomeAway(INVERTED_PAR_FRA);
  assert.equal(out.home.moneyline, "+1800");
  assert.equal(out.away.moneyline, "-550");
});

test("alignWcMatchOddsToSlateTeams — BDL anchor swap when slate home is away side", () => {
  const out = alignWcMatchOddsToSlateTeams(
    {
      home: { moneyline: "+1800" },
      away: { moneyline: "-550" },
      draw: { moneyline: "+650" },
    },
    "FRA",
    "PAR",
    { oddsAnchorHome: "PAR", oddsAnchorAway: "FRA" },
  );
  assert.equal(out.home.moneyline, "-550");
  assert.equal(out.away.moneyline, "+1800");
  assert.equal(out.oddsAlignedToSlate, "bdl_anchor_swap");
});

test("alignWcMatchOddsToSlateTeams — Elo inversion swap for PAR home / FRA away", () => {
  const out = alignWcMatchOddsToSlateTeams(INVERTED_PAR_FRA, "PAR", "FRA", {
    oddsAnchorHome: "PAR",
    oddsAnchorAway: "FRA",
  });
  assert.equal(out.home.moneyline, "+1800");
  assert.equal(out.away.moneyline, "-550");
});

test("validateWcMoneylinePublicationGuard — blocks Paraguay -550 favorite", () => {
  const bad = validateWcMoneylinePublicationGuard("PAR", "FRA", INVERTED_PAR_FRA);
  assert.equal(bad.ok, false);
  assert.equal(bad.reason, "favorite_price_elo_mismatch");
  assert.equal(bad.favoriteAbbr, "PAR");
});

test("validateWcMoneylinePublicationGuard — passes aligned France favorite", () => {
  const aligned = alignWcMatchOddsToSlateTeams(INVERTED_PAR_FRA, "PAR", "FRA", {
    oddsAnchorHome: "PAR",
    oddsAnchorAway: "FRA",
  });
  const ok = validateWcMoneylinePublicationGuard("PAR", "FRA", aligned);
  assert.equal(ok.ok, true);
  assert.equal(ok.favoriteAbbr, "FRA");
});

test("resolveBdlMatchIdForOddsAttach — rejects ESPN event id fallback", () => {
  assert.equal(
    resolveBdlMatchIdForOddsAttach({ id: "760418", homeTeam: "PAR", awayTeam: "FRA" }),
    null,
  );
  assert.equal(
    resolveBdlMatchIdForOddsAttach({ id: "163", bdlMatchId: 163, homeTeam: "PAR", awayTeam: "FRA" }),
    163,
  );
});

test("attachBdlMoneylinesToMatches — maps BDL odds to slate without ESPN id collision", () => {
  const oddsRows = [
    {
      match_id: 163,
      vendor: "draftkings",
      moneyline_home_odds: 1800,
      moneyline_away_odds: -550,
      moneyline_draw_odds: 650,
    },
  ];
  const matches = attachBdlMoneylinesToMatches(
    [
      {
        id: "760418",
        bdlMatchId: 163,
        homeTeam: "PAR",
        awayTeam: "FRA",
        date: "2026-07-04",
      },
    ],
    oddsRows,
    Date.now(),
  );
  assert.equal(matches[0].odds.home.moneyline, "+1800");
  assert.equal(matches[0].odds.away.moneyline, "-550");
  assert.equal(matches[0].bdlOddsAnchorHome, "PAR");
  const fav = pickWcBookFavorite("PAR", "FRA", matches[0].odds, undefined, {
    oddsAnchorHome: matches[0].bdlOddsAnchorHome,
    oddsAnchorAway: matches[0].bdlOddsAnchorAway,
  });
  assert.equal(fav.abbr, "FRA");
  assert.equal(fav.odds, "-550");
});
