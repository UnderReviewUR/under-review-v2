import test from "node:test";
import assert from "node:assert/strict";
import {
  maskStructuredForFreeTier,
  stripThePlayFromProse,
} from "./freeTierTakeShape.js";

test("stripThePlayFromProse removes THE PLAY block", () => {
  const src = `Lean: Under on the total.

THE PLAY: Under 47.5 · Medium confidence · pace mismatch

CONFIDENCE
Medium

MATCH READ
Fast pace both sides.`;
  const out = stripThePlayFromProse(src);
  assert.match(out, /Lean: Under/);
  assert.doesNotMatch(out, /THE PLAY/i);
  assert.match(out, /MATCH READ/);
});

test("maskStructuredForFreeTier clears call and parlay legs", () => {
  const masked = maskStructuredForFreeTier({
    sport: "nfl",
    lean: "",
    call: "Drake Maye over 1.5 passing TDs at -110",
    whyNow: "Seattle allows TDs through the air.",
    edge: "Volume spike in red zone.",
    confidence: "Medium",
    parlayLegs: [{ play: "Leg A", odds: "+120" }],
  });
  assert.equal(masked.call, "");
  assert.equal(masked.parlayLegs.length, 0);
  assert.match(String(masked.lean), /^Lean:/);
  assert.doesNotMatch(String(masked.lean), /Drake Maye over 1.5/i);
});

test("maskStructuredForFreeTier preserves rules cards", () => {
  const rules = { callType: "rules", call: "Knockout rules reference", lean: "Lean: Reference." };
  assert.deepEqual(maskStructuredForFreeTier(rules), rules);
});
