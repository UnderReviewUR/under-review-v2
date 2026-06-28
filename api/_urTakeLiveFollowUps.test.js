import assert from "node:assert/strict";
import test from "node:test";
import {
  parseFollowUpsJsonArray,
  shouldAttachLiveFollowUps,
  buildHaikuFollowUpUserPrompt,
} from "./_urTakeLiveFollowUps.js";

test("shouldAttachLiveFollowUps — true only for plain + live keyword + not follow-up", () => {
  assert.equal(
    shouldAttachLiveFollowUps({
      outputJsonMode: "plain",
      isEffectivelyLive: true,
      hasLiveKeyword: false,
      isConversationFollowUp: false,
    }),
    true,
  );
  assert.equal(
    shouldAttachLiveFollowUps({
      outputJsonMode: "plain",
      hasLiveKeyword: true,
      isConversationFollowUp: false,
    }),
    true,
  );
  assert.equal(
    shouldAttachLiveFollowUps({
      outputJsonMode: "tier1_json",
      hasLiveKeyword: true,
      isConversationFollowUp: false,
    }),
    false,
  );
  assert.equal(
    shouldAttachLiveFollowUps({
      outputJsonMode: "plain",
      isEffectivelyLive: false,
      hasLiveKeyword: false,
      isConversationFollowUp: false,
    }),
    false,
  );
  assert.equal(
    shouldAttachLiveFollowUps({
      outputJsonMode: "plain",
      hasLiveKeyword: true,
      isConversationFollowUp: true,
    }),
    false,
  );
});

test("parseFollowUpsJsonArray — parses raw JSON array", () => {
  const arr = parseFollowUpsJsonArray('["a?","b?","c?"]');
  assert.deepEqual(arr, ["a?", "b?", "c?"]);
});

test("parseFollowUpsJsonArray — parses fenced JSON", () => {
  const raw = "```json\n[\"x?\",\"y?\",\"z?\"]\n```";
  assert.deepEqual(parseFollowUpsJsonArray(raw), ["x?", "y?", "z?"]);
});

test("buildHaikuFollowUpUserPrompt — embeds finalized response excerpt", () => {
  const body = "Best look: sample.\nAlso like: x.\nWatch: y.";
  const prompt = buildHaikuFollowUpUserPrompt(body);
  assert.ok(prompt.includes("Response was:"));
  assert.ok(prompt.includes("Best look: sample"));
  assert.ok(prompt.includes("Generate 3 follow-up questions."));
});

test("buildHaikuFollowUpUserPrompt includes WC live fixture context", () => {
  const prompt = buildHaikuFollowUpUserPrompt("Brazil lead 1-0.", {
    fixtureLabel: "JPN vs BRA",
    score: "0-1",
    phase: "ROUND_OF_32",
    round: "Round of 32",
    minute: "67'",
  });
  assert.match(prompt, /Brazil lead 1-0/);
  assert.match(prompt, /JPN vs BRA/);
  assert.match(prompt, /ROUND_OF_32/);
  assert.match(prompt, /no group-stage framing/i);
});

test("buildHaikuFollowUpUserPrompt works without fixture context", () => {
  const prompt = buildHaikuFollowUpUserPrompt("Plain answer.");
  assert.match(prompt, /Plain answer/);
  assert.doesNotMatch(prompt, /Live fixture context/);
});
