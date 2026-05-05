import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import {
  parseJsonFromModelText,
  validateSlipCounts,
  runSlipScreenshotPipeline,
  extractAnthropicMessageText,
} from "./_slipScreenshotPipeline.js";
import { fetchAnthropicMessages } from "./_anthropicRetry.js";
import { getEnv } from "./_env.js";

test("parseJsonFromModelText handles fenced json", () => {
  const j = parseJsonFromModelText('```json\n{"a":1}\n```');
  assert.equal(j.a, 1);
});

test("validateSlipCounts ok when lengths match", () => {
  const v = validateSlipCounts({ detectedCardCount: 3 }, { slips: [{}, {}, {}] });
  assert.equal(v.ok, true);
});

test("validateSlipCounts fails on length mismatch", () => {
  const v = validateSlipCounts({ detectedCardCount: 2 }, { slips: [{}] });
  assert.equal(v.ok, false);
  assert.match(v.warnings[0], /slips \(1\).*2\)/);
});

test("extractAnthropicMessageText joins text blocks", () => {
  const t = extractAnthropicMessageText({
    content: [
      { type: "text", text: "a" },
      { type: "text", text: "b" },
    ],
  });
  assert.equal(t, "a\nb");
});

// When this returns vague_no_betting_ui, ur-take downgrades slip_review → general if
// shouldDowngradeVagueSlipToGeneral("vague", "vague_no_betting_ui") (see api/_slipImageIntent.js).
test("runSlipScreenshotPipeline — vague route + zero cards skips pass 2 (inventory only)", async () => {
  let calls = 0;
  async function mockCallAnthropic() {
    calls++;
    const inv = JSON.stringify({ detectedCardCount: 0, cards: [] });
    return { ok: true, data: { content: [{ type: "text", text: inv }] } };
  }
  const out = await runSlipScreenshotPipeline({
    apiKey: "t",
    model: "m",
    image: { base64: "AA", mediaType: "image/png" },
    callAnthropic: mockCallAnthropic,
    slipRouteVia: "vague",
  });
  assert.equal(calls, 1);
  assert.equal(out.error, "vague_no_betting_ui");
  assert.equal(out.augmentationText, "");
});

test("runSlipScreenshotPipeline — two passes, 5 legs, includes bottom-card name (OG Anunoby)", async () => {
  let calls = 0;
  const inventoryJson = JSON.stringify({
    detectedCardCount: 5,
    cards: [
      { index: 1, verticalBand: "top", shortDescriptor: "Maxey PRA" },
      { index: 2, verticalBand: "upper", shortDescriptor: "Towns AST" },
      { index: 3, verticalBand: "middle", shortDescriptor: "Brunson AST" },
      { index: 4, verticalBand: "lower", shortDescriptor: "Edgecombe REB" },
      { index: 5, verticalBand: "bottom", shortDescriptor: "Anunoby PRA" },
    ],
  });
  const extractionJson = JSON.stringify({
    slips: [
      {
        index: 1,
        playerOrTeam: "Tyrese Maxey",
        marketStat: "P+R+A",
        line: 35.5,
        side: "Higher",
        readability: "clear",
        confidence: "high",
        rawVisibleText: "Maxey 35.5 P+R+A Higher",
      },
      {
        index: 2,
        playerOrTeam: "Karl-Anthony Towns",
        marketStat: "AST",
        line: 4.5,
        side: "Higher",
        readability: "clear",
        confidence: "high",
        rawVisibleText: "Towns 4.5 AST Higher",
      },
      {
        index: 3,
        playerOrTeam: "Jalen Brunson",
        marketStat: "AST",
        line: 6.5,
        side: "Higher",
        readability: "clear",
        confidence: "high",
        rawVisibleText: "Brunson 6.5 AST Higher",
      },
      {
        index: 4,
        playerOrTeam: "VJ Edgecombe",
        marketStat: "REB",
        line: 4.5,
        side: "Higher",
        readability: "clear",
        confidence: "high",
        rawVisibleText: "Edgecombe 4.5 REB Higher",
      },
      {
        index: 5,
        playerOrTeam: "OG Anunoby",
        marketStat: "P+R+A",
        line: 24.5,
        side: "Higher",
        readability: "clear",
        confidence: "high",
        rawVisibleText: "Anunoby 24.5 P+R+A Higher",
      },
    ],
    needsUserCrop: false,
    needsUserCropReason: null,
  });

  async function mockCallAnthropic() {
    calls++;
    const data =
      calls === 1
        ? { content: [{ type: "text", text: inventoryJson }] }
        : { content: [{ type: "text", text: extractionJson }] };
    return { ok: true, data };
  }

  const out = await runSlipScreenshotPipeline({
    apiKey: "test",
    model: "claude-test",
    image: { base64: "AAAA", mediaType: "image/png" },
    callAnthropic: mockCallAnthropic,
  });

  assert.equal(calls, 2, "expect exactly pass 1 + pass 2");
  assert.equal(out.ok, true);
  assert.equal(out.inventory?.detectedCardCount, 5);
  assert.equal(out.extraction?.slips?.length, 5);
  const joined = out.extraction.slips.map((s) => String(s.playerOrTeam || "")).join(" ");
  assert.match(joined, /Maxey/i);
  assert.match(joined, /Anunoby/i);
  assert.match(out.augmentationText, /detectedCardCount/u);
  assert.match(out.augmentationText, /5/u);
  /** Regression: pipeline must not stop after first card — five indices present */
  assert.match(out.augmentationText, /"index":\s*5/);
});

test("optional live fixture — Underdog 5-leg slip (skipped unless fixture + API key)", async () => {
  const __dirname = dirname(fileURLToPath(import.meta.url));
  const fixturePath = join(__dirname, "..", "tests", "fixtures", "underdog-5leg-slip.png");
  if (!existsSync(fixturePath)) {
    return;
  }
  const key = getEnv("ANTHROPIC_API_KEY");
  if (!key) {
    return;
  }

  const buf = readFileSync(fixturePath);
  const base64 = buf.toString("base64");

  async function callAnthropic(params) {
    return fetchAnthropicMessages({
      apiKey: key,
      model: getEnv("ANTHROPIC_MODEL") || "claude-sonnet-4-20250514",
      max_tokens: params.max_tokens ?? 2048,
      temperature: params.temperature ?? 0.1,
      system: params.system,
      messages: params.messages,
      timeoutMs: 90000,
      maxRetries: 2,
    });
  }

  const out = await runSlipScreenshotPipeline({
    apiKey: key,
    model: getEnv("ANTHROPIC_MODEL") || "claude-sonnet-4-20250514",
    image: { base64, mediaType: "image/png" },
    callAnthropic,
  });

  assert.ok(out.inventory?.detectedCardCount >= 4, "expect multi-leg slip");
  assert.ok(
    String(out.augmentationText || "").toLowerCase().includes("anunoby") ||
      JSON.stringify(out.extraction || {}).toLowerCase().includes("anunoby"),
    "expect OG Anunoby visible on 5-leg Underdog slip",
  );
});
