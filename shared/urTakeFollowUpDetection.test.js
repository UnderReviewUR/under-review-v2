import assert from "node:assert/strict";
import test from "node:test";
import {
  UR_TAKE_CONTEXTUAL_FOLLOW_UP_MARKER,
  countUrTakeClientRecapUserLines,
  hasUrTakeClientRecapBeforeFollowUp,
  isUrTakeContextualFollowUpQuestion,
  isUrTakeConversationFollowUp,
  resolveUrTakeConversationFollowUp,
} from "./urTakeFollowUpDetection.js";
import { classifyNbaQuestionIntent, NBA_INTENT } from "./nbaUrTakeIntent.js";
import { classifyWcQuestionIntent, WC_INTENT } from "./wcUrTakeIntent.js";
import { extractLatestUserTurnForRouting } from "./urTakeSportRouting.js";
import { urTakeConversationPivotMeta } from "./urTakeConversation.js";

function buildTestContextualQuestion(priorUserTexts, current) {
  const snippets = priorUserTexts.map((t) => `User: ${t}`);
  return `${snippets.join("\n")}${UR_TAKE_CONTEXTUAL_FOLLOW_UP_MARKER}${current}`;
}

test("isUrTakeContextualFollowUpQuestion — requires client User: recap", () => {
  const client = buildTestContextualQuestion(
    ["Best group-stage value bet?"],
    "Which group is the runner-up value?",
  );
  assert.equal(isUrTakeContextualFollowUpQuestion(client), true);
  assert.equal(hasUrTakeClientRecapBeforeFollowUp(client), true);

  const userTyped = "Here is my take.\n\nFollow-up:\nWho wins Group B?";
  assert.equal(isUrTakeContextualFollowUpQuestion(userTyped), false);

  const casual = "I have a follow-up question about USA vs Mexico";
  assert.equal(isUrTakeContextualFollowUpQuestion(casual), false);

  const lowercase = "User: prior\n\nfollow-up:\nnext";
  assert.equal(isUrTakeContextualFollowUpQuestion(lowercase), false);
});

test("resolveUrTakeConversationFollowUp — thin history fallbacks", () => {
  const contextual = buildTestContextualQuestion(
    ["Best group-stage value bet?"],
    "Which group is the runner-up value?",
  );

  assert.deepEqual(resolveUrTakeConversationFollowUp(contextual, []), {
    isFollowUp: true,
    reason: "contextual_recap",
  });

  assert.deepEqual(
    resolveUrTakeConversationFollowUp(contextual, [{ role: "user", content: "Best group-stage value bet?" }]),
    { isFollowUp: true, reason: "contextual_recap" },
  );

  assert.deepEqual(
    resolveUrTakeConversationFollowUp("Brunson over 28.5 points tonight?", [
      { role: "user", content: "Who wins the Finals series?" },
    ]),
    { isFollowUp: true, reason: "thin_history_routing_mismatch" },
  );

  assert.deepEqual(
    resolveUrTakeConversationFollowUp("Who wins Group H?", [
      {
        role: "assistant",
        content: "Group D most mispriced (#1); Group H runner-up",
        structured: { runnerUpGroupLetter: "H" },
      },
    ]),
    { isFollowUp: true, reason: "thin_history_assistant_only" },
  );

  assert.deepEqual(resolveUrTakeConversationFollowUp("Who wins tonight?", []), {
    isFollowUp: false,
    reason: "opening_turn",
  });
});

test("multi-turn A → B → C — NBA intent routing uses latest turn only", () => {
  const qA = "Who wins the Finals series?";
  const qB = "What's the sharpest spread angle tonight?";
  const qC = "Brunson over 28.5 points tonight?";

  const historyAfterB = [
    { role: "user", content: qA },
    { role: "assistant", content: "Lean: Knicks +180", structured: { call: "NYK +180" } },
    { role: "user", content: qB },
    { role: "assistant", content: "Lean: Knicks -2.5", structured: { call: "NYK -2.5" } },
  ];

  const contextualC = buildTestContextualQuestion([qA, qB], qC);

  assert.equal(extractLatestUserTurnForRouting(contextualC), qC);
  assert.equal(classifyNbaQuestionIntent(contextualC, historyAfterB), NBA_INTENT.PROP_PLAYER);
  assert.notEqual(classifyNbaQuestionIntent(contextualC, historyAfterB), NBA_INTENT.SERIES_WINNER);
  assert.notEqual(classifyNbaQuestionIntent(contextualC, historyAfterB), NBA_INTENT.PREGAME_MATCHUP);

  const pivotC = urTakeConversationPivotMeta("nba", contextualC, historyAfterB);
  assert.equal(pivotC.pivoted, true);
  assert.equal(pivotC.priorIntent, NBA_INTENT.PREGAME_MATCHUP);
  assert.equal(pivotC.currentIntent, NBA_INTENT.PROP_PLAYER);

  assert.equal(isUrTakeConversationFollowUp(contextualC, historyAfterB), true);
});

test("multi-turn A → B → C — WC intent routing on third turn", () => {
  const qA = "What's the best group-stage value bet right now — one pick, direct answer?";
  const qB = "Who wins USA vs Mexico?";
  const qC = "Who is mispriced instead of USA?";

  const historyAfterB = [
    { role: "user", content: qA },
    {
      role: "assistant",
      content: "Group D most mispriced (#1); Group K runner-up",
      structured: {
        call: "Group D most mispriced (#1); Group K runner-up",
        runnerUpGroupLetter: "K",
        groupLetter: "D",
      },
    },
    { role: "user", content: qB },
    {
      role: "assistant",
      content: "Lean: USA -120",
      structured: { callType: "matchup", call: "USA -120" },
    },
  ];

  const contextualC = buildTestContextualQuestion([qA, qB], qC);

  assert.equal(extractLatestUserTurnForRouting(contextualC), qC);
  const intentC = classifyWcQuestionIntent(contextualC, historyAfterB);
  assert.notEqual(intentC, WC_INTENT.STRUCTURAL);
  assert.equal(countUrTakeClientRecapUserLines(contextualC), 2);
});
