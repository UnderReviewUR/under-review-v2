import test from "node:test";
import assert from "node:assert/strict";

import { normalizeText } from "./normalizeText.js";

test("normalizeText lowercases and trims", () => {
  assert.equal(normalizeText("  Hello World  "), "hello world");
});

test("normalizeText handles null", () => {
  assert.equal(normalizeText(null), "");
});

test("normalizeText handles undefined", () => {
  assert.equal(normalizeText(undefined), "");
});

test("normalizeText handles empty string", () => {
  assert.equal(normalizeText(""), "");
});

test("normalizeText handles number coercion", () => {
  assert.equal(normalizeText(42), "42");
});
