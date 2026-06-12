import assert from "node:assert/strict";
import test from "node:test";

import {
  buildWcScriptPriceUserAppendix,
  buildWcTeamMarketOpenerPromptBlock,
  detectWcSgpComboIntent,
  isWcTeamMarketOpenerQuestion,
  shouldRunNbaFirstSessionGuarantee,
} from "./wcUrTakePhilosophy.js";
import { WC_INTENT } from "./wcUrTakeIntent.js";

const WC_PROMO_MS = Date.UTC(2026, 5, 12, 16, 0, 0); // Jun 12 2026 ET-ish
const OFF_SEASON_MS = Date.UTC(2026, 0, 15, 16, 0, 0); // Jan 15 2026

test("shouldRunNbaFirstSessionGuarantee — off during WC home promo for generic home openers", () => {
  assert.equal(
    shouldRunNbaFirstSessionGuarantee({
      firstSessionNoHistory: true,
      hasImage: false,
      sportHint: "generic",
      uiSportHint: null,
      question: "What's the sharpest angle tonight?",
      wcEventId: null,
      nowMs: WC_PROMO_MS,
    }),
    false,
  );
});

test("shouldRunNbaFirstSessionGuarantee — still allowed off-season", () => {
  assert.equal(
    shouldRunNbaFirstSessionGuarantee({
      firstSessionNoHistory: true,
      hasImage: false,
      sportHint: "generic",
      uiSportHint: null,
      question: "What's the sharpest angle tonight?",
      wcEventId: null,
      nowMs: OFF_SEASON_MS,
    }),
    true,
  );
});

test("shouldRunNbaFirstSessionGuarantee — WC question never gets NBA guarantee", () => {
  assert.equal(
    shouldRunNbaFirstSessionGuarantee({
      firstSessionNoHistory: true,
      hasImage: false,
      sportHint: "generic",
      uiSportHint: null,
      question: "Jimenez 2+ shots?",
      wcEventId: null,
      nowMs: OFF_SEASON_MS,
    }),
    false,
  );
});

test("detectWcSgpComboIntent — player + team leg without parlay keyword", () => {
  assert.equal(
    detectWcSgpComboIntent("Jimenez 2+ shots and Mexico team to score first goal"),
    true,
  );
  assert.equal(detectWcSgpComboIntent("Jimenez 2+ shots?"), false);
  assert.equal(detectWcSgpComboIntent("son over 2.5 shots?"), false);
  assert.equal(detectWcSgpComboIntent("Jimenez to score or assist?"), false);
  assert.equal(detectWcSgpComboIntent("Son over 2.5 shots and Mexico ML"), true);
  assert.equal(detectWcSgpComboIntent("Mexico moneyline tonight"), false);
});

test("buildWcScriptPriceUserAppendix — skips rules intent", () => {
  assert.equal(
    buildWcScriptPriceUserAppendix({ wcIntent: WC_INTENT.RULES, question: "extra time rules?" }),
    "",
  );
});

test("buildWcScriptPriceUserAppendix — SGP pass still demands correlation headline", () => {
  const block = buildWcScriptPriceUserAppendix({
    wcIntent: WC_INTENT.PLAYER_PROP,
    question: "Jimenez 2+ shots and Mexico team to score first goal",
    phase: "GROUP_STAGE",
    isParlay: true,
    hasMatchPlayerProps: false,
  });
  assert.match(block, /CORRELATION/i);
  assert.match(block, /Missing leg prices/i);
});

test("isWcTeamMarketOpenerQuestion — matchup intent", () => {
  assert.equal(isWcTeamMarketOpenerQuestion("Mexico vs South Africa who wins?", WC_INTENT.MATCHUP), true);
});

test("buildWcTeamMarketOpenerPromptBlock — opener framing for matchup", () => {
  const block = buildWcTeamMarketOpenerPromptBlock({
    question: "Mexico vs South Africa opener — ML or under?",
    wcIntent: WC_INTENT.MATCHUP,
  });
  assert.match(block, /TEAM MARKET OPENER/i);
  assert.match(block, /ML -200 vs Under 2\.5/i);
});

test("buildWcScriptPriceUserAppendix — team opener lines on matchup", () => {
  const block = buildWcScriptPriceUserAppendix({
    wcIntent: WC_INTENT.MATCHUP,
    question: "Korea vs Czechia who wins?",
    phase: "GROUP_STAGE",
  });
  assert.match(block, /TEAM MARKET/i);
  assert.match(block, /Opener/i);
});

test("buildWcScriptPriceUserAppendix — includes script and cleaner leg for player props", () => {
  const block = buildWcScriptPriceUserAppendix({
    wcIntent: WC_INTENT.PLAYER_PROP,
    question: "Jimenez 2+ shots?",
    phase: "GROUP_STAGE",
    hasMatchPlayerProps: true,
  });
  assert.match(block, /SCOREBOARD SCRIPT/i);
  assert.match(block, /Cleaner leg/i);
  assert.match(block, /MATCH PLAYER PROPS/i);
});
