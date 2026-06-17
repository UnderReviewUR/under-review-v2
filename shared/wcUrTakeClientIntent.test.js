import test from "node:test";
import assert from "node:assert/strict";
import { WC_INTENT } from "./wcUrTakeIntent.js";
import {
  isWcStructuredPlayerMarketCard,
  resolveWcIntentFromMessage,
} from "./wcUrTakeVerdict.js";

const SCORER_PASS_Q =
  "Who's most likely to score from each team? And who will lead each team in passes?";

test("resolveWcIntentFromMessage — prefers API PLAYER_PROP over matchup-shaped lean", () => {
  const intent = resolveWcIntentFromMessage(
    {
      wcIntent: WC_INTENT.PLAYER_PROP,
      structured: { callType: "matchup", lean: "Lean Under 2.5 goals" },
    },
    SCORER_PASS_Q,
  );
  assert.equal(intent, WC_INTENT.PLAYER_PROP);
});

test("resolveWcIntentFromMessage — fixture-scoped scorer/pass follow-up", () => {
  assert.equal(resolveWcIntentFromMessage(null, SCORER_PASS_Q), WC_INTENT.PLAYER_PROP);
});

test("resolveWcIntentFromMessage — contextual recap does not steal intent from latest turn", () => {
  const contextual = `User: Sweden vs Tunisia — who wins?
User: Under 2.5 goals?
↳ follow-up: ${SCORER_PASS_Q}`;
  assert.equal(resolveWcIntentFromMessage(null, contextual), WC_INTENT.PLAYER_PROP);
});

test("isWcStructuredPlayerMarketCard — numbered legs and player_market callType", () => {
  assert.equal(
    isWcStructuredPlayerMarketCard({
      callType: "player_market_verified",
      lean: "1. Isak anytime scorer +180",
    }),
    true,
  );
  assert.equal(
    isWcStructuredPlayerMarketCard({
      callType: "matchup",
      lean: "Lean Under 2.5 goals",
    }),
    false,
  );
});
