import assert from "node:assert/strict";
import test from "node:test";

import { formatAnthropicSystemParam } from "./_anthropicRetry.js";

test("formatAnthropicSystemParam leaves short system as string", () => {
  const prev = process.env.UR_TAKE_PROMPT_CACHE;
  process.env.UR_TAKE_PROMPT_CACHE = "1";
  assert.equal(formatAnthropicSystemParam("short", true), "short");
  if (prev !== undefined) process.env.UR_TAKE_PROMPT_CACHE = prev;
  else delete process.env.UR_TAKE_PROMPT_CACHE;
});

test("formatAnthropicSystemParam caches large static blocks", () => {
  const prev = process.env.UR_TAKE_PROMPT_CACHE;
  process.env.UR_TAKE_PROMPT_CACHE = "1";
  const big = "x".repeat(5000);
  const out = formatAnthropicSystemParam(big, true);
  assert.ok(Array.isArray(out));
  assert.equal(out[0]?.type, "text");
  assert.equal(out[0]?.cache_control?.type, "ephemeral");
  if (prev !== undefined) process.env.UR_TAKE_PROMPT_CACHE = prev;
  else delete process.env.UR_TAKE_PROMPT_CACHE;
});
