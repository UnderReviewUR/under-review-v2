import assert from "node:assert/strict";
import test from "node:test";
import {
  deriveWcMatchProbabilityLean,
  extractWcPlayerParlayRankCount,
  isWcLiveMatchProbabilityQuestion,
  isWcMatchProbabilityLeanDrift,
  isWcMatchProbabilityQuestion,
  isWcPlayerParlaySlateQuestion,
} from "./wcMatchProbabilityQuestion.js";
import { classifyWcQuestionIntent, WC_INTENT } from "./wcUrTakeIntent.js";
import { shouldUseWcFixtureMatchupPrebuilt } from "./wcFixtureMatchupPrebuilt.js";
import { detectParlayIntent, extractParlayLegCount } from "./detectParlayIntent.js";
import { normalizeWcStructuredForDelivery } from "./wcUrTakeStructured.js";
import { isWcValidPlayLine } from "./wcPlayLineQA.js";
import { scoreWcCardContractVoice } from "./wcCardContractVoice.js";

test("detectParlayIntent — plural parlays", () => {
  assert.equal(detectParlayIntent("what are the best player parlays today"), true);
  assert.equal(extractParlayLegCount("rank the best 5 player parlays today"), 5);
});

test("isWcPlayerParlaySlateQuestion — slate and trap prompts", () => {
  assert.ok(isWcPlayerParlaySlateQuestion("create the best player parlays on todays slate"));
  assert.ok(isWcPlayerParlaySlateQuestion("what are the player parlay traps today"));
  assert.ok(isWcPlayerParlaySlateQuestion("what are the player parlays no one is talking about"));
  assert.equal(extractWcPlayerParlayRankCount("rank the best 5 player parlays today"), 5);
});

test("classifyWcQuestionIntent — player parlay slate is PLAYER_PROP", () => {
  assert.equal(
    classifyWcQuestionIntent("rank the best 5 player parlays today"),
    WC_INTENT.PARLAY,
  );
});

test("isWcMatchProbabilityQuestion — team goal threshold vs fixture", () => {
  const q = "what are the chances ecuador ends up scoring more than 2 goals vs ivory coast";
  assert.ok(isWcMatchProbabilityQuestion(q));
  assert.equal(classifyWcQuestionIntent(q), WC_INTENT.MATCHUP);
  assert.equal(shouldUseWcFixtureMatchupPrebuilt(q, WC_INTENT.MATCHUP, { hasKvFixture: true }), false);
});

test("isWcLiveMatchProbabilityQuestion — minute and score state", () => {
  assert.ok(
    isWcLiveMatchProbabilityQuestion(
      "its 1-0 in the 65th minute, whats the chances this ends in a draw",
    ),
  );
  assert.ok(
    isWcLiveMatchProbabilityQuestion(
      "theres 10 mins left, whats the chances ecuador gets a winner",
    ),
  );
  assert.equal(
    classifyWcQuestionIntent("theres 10 mins left, whats the chances ecuador concedes a winner"),
    WC_INTENT.MATCHUP,
  );
});

test("isWcMatchProbabilityQuestion — draw chance follow-ups", () => {
  assert.ok(isWcMatchProbabilityQuestion("% chance it ends in a draw?"));
  assert.ok(isWcMatchProbabilityQuestion("what are the chances this ends in a draw"));
  assert.ok(
    isWcMatchProbabilityQuestion("whos most likely to win or will it end in a draw?"),
  );
  assert.equal(classifyWcQuestionIntent("% chance it ends in a draw?"), WC_INTENT.MATCHUP);
  const liveMatch = { status: "1H", homeScore: 0, awayScore: 0, homeTeam: "GHA", awayTeam: "PAN" };
  assert.ok(
    isWcLiveMatchProbabilityQuestion("% chance it ends in a draw?", {
      isConversationFollowUp: true,
      match: liveMatch,
    }),
  );
});

test("classifyWcQuestionIntent — named player prop beats matchup", () => {
  assert.equal(classifyWcQuestionIntent("best player prop for CIV vs ECU"), WC_INTENT.PLAYER_PROP);
  assert.equal(classifyWcQuestionIntent("Will Jimenez score vs Canada?"), WC_INTENT.PLAYER_PROP);
});

test("deriveWcMatchProbabilityLean — prefers line with draw signal over matchup boilerplate", () => {
  const q = "% chance it ends in a draw?";
  assert.ok(isWcMatchProbabilityLeanDrift("Pass on ML — lean both teams to advance in group stage.", q));
  const lean = deriveWcMatchProbabilityLean({
    question: q,
    call: "Match is final.",
    line: "GHA won 1-0 at 90' — no draw possible now.",
    whyNow: "Match is final. GHA won 1-0 at 90'.",
  });
  assert.match(lean, /no draw possible/i);
  assert.ok(isWcValidPlayLine(lean));
});

test("normalizeWcStructuredForDelivery repairs drifted draw-% lean", () => {
  const q = "% chance it ends in a draw?";
  const out = normalizeWcStructuredForDelivery(
    {
      callType: "matchup",
      call: "Match is final.",
      line: "GHA won 1-0 at 90' — no draw possible now.",
      lean: "Pass on ML — lean both teams to advance in group stage.",
      whyNow: "Match is final. GHA won 1-0 at 90' — no draw possible now.",
      edge: "Watch for lineup news and confirmed paths before locking the bet.",
    },
    WC_INTENT.MATCHUP,
    q,
  );
  assert.doesNotMatch(String(out.lean), /both teams to advance/i);
  assert.match(String(out.lean), /no draw possible/i);
});

test("scoreWcCardContractVoice flags wc_probability_lean_mismatch before repair", () => {
  const q = "% chance it ends in a draw?";
  const bad = scoreWcCardContractVoice(
    {
      call: "Match is final.",
      line: "GHA won 1-0 at 90' — no draw possible now.",
      lean: "Pass on ML — lean both teams to advance in group stage.",
      whyNow: "Match is final.",
      edge: "Watch for lineup news and confirmed paths before locking the bet.",
      callType: "matchup",
    },
    { wcIntent: WC_INTENT.MATCHUP, question: q },
  );
  assert.ok(bad.issues.includes("wc_probability_lean_mismatch"));
});
