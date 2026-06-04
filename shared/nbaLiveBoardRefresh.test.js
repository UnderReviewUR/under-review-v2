import assert from "node:assert/strict";
import test from "node:test";
import { NBA_FINALS_RELEVANCE_REGRESSION_TURNS } from "../api/nbaUrTakeRelevance.fixture.js";
import { buildNbaLiveBoxscoreFromBoard } from "../api/nba.js";
import {
  nbaBoardCacheTtlMs,
  nbaRequiresLiveUrTakeBoardRefresh,
  NBA_BOARD_CACHE_TTL_LIVE_MS,
} from "./nbaLiveBoardRefresh.js";

test("nbaRequiresLiveUrTakeBoardRefresh — live Q2 Finals turn", () => {
  const clientContext = {
    todaysGames: [
      {
        state: "in",
        period: 2,
        id: 9001,
        awayTeam: { abbr: "SAS", score: 48 },
        homeTeam: { abbr: "NYK", score: 52 },
      },
    ],
    propLines: [{ game: "SAS @ NYK" }],
  };
  const q = NBA_FINALS_RELEVANCE_REGRESSION_TURNS[1].question;
  assert.equal(nbaRequiresLiveUrTakeBoardRefresh(clientContext, q), true);
});

test("nbaRequiresLiveUrTakeBoardRefresh — pregame does not force", () => {
  const clientContext = {
    todaysGames: [
      {
        state: "pre",
        awayTeam: { abbr: "SAS" },
        homeTeam: { abbr: "NYK" },
      },
    ],
    propLines: [{ game: "SAS @ NYK" }],
  };
  const q = NBA_FINALS_RELEVANCE_REGRESSION_TURNS[0].question;
  assert.equal(nbaRequiresLiveUrTakeBoardRefresh(clientContext, q), false);
});

test("nbaBoardCacheTtlMs — short TTL when slate is live", () => {
  assert.equal(nbaBoardCacheTtlMs([{ state: "in" }]), NBA_BOARD_CACHE_TTL_LIVE_MS);
  assert.equal(nbaBoardCacheTtlMs([{ state: "pre" }]), 5 * 60 * 1000);
});

test("buildNbaLiveBoxscoreFromBoard — populates players for live game", () => {
  const board = {
    fetchedAt: new Date().toISOString(),
    todaysGames: [
      {
        state: "in",
        period: 2,
        id: 42,
        awayTeam: { abbr: "SAS", score: 50 },
        homeTeam: { abbr: "NYK", score: 54 },
      },
    ],
    playerStats: [
      { gameId: 42, name: "Jalen Brunson", team: "NYK", pf: 2, pts: 14 },
      { gameId: 42, name: "Victor Wembanyama", team: "SAS", pf: 1, pts: 12 },
    ],
  };
  const box = buildNbaLiveBoxscoreFromBoard(board, "Knicks vs Spurs live Q2");
  assert.ok(box);
  assert.equal(box.period, 2);
  assert.equal(box.players.length, 2);
});
