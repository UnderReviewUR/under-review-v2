import assert from "node:assert/strict";
import test from "node:test";
import {
  UR_TAKE_STAKE_MATH_PROMPT,
  UR_TAKE_SLIP_STAKE_MATH_PROMPT,
  UR_TAKE_LIVE_CASHOUT_STAKE_MATH_PROMPT,
  WC_STAKE_MATH_FOLLOW_UP_APPENDIX,
} from "./urTakeStakeMathPrompt.js";

test("UR_TAKE_STAKE_MATH_PROMPT — tier A/B/C/D present", () => {
  assert.match(UR_TAKE_STAKE_MATH_PROMPT, /TIER A/);
  assert.match(UR_TAKE_STAKE_MATH_PROMPT, /TIER B/);
  assert.match(UR_TAKE_STAKE_MATH_PROMPT, /TIER C/);
  assert.match(UR_TAKE_STAKE_MATH_PROMPT, /TIER D/);
  assert.match(UR_TAKE_STAKE_MATH_PROMPT, /sixty cents/);
  assert.match(UR_TAKE_STAKE_MATH_PROMPT, /parlay/i);
});

test("UR_TAKE_SLIP_STAKE_MATH_PROMPT — slip sections", () => {
  assert.match(UR_TAKE_SLIP_STAKE_MATH_PROMPT, /FIRST CUT/);
  assert.match(UR_TAKE_SLIP_STAKE_MATH_PROMPT, /cash-out/i);
});

test("UR_TAKE_LIVE_CASHOUT_STAKE_MATH_PROMPT — offer vs full payout", () => {
  assert.match(UR_TAKE_LIVE_CASHOUT_STAKE_MATH_PROMPT, /\$45 if it wins/);
});

test("WC_STAKE_MATH_FOLLOW_UP_APPENDIX — field and knockout chalk", () => {
  assert.match(WC_STAKE_MATH_FOLLOW_UP_APPENDIX, /The Field/);
  assert.match(WC_STAKE_MATH_FOLLOW_UP_APPENDIX, /knockout ML chalk/i);
});
