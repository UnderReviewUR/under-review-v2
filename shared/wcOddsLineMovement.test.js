import assert from "node:assert/strict";
import test from "node:test";
import {
  buildWcLiveEntryPlanningPrebuiltStructured,
  detectWcLineMovementCheckpointScriptCollapse,
  detectWcLineMovementMarketConflation,
  hasExplicitCheckpointScriptSeparation,
  estimateFavoriteDriftOutAmerican,
  isWcLineMovementTalkEligible,
  isWcLiveEntryPlanningQuestion,
  isWcLineMovementWrongDirectionProse,
  isWcOddsLineMovementQuestion,
  repairWcOddsLineMovementGenericPass,
  repairWcOddsLineMovementWrongDirection,
  applyWcForceLineMovementStructuredGuard,
  repairWcTalkLineMovementProse,
  runWcLineMovementOutputQA,
  shouldForceWcLineMovementStructuredCard,
  synthesizeWcOddsLineMovementLean,
  synthesizeWcLiveEntryPlanningLean,
  resolveWcLineMovementMarketKind,
} from "./wcOddsLineMovement.js";
import { WC_CHECKPOINT_MARKET } from "./wcLiveCheckpointLookup.js";

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

test("applyWcForceLineMovementStructuredGuard — overwrites Sonnet call/whyNow", () => {
  const q =
    "France moneyline is -525 and Over 1.5 is -525. I might wait to see if it's 0-0 about 30 minutes in and then evaluate the lines";
  const sonnetCard = {
    fixtureHome: "PAR",
    fixtureAway: "FRA",
    lean:
      "Smart wait from -525 — CHECKPOINT at 0-0 ~30': France 90-min ML usually drifts OUT toward ~-378; Over 1.5 drift OUT at that snapshot too (~-410).",
    call: "France (Favorite) vs Norway (Contender) in Group I — France's ML at -525 is fair for a group opener.",
    whyNow:
      "France (Favorite) vs Norway (Contender) in Group I — France's ML at -525 is fair for a group opener; the 0-0 checkpoint at 30' is your real entry point.",
  };
  const out = applyWcForceLineMovementStructuredGuard(sonnetCard, q, {
    home: "PAR",
    away: "FRA",
  });
  assert.match(String(out.call), /CHECKPOINT|Smart wait/i);
  assert.match(String(out.whyNow), /France/i);
  assert.doesNotMatch(String(out.call), /Norway/i);
  assert.doesNotMatch(String(out.whyNow), /Norway/i);
  assert.match(String(out.lean), /drift/i);
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

test("shouldForceWcLineMovementStructuredCard — cited price + 0-0 forces Take", () => {
  const q = "France -525 moneyline — if 0-0 at 30 does that drift out?";
  assert.equal(shouldForceWcLineMovementStructuredCard(q), true);
});

test("isWcLineMovementTalkEligible — casual movement without cited hypo stays Talk", () => {
  const q = "Will Germany odds go up or down if it's 5 mins in and scoreless?";
  assert.equal(isWcOddsLineMovementQuestion(q), true);
  assert.equal(shouldForceWcLineMovementStructuredCard(q), false);
  assert.equal(isWcLineMovementTalkEligible(q), true);
});

test("synthesizeWcOddsLineMovementLean — to-advance at 0-0 is not ML drift", () => {
  const lean = synthesizeWcOddsLineMovementLean(
    "If it's 0-0 at 30, does France -650 to advance shorten or drift?",
  );
  assert.match(lean, /shorten|hold/i);
  assert.doesNotMatch(lean, /drift out.*90-min/i);
});

test("detectWcLineMovementCheckpointScriptCollapse — desperate at 30 merged", () => {
  const bad =
    "At 0-0 after 30, Over 1.5 will shorten to -600+ because France gets desperate for goals.";
  assert.equal(detectWcLineMovementCheckpointScriptCollapse(bad, "0-0 at 30"), true);
});

test("detectWcLineMovementCheckpointScriptCollapse — skips explicit separation disclaimer", () => {
  const fixed =
    "CHECKPOINT at 0-0 ~30': France ML drifts OUT; Over 1.5 drifts OUT. Draw/Under shorten. SCRIPT (55-75' if they press) is a later tick — not the instant checkpoint.";
  assert.equal(hasExplicitCheckpointScriptSeparation(fixed), true);
  assert.equal(detectWcLineMovementCheckpointScriptCollapse(fixed, "0-0 at 30"), false);
});

test("detectWcLineMovementMarketConflation — drifts out on to-advance question", () => {
  const bad =
    "France to advance drifts out to -450 at 0-0 ~30 just like the 90-minute moneyline.";
  assert.equal(
    detectWcLineMovementMarketConflation(
      bad,
      "If it's 0-0 at 30, does France -650 to advance shorten or drift?",
    ),
    true,
  );
});

test("repairWcTalkLineMovementProse — FRA thread repair passes QA", () => {
  const bad =
    "At 0-0 after 30, FRA moneyline will compress tighter (probably -650+) because Paraguay's still in it. Over 1.5 will likely shorten to -600+ at 0-0 after 30 because France gets desperate for goals.";
  const q =
    "money line is -525 on france... over 1.5 is -525. wait for 0-0 about 30 minutes in and evaluate the lines";
  const fixed = repairWcTalkLineMovementProse(bad, q);
  const qa = runWcLineMovementOutputQA(fixed, q);
  assert.equal(qa.passed, true);
});

test("runWcLineMovementOutputQA — flags ML shortens at 0-0", () => {
  const qa = runWcLineMovementOutputQA(
    "At 0-0 after 30, FRA moneyline compresses to -650+.",
    "France -525 moneyline at 0-0 30 minutes",
  );
  assert.equal(qa.passed, false);
  assert.ok(qa.issueCodes.includes("wc_line_movement_wrong_direction"));
});

test("resolveWcLineMovementMarketKind — exported re-export", () => {
  assert.equal(
    resolveWcLineMovementMarketKind("France moneyline at 0-0"),
    WC_CHECKPOINT_MARKET.ML_90MIN,
  );
});
