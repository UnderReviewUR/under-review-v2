import assert from "node:assert/strict";
import test from "node:test";
import { autocorrectUrTakeQuestion } from "./urTakeQuestionAutocorrect.js";
import { composeRegisteredUrTakeSystemPrompt } from "../api/_urTakeSystemPromptRegistry.js";
import { questionMentionsWorldCup } from "./wcUrTakeKeywords.js";

test("autocorrectUrTakeQuestion — common sport typos", () => {
  const r = autocorrectUrTakeQuestion("wordl cup golascorer — who wins?");
  assert.match(r.text, /World Cup/i);
  assert.match(r.text, /goalscorer/i);
  assert.ok(r.corrections.length >= 2);
});

test("autocorrectUrTakeQuestion — worldcup token", () => {
  const r = autocorrectUrTakeQuestion("worldcup dark hors breakout playr");
  assert.match(r.text, /World Cup/i);
  assert.match(r.text, /dark horse/i);
  assert.match(r.text, /breakout player/i);
});

test("questionMentionsWorldCup — after autocorrect", () => {
  const { text } = autocorrectUrTakeQuestion("wrld cup picks");
  assert.ok(questionMentionsWorldCup(text));
});

test("composeRegisteredUrTakeSystemPrompt — includes no dead ends block", () => {
  const prompt = composeRegisteredUrTakeSystemPrompt({
    contextQuality: "full",
    sportHint: "nba",
    chaseSignals: { isChase: false },
    question: "thoughts?",
  });
  assert.match(prompt, /NO DEAD ENDS/i);
  assert.match(prompt, /Never ask the user to clarify/i);
});
