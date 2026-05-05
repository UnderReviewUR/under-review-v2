import test from "node:test";
import assert from "node:assert/strict";
import {
  extractUrTakeSectionHeading,
  isUrTakeSectionHeading,
  normalizeUrTakeSectionHeadingKey,
} from "./urTakeSectionHeadings.js";

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

test("extractUrTakeSectionHeading splits Label: body for known headings", () => {
  assert.deepEqual(extractUrTakeSectionHeading("Confidence: Medium. Tatum out."), {
    label: "Confidence",
    body: "Medium. Tatum out.",
  });
  assert.deepEqual(extractUrTakeSectionHeading("Live trigger: If Pritchard hits 4"), {
    label: "Live trigger",
    body: "If Pritchard hits 4",
  });
  assert.equal(extractUrTakeSectionHeading("THE PLAY"), null);
  assert.equal(extractUrTakeSectionHeading("This is a normal sentence."), null);
});

test("extractUrTakeSectionHeading rejects short candidates and game-clock refs (Q4, H1)", () => {
  assert.equal(extractUrTakeSectionHeading("Q4: tight bench rotation."), null);
  assert.equal(extractUrTakeSectionHeading("H1: fast pace."), null);
  assert.equal(extractUrTakeSectionHeading("AB: not a real heading."), null);
});
