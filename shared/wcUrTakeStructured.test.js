import assert from "node:assert/strict";
import test from "node:test";
import { isWcRulesQuestion } from "./wcUrTakeIntent.js";
import {
  buildWcRulesStructuredFromProse,
  formatWcRulesResponseAsProse,
} from "./wcUrTakeStructured.js";

test("isWcRulesQuestion — knockout rules turn", () => {
  assert.equal(
    isWcRulesQuestion("What are the knockout rules for extra time and penalties?"),
    true,
  );
});

test("buildWcRulesStructuredFromProse — preserves full whyNow", () => {
  const long =
    "In 2026 World Cup knockout matches, if the score is level after 90 minutes of regulation, the match proceeds to extra time: two 15-minute periods played consecutively.";
  const structured = buildWcRulesStructuredFromProse(long, null, long, []);
  assert.equal(structured.callType, "rules");
  assert.equal(structured.whyNow, long);
  assert.ok(structured.lean.length > 120);
});

test("formatWcRulesResponseAsProse — no THE PLAY prefix", () => {
  const prose = formatWcRulesResponseAsProse({
    whyNow: "Extra time then penalties.",
    edge: "Factual tournament rules — not a betting pick.",
  });
  assert.doesNotMatch(prose, /THE PLAY/i);
  assert.match(prose, /Extra time/i);
});
