import assert from "node:assert/strict";
import test from "node:test";
import {
  classifyWcPlayerMarketIntent,
  classifyWcQuestionIntent,
  WC_INTENT,
} from "./wcUrTakeIntent.js";
import {
  buildWcPlayerMarketEmptyStructured,
} from "./wcPlayerMarketResolve.js";
import {
  detectTeamAnswerToPlayerQuestion,
  questionAsksForWcPlayerMarket,
  resolveWcPlayerMarketResponse,
  shouldForceWcPlayerMarketPass,
} from "./wcUrTakePlayerMarket.js";
import { mockWcContextWithPlayerMarkets } from "../api/wcPlayerMarkets.fixture.js";
import { runWcUrTakeQA, wcQaRequiresRegeneration } from "../api/_wcUrTakeQA.js";

test("classifyWcQuestionIntent — top scorer without player word", () => {
  assert.equal(classifyWcQuestionIntent("who will score the most goals?"), WC_INTENT.TOP_SCORER);
});

test("classifyWcQuestionIntent — explicit player", () => {
  assert.equal(
    classifyWcQuestionIntent("which player will score the most goals?"),
    WC_INTENT.PLAYER_PROP,
  );
});

test("classifyWcQuestionIntent — team goals stays structural", () => {
  assert.equal(
    classifyWcQuestionIntent("which team will score the most goals in the tournament?"),
    WC_INTENT.STRUCTURAL,
  );
});

test("questionAsksForWcPlayerMarket — golden boot", () => {
  assert.equal(questionAsksForWcPlayerMarket("Best golden boot value?"), true);
  assert.equal(classifyWcPlayerMarketIntent("Best golden boot value?"), WC_INTENT.GOLDEN_BOOT);
});

test("resolveWcPlayerMarketResponse — with KV does not force pass", () => {
  const ctx = mockWcContextWithPlayerMarkets({ wcIntent: WC_INTENT.PLAYER_PROP });
  const resolved = resolveWcPlayerMarketResponse(
    "which player will score the most goals?",
    WC_INTENT.PLAYER_PROP,
    ctx,
  );
  assert.equal(resolved.forcePass, false);
  assert.equal(resolved.playerMarketTier, "market_only");
  assert.ok(resolved.promptAppendix?.includes("GOLDEN BOOT"));
});

test("resolveWcPlayerMarketResponse — empty KV forces thin fallback", () => {
  const resolved = resolveWcPlayerMarketResponse(
    "which player will score the most goals?",
    WC_INTENT.PLAYER_PROP,
    { dataConfidence: "pre_match_estimate", matchDetails: [], playerMarketKv: null },
  );
  assert.equal(resolved.forcePass, false);
  assert.ok(resolved.promptAppendix);
});

test("detectTeamAnswerToPlayerQuestion — France headline fails", () => {
  assert.equal(
    detectTeamAnswerToPlayerQuestion(
      "France will score the most goals in the tournament.",
      "Mbappé leads the attack.",
      "which player will score the most goals?",
    ),
    true,
  );
});

test("detectTeamAnswerToPlayerQuestion — thin structured passes QA detector", () => {
  const s = buildWcPlayerMarketEmptyStructured(
    "who will score the most goals?",
    WC_INTENT.TOP_SCORER,
  );
  assert.equal(
    detectTeamAnswerToPlayerQuestion(s.lean, s.whyNow, "who will score the most goals?"),
    false,
  );
});

test("runWcUrTakeQA — France-as-player answer fails with regeneration", () => {
  const qa = runWcUrTakeQA({
    responseText: "France will score the most goals in the tournament.",
    structured: {
      lean: "Lean: France will score the most goals in the tournament.",
      whyNow: "France has attacking depth.",
    },
    question: "which player will score the most goals?",
    wcIntent: WC_INTENT.PLAYER_PROP,
    requiredEntities: [],
    forbiddenEntities: [],
    playerMarketKv: mockWcContextWithPlayerMarkets().playerMarketKv,
  });
  assert.equal(qa.passed, false);
  assert.equal(qa.qaPlayerMatch, "fail");
  assert.ok(qa.issueCodes.includes("wc_player_question_team_lead"));
  assert.equal(wcQaRequiresRegeneration(qa), true);
});

test("shouldForceWcPlayerMarketPass — false when KV populated", () => {
  assert.equal(
    shouldForceWcPlayerMarketPass({
      wcContext: mockWcContextWithPlayerMarkets(),
    }),
    false,
  );
});
