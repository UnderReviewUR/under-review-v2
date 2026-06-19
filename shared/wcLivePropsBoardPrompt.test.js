import assert from "node:assert/strict";
import test from "node:test";
import {
  buildWcPropsBoardPickRecommendations,
  buildWcPropsBoardTargetLeanPreview,
  buildWcPostedGenericPropsFollowUpPromptBlock,
  formatWcLiveMatchStatePhrase,
  resolvePrimaryPropsMarketFromQuestion,
} from "./wcLivePropsBoardPrompt.js";
import { buildWcGenericPropsFollowUpPromptBlock } from "./wcTurnDelivery.js";
import { resolveWcTurnPlan } from "./wcTurnPlanner.js";

const SCO_MAR_MATCH = {
  id: "1001",
  homeTeam: "SCO",
  awayTeam: "MAR",
  status: "ht",
  homeScore: 0,
  awayScore: 1,
  minute: "45",
};

const SCO_MAR_PROPS = {
  eventId: "1001",
  homeTeam: "SCO",
  awayTeam: "MAR",
  source: "balldontlie",
  lastUpdated: Date.now() - 60_000,
  markets: {
    player_shots_ou: [
      { name: "Scott McTominay", americanOdds: "-317", line: "0.5", side: "over", nationAbbr: "SCO" },
      { name: "Che Adams", americanOdds: "-203", line: "0.5", side: "over", nationAbbr: "SCO" },
      { name: "Ryan Christie", americanOdds: "+108", line: "0.5", side: "over", nationAbbr: "SCO" },
      { name: "Lewis Ferguson", americanOdds: "+194", line: "0.5", side: "over", nationAbbr: "SCO" },
      { name: "Azzedine Ounahi", americanOdds: "-233", line: "0.5", side: "over", nationAbbr: "MAR" },
      { name: "Chadi Riad", americanOdds: "+257", line: "0.5", side: "over", nationAbbr: "MAR" },
      { name: "Andrew Robertson", americanOdds: "+317", line: "0.5", side: "over", nationAbbr: "SCO" },
    ],
    player_sot_ou: [
      { name: "Scott McTominay", americanOdds: "-110", line: "0.5", side: "over", nationAbbr: "SCO" },
    ],
  },
};

test("formatWcLiveMatchStatePhrase — halftime score line", () => {
  const phrase = formatWcLiveMatchStatePhrase(SCO_MAR_MATCH, "SCO", "MAR");
  assert.match(phrase, /Morocco leads 1-0/i);
  assert.match(phrase, /halftime/i);
});

test("resolvePrimaryPropsMarketFromQuestion — 1+ shots market", () => {
  assert.equal(
    resolvePrimaryPropsMarketFromQuestion(
      "Player to Have 1 or More Shots — who should I take?",
      SCO_MAR_PROPS,
    ),
    "player_shots_ou",
  );
});

test("buildWcPropsBoardPickRecommendations — SCO/MAR shots board tiers", () => {
  const picks = buildWcPropsBoardPickRecommendations(SCO_MAR_PROPS, SCO_MAR_MATCH, {
    market: "player_shots_ou",
    homeAbbr: "SCO",
    awayAbbr: "MAR",
  });
  assert.ok(picks.length >= 2);
  assert.match(picks[0].name, /McTominay|Ounahi|Adams/i);
  assert.match(picks[0].odds, /^-/);
  const names = picks.map((p) => p.name);
  assert.ok(names.some((n) => /Christie|Ferguson|Adams|McTominay/i.test(n)));
});

test("buildWcPropsBoardTargetLeanPreview — match-specific lean with live state", () => {
  const lean = buildWcPropsBoardTargetLeanPreview({
    match: SCO_MAR_MATCH,
    propsPayload: SCO_MAR_PROPS,
    priorLean: { lean: "Lean Under 3.5 goals" },
    question: "any player props to consider?",
    homeAbbr: "SCO",
    awayAbbr: "MAR",
  });
  assert.ok(lean);
  assert.match(lean, /Morocco leads 1-0/i);
  assert.match(lean, /McTominay|Ounahi/i);
  assert.match(lean, /Under 3\.5/i);
});

test("buildWcGenericPropsFollowUpPromptBlock — posted lines branch", () => {
  const plan = resolveWcTurnPlan({
    question: "any player props to consider?",
    history: [
      { role: "user", content: "Best live angle on SCO vs MAR right now?" },
      {
        role: "assistant",
        content: "Lean Under 3.5 goals",
        wcMatchTeams: { home: "SCO", away: "MAR" },
      },
    ],
    matches: [SCO_MAR_MATCH],
    isConversationFollowUp: true,
    incomingWcEventId: "1001",
    hasKvFixture: true,
  });
  const block = buildWcGenericPropsFollowUpPromptBlock(
    plan,
    { homeName: "Scotland", awayName: "Morocco" },
    { match: SCO_MAR_MATCH, propsPayload: SCO_MAR_PROPS, question: "any player props to consider?" },
  );
  assert.match(block, /LINES POSTED/i);
  assert.match(block, /Morocco leads 1-0/i);
  assert.match(block, /McTominay|Scott McTominay/i);
  assert.match(block, /Target lean line/i);
});
