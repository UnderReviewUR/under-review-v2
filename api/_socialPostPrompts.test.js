import test from "node:test";
import assert from "node:assert/strict";
import { buildRedditPostPrompt, buildTwitterPostPrompt } from "./_socialPostPrompts.js";

test("social post prompts use bro voice and first person", () => {
  const reddit = buildRedditPostPrompt({ takeSummary: "Lean Wemby boards over 11.5.", sport: "nba" });
  assert.match(reddit, /sharp sports bettor/);
  assert.match(reddit, /First person/);
  assert.match(reddit, /Reddit/);
  assert.match(reddit, /Lean Wemby/);

  const twitter = buildTwitterPostPrompt({ takeSummary: "Pass on SGA over — trap line.", sport: "nba" });
  assert.match(twitter, /X \/ Twitter/);
  assert.match(twitter, /Pass on SGA/);
});
