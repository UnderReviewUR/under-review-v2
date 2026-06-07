import assert from "node:assert/strict";
import test from "node:test";
import {
  extractH2hFromBook,
  extractMultiBookOddsFromEvent,
  findOddsApiEventByTeams,
  oddsApiBookLabel,
  teamNamesMatch,
} from "./multiBookOdds.js";

const SAMPLE_EVENT = {
  id: "evt-1",
  home_team: "Carlos Alcaraz",
  away_team: "Alexander Zverev",
  bookmakers: [
    {
      key: "draftkings",
      markets: [
        {
          key: "h2h",
          outcomes: [
            { name: "Carlos Alcaraz", price: -150 },
            { name: "Alexander Zverev", price: 130 },
          ],
        },
      ],
    },
    {
      key: "fanduel",
      markets: [
        {
          key: "h2h",
          outcomes: [
            { name: "Carlos Alcaraz", price: -145 },
            { name: "Alexander Zverev", price: 125 },
          ],
        },
      ],
    },
    {
      key: "betmgm",
      markets: [
        {
          key: "h2h",
          outcomes: [
            { name: "Carlos Alcaraz", price: -155 },
            { name: "Alexander Zverev", price: 135 },
          ],
        },
      ],
    },
  ],
};

test("oddsApiBookLabel — known US books", () => {
  assert.equal(oddsApiBookLabel("draftkings"), "DraftKings");
  assert.equal(oddsApiBookLabel("fanduel"), "FanDuel");
});

test("teamNamesMatch — last-name fuzzy", () => {
  assert.equal(teamNamesMatch("Carlos Alcaraz", "Alcaraz"), true);
  assert.equal(teamNamesMatch("Mexico", "South Africa"), false);
});

test("extractH2hFromBook — parses american strings", () => {
  const book = SAMPLE_EVENT.bookmakers[0];
  const lines = extractH2hFromBook(book, "Carlos Alcaraz", "Alexander Zverev");
  assert.equal(lines?.home, "-150");
  assert.equal(lines?.away, "+130");
});

test("extractMultiBookOddsFromEvent — three preferred books + market average", () => {
  const board = extractMultiBookOddsFromEvent(SAMPLE_EVENT);
  assert.ok(board);
  assert.equal(board.books.length, 3);
  assert.equal(board.books[0].label, "DraftKings");
  assert.ok(board.marketAverage.home);
  assert.ok(board.marketAverage.away);
});

test("findOddsApiEventByTeams — matches by player names", () => {
  const hit = findOddsApiEventByTeams([SAMPLE_EVENT], "Alcaraz", "Zverev");
  assert.equal(hit?.id, "evt-1");
});
