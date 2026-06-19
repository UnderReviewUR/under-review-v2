import assert from "node:assert/strict";
import test from "node:test";
import { WC_INTENT } from "./wcUrTakeIntent.js";
import { isWcRulesQuestion } from "./wcUrTakeIntent.js";
import {
  buildWcRulesStructuredFromProse,
  formatWcRulesResponseAsProse,
  normalizeWcStructuredForDelivery,
} from "./wcUrTakeStructured.js";

test("isWcRulesQuestion — knockout rules turn", () => {
  assert.equal(
    isWcRulesQuestion("What are the knockout rules for extra time and penalties?"),
    true,
  );
});

test("buildWcRulesStructuredFromProse — splits headline and body", () => {
  const headline = "Knockout matches go to extra time when tied after 90 minutes.";
  const body = "If still level, a penalty shootout decides the winner.";
  const long = `${headline} ${body}`;
  const structured = buildWcRulesStructuredFromProse(long, null, long, []);
  assert.equal(structured.callType, "rules");
  assert.match(structured.lean, /extra time/i);
  assert.match(structured.whyNow, /penalty shootout/i);
});

test("formatWcRulesResponseAsProse — no THE PLAY prefix", () => {
  const prose = formatWcRulesResponseAsProse({
    whyNow: "Extra time then penalties.",
    edge: "Factual tournament rules — not a betting pick.",
  });
  assert.doesNotMatch(prose, /THE PLAY/i);
  assert.match(prose, /Extra time/i);
});

test("normalizeWcStructuredForDelivery — preserves group_slate prebuilt", () => {
  const seed = {
    callType: "group_slate",
    groupLetter: "K",
    lean: "Lean: Colombia to advance in Group K.",
    call: "Colombia in Group K — best group-stage value (to advance)",
    line: "Colombia needs a top-two finish in Group K.",
    whyNow: "Group K is four teams…",
    edge: "Watch the Portugal vs Colombia opener.",
  };
  const out = normalizeWcStructuredForDelivery(
    seed,
    WC_INTENT.STRUCTURAL,
    "What's the best group-stage value bet right now?",
  );
  assert.equal(out.callType, "group_slate");
  assert.match(out.lean, /Colombia/i);
});

test("normalizeWcStructuredForDelivery repairs missing numeric why", () => {
  const out = normalizeWcStructuredForDelivery(
    {
      callType: "player_prop",
      lean: "Lean over 3 at -135",
      call: "Son shots ladder",
      whyNow: "Son is the focal point when Korea pushes wide.",
      deep: "Over 3 · -135 · worth paying ✓",
      edge: "Watch Korea's shape when they chase.",
    },
    WC_INTENT.PLAYER_PROP,
    "Son over 2.5 shots",
  );
  assert.match(String(out.whyNow), /Over 3 at -135/);
});

test("normalizeWcStructuredForDelivery preserves named-leg whyNow", () => {
  const out = normalizeWcStructuredForDelivery(
    {
      callType: "player_market_odds",
      wcNamedPlayerPropsCard: true,
      call: "2 of 2 playable",
      lean: "1. Jimenez over 3 at +360 — playable\n2. Quinones over 3 at +370 — playable",
      whyNow: "All 2 names have posted lines in MATCH PLAYER PROPS.",
      edge: "Best combo value: Jimenez · Quinones",
    },
    WC_INTENT.PLAYER_PROP,
    "Jimenez and Quinones each going over 2.5 shots attempted?",
  );
  assert.match(String(out.whyNow), /All 2 names have posted lines/i);
  assert.doesNotMatch(String(out.whyNow), /nearest posted line to your ask/i);
});
