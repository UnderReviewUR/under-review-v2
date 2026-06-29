/**
 * Totals lean hold on hypothetical flip follow-ups.
 */

import assert from "node:assert/strict";
import test from "node:test";
import { isWcTotalsHoldPriorLeanFollowUp } from "./wcMatchBettingPrompt.js";
import { repairWcTotalsHoldPriorLeanFollowUp } from "./wcTotalsLeanHold.js";
import { buildWcThreadContinuationFallback } from "./wcTurnDelivery.js";

const RSA_CAN_PRIOR = {
  lean: "Lean Over 1.5 goals",
  call: "Over 1.5 goals",
  whyNow: "0-0 live — both sides still need two goals for the Over.",
};

const RSA_CAN_HISTORY = [
  { role: "user", content: "Best live angle on RSA vs CAN right now?" },
  { role: "assistant", structured: RSA_CAN_PRIOR, content: RSA_CAN_PRIOR.lean },
];

test("isWcTotalsHoldPriorLeanFollowUp — sitting deep flip ask holds prior", () => {
  assert.equal(
    isWcTotalsHoldPriorLeanFollowUp("Does Canada sitting deep flip this to Under?"),
    true,
  );
  assert.equal(isWcTotalsHoldPriorLeanFollowUp("Over or under goals?"), false);
  assert.equal(isWcTotalsHoldPriorLeanFollowUp("What's the other side?"), false);
  assert.equal(isWcTotalsHoldPriorLeanFollowUp("why under 2.5 goals?"), true);
});

test("isWcTotalsHoldPriorLeanFollowUp — BRA vs JPN tempted-over follow-up", () => {
  const q =
    "tempted to go over considering brazils ability to score multiple and japan pressured to respond";
  assert.equal(isWcTotalsHoldPriorLeanFollowUp(q), true);
});

test("repairWcTotalsHoldPriorLeanFollowUp — repairs flipped Under card to prior Over", () => {
  const flipped = {
    callType: "matchup",
    call: "Under 1.5 goals",
    lean: "Lean Under 1.5 goals",
    whyNow: "Canada sitting deep — flip to Under.",
  };
  const repaired = repairWcTotalsHoldPriorLeanFollowUp(
    flipped,
    "Does Canada sitting deep flip this to Under?",
    RSA_CAN_HISTORY,
  );
  assert.match(String(repaired.lean), /Over 1\.5/i);
  assert.match(String(repaired.call), /Over 1\.5/i);
  assert.doesNotMatch(String(repaired.lean), /Under 1\.5/i);
});

test("buildWcThreadContinuationFallback — Over lean survives sitting-deep challenge", () => {
  const line = buildWcThreadContinuationFallback(RSA_CAN_PRIOR, {
    question: "Does Canada sitting deep flip this to Under?",
  });
  assert.match(line, /Over 1\.5/i);
  assert.doesNotMatch(line, /Under 1\.5/i);
});
