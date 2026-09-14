import assert from "node:assert/strict";
import { test } from "node:test";
import { scrubStructuredFaceText } from "./urTakeFaceTextScrub.js";

test("scrubStructuredFaceText keeps numbered prop board newlines", () => {
  const raw = [
    "Board tickets (posted numbers only):",
    "1. Prescott under 217.5 (passing yards)",
    "2. Dart under 220.5 (passing yards)",
    "3. Lamb under 57.5 (receiving yards)",
    "",
    "Primary lean: Prescott under 217.5.",
  ].join("\n");
  const out = scrubStructuredFaceText(raw);
  assert.match(out, /1\.\s+Prescott/);
  assert.match(out, /\n2\.\s+Dart/);
  assert.match(out, /\n3\.\s+Lamb/);
  assert.doesNotMatch(out, /1\.\s+Prescott under 217\.5 \(passing yards\) 2\./);
});
