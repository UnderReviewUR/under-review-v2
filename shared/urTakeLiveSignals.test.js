import assert from "node:assert/strict";
import test from "node:test";
import {
  detectLiveGameSignals,
  isNegatedLiveWording,
  resolveNflAskLiveSignals,
} from "./urTakeLiveSignals.js";

test("Don't talk like this is live is not a live keyword", () => {
  const rec = detectLiveGameSignals(
    "GB @ PIT is pregame · Thu 7:00 PM ET. Side, total, or pass? Don't talk like this is live if it's still pregame.",
  );
  assert.equal(rec.hasLiveKeyword, false);
  assert.equal(rec.isLive, false);
  assert.equal(
    isNegatedLiveWording(
      "gb pit is pregame thu 7 00 pm et side total or pass don t talk like this is live if it s still pregame",
    ),
    true,
  );
});

test("Q3 / minutes left still counts as live", () => {
  const rec = detectLiveGameSignals("GB @ PIT Q3 4 minutes left — still on GB -2.5?");
  assert.equal(rec.hasLiveKeyword, true);
  assert.equal(rec.isLive, true);
});

test("bare live still counts", () => {
  const rec = detectLiveGameSignals("live look at the GB-PIT total");
  assert.equal(rec.hasLiveKeyword, true);
});

test("NFL this half / right now on a pregame board is not live-mode", () => {
  const games = [{ status: "scheduled", awayAbbr: "DEN", homeAbbr: "ATL" }];
  const half = resolveNflAskLiveSignals({
    question: "DEN @ ATL first half total — lean over?",
    games,
  });
  assert.equal(half.isBoardLive, false);
  assert.equal(half.isEffectivelyLive, false);

  const now = resolveNflAskLiveSignals({
    question: "What's the lean right now on MIA @ WAS?",
    games,
  });
  assert.equal(now.isEffectivelyLive, false);
});

test("NFL inprogress board is live-mode without a keyword", () => {
  const rec = resolveNflAskLiveSignals({
    question: "DEN @ ATL side or total?",
    games: [{ status: "inprogress", awayAbbr: "DEN", homeAbbr: "ATL" }],
  });
  assert.equal(rec.isBoardLive, true);
  assert.equal(rec.isEffectivelyLive, true);
});

test("NFL Q3 minutes left still live when the board is empty", () => {
  const rec = resolveNflAskLiveSignals({
    question: "GB @ PIT Q3 4 minutes left — still on GB -2.5?",
    games: [],
  });
  assert.equal(rec.isEffectivelyLive, true);
});

test("NFL Q3 does not override a pregame board", () => {
  const rec = resolveNflAskLiveSignals({
    question: "GB @ PIT Q3 4 minutes left — still on GB -2.5?",
    games: [{ status: "scheduled", awayAbbr: "GB", homeAbbr: "PIT" }],
  });
  assert.equal(rec.isEffectivelyLive, false);
});
