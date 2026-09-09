import assert from "node:assert/strict";
import test from "node:test";
import {
  looksLikeNflPropsBoardAsk,
  normalizeNflAskQuestion,
} from "./nflAskNormalize.js";

test("normalizeNflAskQuestion fixes messy props asks and team typos", () => {
  const q = normalizeNflAskQuestion("what ar ethe best playre propes for seahaks vs patroits?");
  assert.match(q, /what are the/i);
  assert.match(q, /player props/i);
  assert.match(q, /seahawks/i);
  assert.match(q, /patriots/i);
  assert.doesNotMatch(normalizeNflAskQuestion("who beats the spread?"), /bears/i);
});

test("looksLikeNflPropsBoardAsk covers best bets / this game / vs", () => {
  assert.equal(looksLikeNflPropsBoardAsk("best bets for SEA vs NE"), true);
  assert.equal(looksLikeNflPropsBoardAsk("best props for this game"), true);
  assert.equal(looksLikeNflPropsBoardAsk("any good props for the seahawks game?"), true);
  assert.equal(looksLikeNflPropsBoardAsk("Maye passing yards over 232.5?"), false);
});
