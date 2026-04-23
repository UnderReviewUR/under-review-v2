import test from "node:test";
import assert from "node:assert/strict";

import { classifyNbaBoardGamePhase, nbaGameHasVerifiedBoxScore } from "./nba.js";

const gamePregame = {
  state: "pre",
  status: "7:30 PM ET",
  homeTeam: { abbr: "OKC", score: null },
  awayTeam: { abbr: "PHX", score: null },
};

const gameLive = {
  state: "in",
  status: "Q3 7:22",
  period: 3,
  homeTeam: { abbr: "OKC", score: 88 },
  awayTeam: { abbr: "PHX", score: 82 },
};

const gameHalftime = {
  state: "in",
  status: "Halftime",
  period: 2,
  homeTeam: { abbr: "OKC", score: 56 },
  awayTeam: { abbr: "PHX", score: 52 },
};

const gameFinal = {
  state: "post",
  status: "Final",
  homeTeam: { abbr: "OKC", score: 112 },
  awayTeam: { abbr: "PHX", score: 105 },
};

test("classifyNbaBoardGamePhase: pregame / live / halftime / final / unknown", () => {
  assert.equal(classifyNbaBoardGamePhase(gamePregame), "pregame");
  assert.equal(classifyNbaBoardGamePhase(gameLive), "live");
  assert.equal(classifyNbaBoardGamePhase(gameHalftime), "halftime");
  assert.equal(classifyNbaBoardGamePhase(gameFinal), "final");
  assert.equal(classifyNbaBoardGamePhase(null), "unknown");
});

test("nbaGameHasVerifiedBoxScore requires both scores finite", () => {
  assert.equal(nbaGameHasVerifiedBoxScore(gameLive), true);
  assert.equal(nbaGameHasVerifiedBoxScore(gamePregame), false);
});
