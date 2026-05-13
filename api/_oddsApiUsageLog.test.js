import test from "node:test";
import assert from "node:assert/strict";
import { computeExpectedOddsCredits, redactOddsApiUrl } from "./_oddsApiUsageLog.js";

test("redactOddsApiUrl strips apiKey", () => {
  const u = "https://api.the-odds-api.com/v4/sports/x/odds/?apiKey=SECRET123&regions=us";
  assert.match(redactOddsApiUrl(u), /apiKey=REDACTED/);
  assert.doesNotMatch(redactOddsApiUrl(u), /SECRET123/);
});

test("NBA list h2h + us => 1 credit", () => {
  const u =
    "https://api.the-odds-api.com/v4/sports/basketball_nba/odds/?apiKey=k&regions=us&markets=h2h&oddsFormat=american";
  const r = computeExpectedOddsCredits(u);
  assert.equal(r.kind, "sport_odds");
  assert.equal(r.expected, 1);
});

test("NBA event 4 markets + us => 4 credits", () => {
  const u =
    "https://api.the-odds-api.com/v4/sports/basketball_nba/events/e1/odds?apiKey=k&regions=us&markets=player_points,player_rebounds,player_assists,player_points_rebounds_assists&oddsFormat=american";
  const r = computeExpectedOddsCredits(u);
  assert.equal(r.kind, "event_odds");
  assert.equal(r.expected, 4);
});

test("scores daysFrom=2 => 2 credits", () => {
  const u = "https://api.the-odds-api.com/v4/sports/basketball_nba/scores/?apiKey=k&daysFrom=2";
  const r = computeExpectedOddsCredits(u);
  assert.equal(r.kind, "scores");
  assert.equal(r.expected, 2);
});

test("scores no daysFrom => 1 credit", () => {
  const u = "https://api.the-odds-api.com/v4/sports/basketball_nba/scores/?apiKey=k";
  const r = computeExpectedOddsCredits(u);
  assert.equal(r.expected, 1);
});

test("tennis list us,us2 + h2h => 2 credits", () => {
  const u =
    "https://api.the-odds-api.com/v4/sports/tennis_atp/odds/?apiKey=k&regions=us,us2&markets=h2h&oddsFormat=american";
  const r = computeExpectedOddsCredits(u);
  assert.equal(r.expected, 2);
});

test("MLB totals list => 1 credit", () => {
  const u =
    "https://api.the-odds-api.com/v4/sports/baseball_mlb/odds/?apiKey=k&regions=us&markets=totals&oddsFormat=american";
  const r = computeExpectedOddsCredits(u);
  assert.equal(r.expected, 1);
});

test("golf event 3 markets us => 3 credits", () => {
  const u =
    "https://api.the-odds-api.com/v4/sports/golf_pga/events/x/odds?apiKey=k&regions=us&markets=top_10_finish,top_20_finish,make_cut&oddsFormat=american";
  const r = computeExpectedOddsCredits(u);
  assert.equal(r.expected, 3);
});
