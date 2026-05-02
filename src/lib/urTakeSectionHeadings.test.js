import test from "node:test";
import assert from "node:assert/strict";
import { isUrTakeSectionHeading, normalizeUrTakeSectionHeadingKey } from "./urTakeSectionHeadings.js";

test("recognizes listed labels with optional colon and case", () => {
  assert.equal(isUrTakeSectionHeading("THE PLAY"), true);
  assert.equal(isUrTakeSectionHeading("THE PLAY:"), true);
  assert.equal(isUrTakeSectionHeading("Confidence"), true);
  assert.equal(isUrTakeSectionHeading("FINAL VERDICT"), true);
  assert.equal(isUrTakeSectionHeading("  LIVE TRIGGER  "), true);
});

test("rejects partial lines and unknown labels", () => {
  assert.equal(isUrTakeSectionHeading("THE PLAY extra words"), false);
  assert.equal(isUrTakeSectionHeading("NOT A LABEL"), false);
  assert.equal(isUrTakeSectionHeading(""), false);
});

test("normalizeUrTakeSectionHeadingKey collapses whitespace", () => {
  assert.equal(normalizeUrTakeSectionHeadingKey("  Confidence: "), "CONFIDENCE");
});
