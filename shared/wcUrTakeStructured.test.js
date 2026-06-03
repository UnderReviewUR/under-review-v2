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
