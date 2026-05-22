import test from "node:test";
import assert from "node:assert/strict";
import { stripBrokenQuoteFragments } from "./urTakeResponse.js";

test("stripBrokenQuoteFragments removes leading quote paren junk", () => {
  const out = stripBrokenQuoteFragments(
    '") and I\'ll give you a sharp read grounded in tonight\'s matchup.',
  );
  assert.ok(!/^\s*["')]/i.test(out));
  assert.match(out, /sharp read grounded/i);
});
