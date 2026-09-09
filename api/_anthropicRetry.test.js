import assert from "node:assert/strict";
import test from "node:test";

import { formatAnthropicSystemParam, buildAnthropicMessagesBody } from "./_anthropicRetry.js";
import { isClaudeSonnet5Model } from "./_anthropicModels.js";

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

test("isClaudeSonnet5Model matches API id", () => {
  assert.equal(isClaudeSonnet5Model("claude-sonnet-5"), true);
  assert.equal(isClaudeSonnet5Model("claude-sonnet-4-20250514"), false);
});

test("Sonnet 5 Messages body disables thinking and omits temperature", () => {
  const body = buildAnthropicMessagesBody({
    model: "claude-sonnet-5",
    max_tokens: 1200,
    temperature: 0.45,
    system: "sys",
    messages: [{ role: "user", content: "hi" }],
  });
  assert.equal(body.thinking.type, "disabled");
  assert.equal("temperature" in body, false);
});

test("Sonnet 4 Messages body still sends temperature", () => {
  const body = buildAnthropicMessagesBody({
    model: "claude-sonnet-4-20250514",
    max_tokens: 800,
    temperature: 0.45,
    system: "sys",
    messages: [{ role: "user", content: "hi" }],
  });
  assert.equal(body.temperature, 0.45);
  assert.equal("thinking" in body, false);
});
