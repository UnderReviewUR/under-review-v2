import test from "node:test";
import assert from "node:assert/strict";
import { resolveNbaNicknameMentionsFromQuestion } from "./nbaNicknameMap.js";

test("resolveNbaNicknameMentionsFromQuestion matches Wemby slang", () => {
  const hits = resolveNbaNicknameMentionsFromQuestion(
    "What's the best prop on Wemby tonight?",
  );
  assert.equal(hits.length, 1);
  assert.equal(hits[0].fullName, "Victor Wembanyama");
});

test("resolveNbaNicknameMentionsFromQuestion avoids duplicate full names", () => {
  const hits = resolveNbaNicknameMentionsFromQuestion("wemby and wembaniama boards");
  assert.equal(hits.length, 1);
});
