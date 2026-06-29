import assert from "node:assert/strict";
import test from "node:test";
import {
  isWcOddsLineMovementQuestion,
  repairWcOddsLineMovementGenericPass,
  synthesizeWcOddsLineMovementLean,
} from "./wcOddsLineMovement.js";

test("isWcOddsLineMovementQuestion — Germany scoreless at 5 min", () => {
  const q = "Will Germany odds go up or down if it's 5 mins in and scoreless?";
  assert.equal(isWcOddsLineMovementQuestion(q), true);
});

test("isWcOddsLineMovementQuestion — cited -669 target -575", () => {
  const q = "It's Germany at -669. Does that go to like -575 if it's scoreless early on?";
  assert.equal(isWcOddsLineMovementQuestion(q), true);
});

test("isWcOddsLineMovementQuestion — not a rules ask", () => {
  assert.equal(isWcOddsLineMovementQuestion("How do extra time rules work?"), false);
});

test("synthesizeWcOddsLineMovementLean — shortens on scoreless", () => {
  const lean = synthesizeWcOddsLineMovementLean(
    "It's Germany at -669. Does that go to like -575 if it's scoreless early on?",
  );
  assert.match(lean, /shorten/i);
  assert.match(lean, /-669/);
  assert.doesNotMatch(lean, /no actionable line/i);
});

test("repairWcOddsLineMovementGenericPass — replaces cold pass", () => {
  const out = repairWcOddsLineMovementGenericPass(
    {
      lean: "Pass — no actionable line yet; see Watch For before locking a bet.",
      call: "Pass — no actionable line yet",
    },
    "Will Germany odds go up or down if it's 5 mins in and scoreless?",
  );
  assert.doesNotMatch(String(out.lean), /no actionable line yet/i);
  assert.match(String(out.lean), /shorten|0-0|early/i);
});

test("repairWcOddsLineMovementGenericPass — replaces matchup pass rewrite", () => {
  const out = repairWcOddsLineMovementGenericPass(
    {
      lean: "Pass on ML — lean both teams to advance in group stage.",
      call: "Pass on ML",
    },
    "It's Germany at -669. Does that go to like -575 if it's scoreless early on?",
  );
  assert.match(String(out.lean), /-669|shorten/i);
  assert.doesNotMatch(String(out.lean), /^pass on ml/i);
});
