import test from "node:test";
import assert from "node:assert/strict";

import { scrubStructuredFaceText, scrubFaceText } from "./urTakeFaceTextScrub.js";

test("scrubStructuredFaceText removes leaked prompt scaffolding", () => {
  const input = "Great pick. Legs below are shown in the structured card layout.";
  const result = scrubStructuredFaceText(input);
  assert.ok(!result.includes("Legs below are shown in the structured card"));
});

test("scrubStructuredFaceText removes full write-up stays phrase", () => {
  const result = scrubStructuredFaceText("Some text your full write-up stays in the thread. More text");
  assert.ok(!result.includes("your full write-up stays in the thread"));
});

test("scrubStructuredFaceText removes layout is extracted phrase", () => {
  const result = scrubStructuredFaceText("Text layout is extracted from plain text. More");
  assert.ok(!result.includes("layout is extracted from plain text"));
});

test("scrubStructuredFaceText trims whitespace", () => {
  const result = scrubStructuredFaceText("  hello   world  ");
  assert.equal(result, "hello world");
});

test("scrubStructuredFaceText handles null input", () => {
  assert.equal(scrubStructuredFaceText(null), "");
});

test("scrubStructuredFaceText handles empty string", () => {
  assert.equal(scrubStructuredFaceText(""), "");
});

test("scrubStructuredFaceText collapses multiple spaces after removal", () => {
  const input = "Before Legs below are shown in the structured card after";
  const result = scrubStructuredFaceText(input);
  assert.ok(!result.includes("  "));
});

test("scrubFaceText is alias for scrubStructuredFaceText", () => {
  assert.equal(scrubFaceText, scrubStructuredFaceText);
});
