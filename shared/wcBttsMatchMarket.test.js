import assert from "node:assert/strict";
import test from "node:test";
import { isWcBttsQuestion, isWcMatchupAltMarketFollowUp } from "./wcMatchBettingPrompt.js";
import { classifyWcQuestionIntent, WC_INTENT } from "./wcUrTakeIntent.js";
import { resolveWcTurnIntent } from "./wcTurnIntent.js";
import { resolveWcTurnPlan } from "./wcTurnPlanner.js";
import {
  extractWcNamedPlayerFromQuestion,
  isWcFixtureScopedPlayerMarketQuestion,
  isWcNamedPlayerPropQuestion,
  buildWcPlayerPropPassHeadline,
} from "./wcUrTakePlayerMarket.js";
import { pickWcFixtureBttsLean } from "./wcFixtureMatchupPrebuilt.js";

const prior = {
  callType: "matchup",
  fixtureHome: "EGY",
  fixtureAway: "AUS",
  lean: "Lean Over 1.5 goals",
  call: "Lean Over 1.5 goals",
};
const history = [{ role: "assistant", structured: prior }];

test("isWcBttsQuestion detects common BTTS phrasings", () => {
  assert.equal(isWcBttsQuestion("both teams to score?"), true);
  assert.equal(isWcBttsQuestion("btts?"), true);
  assert.equal(isWcBttsQuestion("what is the chances both teams score?"), true);
  assert.equal(isWcBttsQuestion("both teams to advance"), false);
});

test("BTTS follow-up routes to matchup alt — not player props", () => {
  const q = "both teams to score?";
  assert.equal(extractWcNamedPlayerFromQuestion(q), null);
  assert.equal(isWcFixtureScopedPlayerMarketQuestion(q), false);
  assert.equal(isWcNamedPlayerPropQuestion(q), false);
  assert.equal(classifyWcQuestionIntent(q, history), WC_INTENT.MATCHUP);
  assert.equal(resolveWcTurnIntent(q, history, true, prior), WC_INTENT.MATCHUP);
  assert.equal(isWcMatchupAltMarketFollowUp(q), true);

  const plan = resolveWcTurnPlan({
    question: q,
    history,
    isConversationFollowUp: true,
    matches: [{ id: "1", homeTeam: "EGY", awayTeam: "AUS", status: "NS" }],
  });
  assert.equal(plan.lane, "matchup_alt_followup");
  assert.equal(plan.intent, WC_INTENT.MATCHUP);
  assert.notEqual(buildWcPlayerPropPassHeadline(q), plan.reason);
});

test("pickWcFixtureBttsLean cites posted BTTS prices", () => {
  const out = pickWcFixtureBttsLean({
    matchOdds: {
      btts: { yes: "-110", no: "+105" },
    },
    passOnMlPrefix: false,
  });
  assert.match(out.lean, /BTTS Yes -110/i);
});
