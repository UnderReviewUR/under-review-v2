import assert from "node:assert/strict";
import test from "node:test";
import {
  buildWcLiveEntryPlanningPrebuiltStructured,
  estimateFavoriteDriftOutAmerican,
  isWcLiveEntryPlanningQuestion,
  isWcLineMovementWrongDirectionProse,
  isWcOddsLineMovementQuestion,
  repairWcOddsLineMovementGenericPass,
  repairWcOddsLineMovementWrongDirection,
  repairWcTalkLineMovementProse,
  synthesizeWcOddsLineMovementLean,
  synthesizeWcLiveEntryPlanningLean,
} from "./wcOddsLineMovement.js";

test("isWcOddsLineMovementQuestion — Germany scoreless at 5 min", () => {
  const q = "Will Germany odds go up or down if it's 5 mins in and scoreless?";
  assert.equal(isWcOddsLineMovementQuestion(q), true);
});

test("isWcOddsLineMovementQuestion — cited -669 target -575", () => {
  const q = "It's Germany at -669. Does that go to like -575 if it's scoreless early on?";
  assert.equal(isWcOddsLineMovementQuestion(q), true);
});

test("isWcOddsLineMovementQuestion — FRA wait for 0-0 at 30", () => {
  const q =
    "money line is -525 on france... over 1.5 is -525 as well. i might wait to see if its 0-0 about 30 minutes in and then evaluate the lines";
  assert.equal(isWcOddsLineMovementQuestion(q), true);
  assert.equal(isWcLiveEntryPlanningQuestion(q), true);
});

test("isWcOddsLineMovementQuestion — user price correction on total", () => {
  assert.equal(isWcOddsLineMovementQuestion("Under 2.5 goals is at -133"), true);
});

test("isWcOddsLineMovementQuestion — not a rules ask", () => {
  assert.equal(isWcOddsLineMovementQuestion("How do extra time rules work?"), false);
});

test("estimateFavoriteDriftOutAmerican — -525 drifts out", () => {
  assert.equal(estimateFavoriteDriftOutAmerican(-525), "-378");
});

test("synthesizeWcOddsLineMovementLean — scoreless favorite drifts out", () => {
  const lean = synthesizeWcOddsLineMovementLean(
    "It's Germany at -669. Does that go to like -575 if it's scoreless early on?",
  );
  assert.match(lean, /drift/i);
  assert.match(lean, /-669/);
  assert.doesNotMatch(lean, /no actionable line/i);
  assert.doesNotMatch(lean, /(?:toward|to|at|compress(?:es)?\s+to)\s*-650/i);
});

test("synthesizeWcLiveEntryPlanningLean — FRA thread turn", () => {
  const lean = synthesizeWcLiveEntryPlanningLean(
    "money line is -525 on france... over 1.5 is -525. wait to see if 0-0 about 30 minutes then evaluate lines",
  );
  assert.match(lean, /drift/i);
  assert.match(lean, /-525/);
  assert.doesNotMatch(lean, /-650/i);
  assert.doesNotMatch(lean, /shorten.*-600/i);
});

test("isWcLineMovementWrongDirectionProse — catches -650+ at 0-0", () => {
  const bad =
    "At 0-0 after 30, FRA moneyline will compress tighter (probably -650+) because Paraguay's still in it.";
  assert.equal(isWcLineMovementWrongDirectionProse(bad, bad), true);
});

test("repairWcTalkLineMovementProse — rewrites wrong checkpoint", () => {
  const bad =
    "Over 1.5 will likely shorten to -600+ at 0-0 after 30 because France gets desperate.";
  const q = "wait for 0-0 at 30 and evaluate France -525 moneyline and over 1.5";
  const fixed = repairWcTalkLineMovementProse(bad, q);
  assert.match(fixed, /drift/i);
  assert.doesNotMatch(fixed, /shorten to -600/i);
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
  assert.match(String(out.lean), /drift|0-0|early/i);
});

test("repairWcOddsLineMovementWrongDirection — fixes juiced ML copy", () => {
  const out = repairWcOddsLineMovementWrongDirection(
    {
      lean: "At 0-0 after 30, FRA moneyline compresses to -650+.",
      call: "FRA ML -650",
    },
    "wait for 0-0 at 30 and evaluate France -525 moneyline",
  );
  assert.match(String(out.lean), /drift/i);
  assert.doesNotMatch(String(out.lean), /-650/i);
});

test("buildWcLiveEntryPlanningPrebuiltStructured — FRA fixture", () => {
  const q =
    "money line is -525 on france... over 1.5 is -525. i might wait to see if 0-0 about 30 minutes in and evaluate the lines";
  const card = buildWcLiveEntryPlanningPrebuiltStructured({
    home: "PAR",
    away: "FRA",
    question: q,
    match: {
      odds: {
        home: { moneyline: "-525" },
        away: { moneyline: "+1800" },
        draw: { moneyline: "+650" },
      },
    },
  });
  assert.ok(card);
  assert.match(String(card.lean), /France/i);
  assert.match(String(card.lean), /drift/i);
  assert.match(String(card.whyNow), /France/i);
  assert.doesNotMatch(String(card.whyNow), /Paraguay ML/i);
});
