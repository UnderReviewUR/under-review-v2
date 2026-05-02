import test from "node:test";
import assert from "node:assert/strict";

import { applyBetIntegrityPostProcess } from "./_urTakeBetIntegrity.js";

test("softens nearly automatic without probability", () => {
  const raw =
    "Embiid's double-double floor is nearly automatic vs this frontcourt.";
  const { text, issues, modified } = applyBetIntegrityPostProcess(raw);
  assert.equal(modified, true);
  assert.ok(issues.includes("softened_hype_language"));
  assert.ok(!/nearly automatic/i.test(text));
});

test("replaces the lock metaphor when prop context and no pct", () => {
  const raw = "This prop is the lock on my slip tonight.";
  const { text, issues } = applyBetIntegrityPostProcess(raw);
  assert.ok(issues.includes("softened_lock_metaphor"));
  assert.match(text, /the lean/i);
});

test("leaves clock and block alone", () => {
  const raw = "He blocked two shots in the mid-clock offense.";
  const { text } = applyBetIntegrityPostProcess(raw);
  assert.equal(text, raw.trim());
});
