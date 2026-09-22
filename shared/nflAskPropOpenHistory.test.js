import assert from "node:assert/strict";
import test from "node:test";
import {
  nflOpenHistoryTossUpLean,
  nflOpenMarketEvPrior,
  nflOpenPropPrior,
  nflOpenSpreadBucket,
  normalizeNflOpenHistoryPlayerKey,
  resolveNflPropPlayerSpread,
  resolveNflPropVenue,
  NFL_OPEN_VENUE_UNDER_RATE,
} from "./nflAskPropOpenHistory.js";
import { inferNflPropTicketSide } from "./nflAskPropTrim.js";

test("toss-up lean does not read weather or rest", () => {
  const lean = nflOpenHistoryTossUpLean({
    marketBase: "rush_yds",
    player: "Random Guy",
    venue: "away",
    playerSpread: 10,
  });
  assert.doesNotMatch(`${lean.side} ${lean.why}`, /weather|wind|rain|dome|days rest/i);
});

test("anytime_td open prior leans Under", () => {
  const prior = nflOpenPropPrior("anytime_td");
  assert.ok(prior);
  assert.ok(prior.underRate >= 0.54);
  const lean = nflOpenHistoryTossUpLean({ marketBase: "anytime_td", player: "Random Guy" });
  assert.equal(lean.side, "Under");
  assert.equal(lean.confidence, "market");
});

test("rec_yds open prior does not force Under", () => {
  const prior = nflOpenPropPrior("rec_yds");
  assert.ok(prior);
  assert.ok(prior.underRate <= 0.5);
  const lean = nflOpenHistoryTossUpLean({ marketBase: "rec_yds", player: "Random Guy" });
  assert.equal(lean.side, "Over");
  assert.ok(lean.confidence === "market" || lean.confidence === "neutral");
});

test("away venue leans Under on thin rush_yds", () => {
  assert.ok(NFL_OPEN_VENUE_UNDER_RATE.away.underRate >= 0.54);
  const lean = nflOpenHistoryTossUpLean({
    marketBase: "rush_yds",
    player: "Random Guy",
    venue: "away",
  });
  assert.equal(lean.side, "Under");
  assert.equal(lean.confidence, "venue");
});

test("home venue tips Over when market is fair", () => {
  const lean = nflOpenHistoryTossUpLean({
    marketBase: "rush_yds",
    player: "Random Guy",
    venue: "home",
  });
  assert.equal(lean.side, "Over");
  assert.equal(lean.confidence, "venue");
});

test("resolveNflPropVenue parses away @ home stamp", () => {
  assert.equal(
    resolveNflPropVenue({ game: "MIN @ DET", team: "MIN" }),
    "away",
  );
  assert.equal(
    resolveNflPropVenue({ game: "MIN @ DET", team: "DET" }),
    "home",
  );
});

test("JSN player prior leans Over on thin rush_yds", () => {
  const lean = nflOpenHistoryTossUpLean({
    marketBase: "rush_yds",
    player: "Jaxon Smith-Njigba",
  });
  assert.equal(lean.side, "Over");
  assert.equal(lean.confidence, "player");
});

test("Jefferson player prior leans Under", () => {
  assert.equal(
    normalizeNflOpenHistoryPlayerKey("Justin Jefferson Jr."),
    normalizeNflOpenHistoryPlayerKey("Justin Jefferson"),
  );
  const lean = nflOpenHistoryTossUpLean({
    marketBase: "rush_yds",
    player: "Justin Jefferson",
  });
  assert.equal(lean.side, "Under");
  assert.equal(lean.confidence, "player");
});

test("inferNflPropTicketSide uses open history on toss-up anytime TD", () => {
  const ticket = inferNflPropTicketSide(
    {
      player: "Some WR",
      prop: "anytime td",
      propRaw: "anytime_td",
      line: 0.5,
      overOdds: -110,
      underOdds: -110,
    },
    [],
    { openerWeek: false },
  );
  assert.equal(ticket.side, "Under");
  assert.match(ticket.why, /open history/i);
});

test("inferNflPropTicketSide uses away venue on toss-up", () => {
  const ticket = inferNflPropTicketSide(
    {
      player: "Some RB",
      team: "DAL",
      game: "DAL @ PHI",
      prop: "rushing yards",
      propRaw: "rushing_yards",
      line: 65.5,
      overOdds: -110,
      underOdds: -110,
    },
    [],
    {},
  );
  assert.equal(ticket.side, "Under");
  assert.match(ticket.why, /away/i);
});

test("pass completions open EV prefers Under", () => {
  const ev = nflOpenMarketEvPrior("passing_completions");
  assert.ok(ev);
  assert.equal(ev.preferSide, "Under");
  const lean = nflOpenHistoryTossUpLean({
    marketBase: "passing_completions",
    player: "Random Guy",
  });
  assert.equal(lean.side, "Under");
  assert.equal(lean.confidence, "price");
});

test("pass TDs open EV prefers Over", () => {
  const lean = nflOpenHistoryTossUpLean({
    marketBase: "pass_tds",
    player: "Random Guy",
  });
  assert.equal(lean.side, "Over");
  assert.ok(lean.confidence === "price" || lean.confidence === "market");
});

test("big dog spread leans Under on thin rush_yds", () => {
  assert.equal(nflOpenSpreadBucket(7.5), "big_dog");
  const lean = nflOpenHistoryTossUpLean({
    marketBase: "rush_yds",
    player: "Random Guy",
    playerSpread: 10.5,
  });
  assert.equal(lean.side, "Under");
  assert.equal(lean.confidence, "spread");
});

test("resolveNflPropPlayerSpread uses briefcase opening odds", () => {
  const spread = resolveNflPropPlayerSpread(
    { player: "Some RB", team: "DAL", game: "DAL @ PHI" },
    {
      slate: {
        games: [{ homeAbbr: "PHI", awayAbbr: "DAL", providerGameId: 99 }],
        openingOdds: [{ game_id: 99, spread: { home: -3.5, away: 3.5 } }],
      },
    },
  );
  assert.equal(spread, 3.5);
});

test("inferNflPropTicketSide uses big-dog spread on toss-up", () => {
  const ticket = inferNflPropTicketSide(
    {
      player: "Some WR",
      team: "DAL",
      game: "DAL @ PHI",
      prop: "receiving yards",
      propRaw: "receiving_yards",
      line: 55.5,
      overOdds: -110,
      underOdds: -110,
    },
    [],
    {
      // Home venue would tip Over; force home + big dog via explicit spread.
      // Use PHI home dog? DAL away +3.5 is small_dog. Use +10.5 away = big_dog.
      // Away already wins Under — use home big-dog instead:
      briefcase: {
        slate: {
          games: [{ homeAbbr: "PHI", awayAbbr: "DAL", providerGameId: 1 }],
          openingOdds: [{ game_id: 1, spread: { home: 10.5, away: -10.5 } }],
        },
      },
      playerTeam: "PHI",
      venue: "home",
    },
  );
  // Home + fair-ish rec_yds normally Over; big-dog Under should win.
  assert.equal(ticket.side, "Under");
  assert.match(ticket.why, /big dog/i);
});
