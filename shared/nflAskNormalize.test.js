import assert from "node:assert/strict";
import test from "node:test";
import {
  isNflPlayerIdentityAsk,
  looksLikeNflPropsBoardAsk,
  normalizeNflAskQuestion,
} from "./nflAskNormalize.js";

test("normalizeNflAskQuestion does not rewrite roster surnames into team nicknames", () => {
  assert.equal(normalizeNflAskQuestion("pickens"), "pickens");
  assert.doesNotMatch(
    normalizeNflAskQuestion(
      "best player props for cowboys vs commanders? anything for ceedee lamb, pickens, diggs?",
    ),
    /packers/i,
  );
});

test("looksLikeNflPropsBoardAsk covers best bets / this game / vs", () => {
  assert.equal(looksLikeNflPropsBoardAsk("best bets for SEA vs NE"), true);
  assert.equal(looksLikeNflPropsBoardAsk("best props for this game"), true);
  assert.equal(looksLikeNflPropsBoardAsk("any good props for kittle, kyren, kittle? mccaffrey?"), true);
  assert.equal(looksLikeNflPropsBoardAsk("Maye passing yards over 232.5?"), false);
});

test("isNflPlayerIdentityAsk covers who-is follow-ups", () => {
  assert.equal(isNflPlayerIdentityAsk("Who is Vaki?"), true);
  assert.equal(isNflPlayerIdentityAsk("who's Sione Vaki"), true);
  assert.equal(isNflPlayerIdentityAsk("who else?"), false);
  assert.equal(isNflPlayerIdentityAsk("who wins BUF @ DET?"), false);
});
