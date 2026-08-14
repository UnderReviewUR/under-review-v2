import assert from "node:assert/strict";
import test from "node:test";
import { shouldSkipNflLiveBoardForAsk } from "../shared/nflAskBoardPolicy.js";

test("skips board for draft and futures asks", () => {
  assert.equal(shouldSkipNflLiveBoardForAsk("simulate the cowboys draft"), true);
  assert.equal(shouldSkipNflLiveBoardForAsk("Chiefs season win total over?"), true);
  assert.equal(shouldSkipNflLiveBoardForAsk("Who wins MVP futures"), true);
  assert.equal(shouldSkipNflLiveBoardForAsk("playoff bracket predictor"), true);
});

test("does not skip board for prop asks", () => {
  assert.equal(shouldSkipNflLiveBoardForAsk("James Cook rush yards over"), false);
  assert.equal(shouldSkipNflLiveBoardForAsk("spread on KC vs BUF"), false);
});
