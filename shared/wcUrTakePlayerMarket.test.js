import assert from "node:assert/strict";
import test from "node:test";
import {
  classifyWcPlayerMarketIntent,
  classifyWcQuestionIntent,
  WC_INTENT,
} from "./wcUrTakeIntent.js";
import {
  buildWcPlayerMarketPassStructured,
  detectTeamAnswerToPlayerQuestion,
  questionAsksForWcPlayerMarket,
  resolveWcPlayerMarketResponse,
  shouldForceWcPlayerMarketPass,
} from "./wcUrTakePlayerMarket.js";
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

test("resolveWcPlayerMarketResponse — pre-match forces pass", () => {
  const resolved = resolveWcPlayerMarketResponse(
    "which player will score the most goals?",
    WC_INTENT.PLAYER_PROP,
    { dataConfidence: "pre_match_estimate", matchDetails: [] },
  );
  assert.equal(resolved.forcePass, true);
  assert.match(resolved.responseText, /confirmed starting XIs/i);
  assert.match(resolved.structured?.lean || "", /Player-specific markets/i);
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

test("detectTeamAnswerToPlayerQuestion — pass card passes", () => {
  const s = buildWcPlayerMarketPassStructured(
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
  });
  assert.equal(qa.passed, false);
  assert.equal(qa.qaPlayerMatch, "fail");
  assert.ok(qa.issueCodes.includes("wc_player_question_team_lead"));
  assert.equal(wcQaRequiresRegeneration(qa), true);
});

test("shouldForceWcPlayerMarketPass — confirmed without player rows still passes", () => {
  assert.equal(
    shouldForceWcPlayerMarketPass({
      wcContext: { dataConfidence: "confirmed", matchDetails: [{ lineupConfirmed: true, players: {} }] },
    }),
    true,
  );
});
