import test from "node:test";
import assert from "node:assert/strict";
import { extractFirstBalancedJsonObject, safeParseSlateJson } from "./_todaySlateParse.js";

test("safeParseSlateJson strips ```json fences", () => {
  const text =
    '```json\n{"generatedAt":"2026-05-15T01:00:00.000Z","safeLean":{"sport":"golf","game":"PGA","angle":"x","why":"y"},"sharpAngle":{"sport":"nba","event":"A @ B","angle":"a","why":"b"},"contrarian":{"sport":"mlb","match":"x","angle":"c","why":"d"}}\n```';
  const o = safeParseSlateJson(text);
  assert.equal(o.safeLean.sport, "golf");
  assert.equal(o.sharpAngle.sport, "nba");
});

test("extractFirstBalancedJsonObject ignores trailing prose after }", () => {
  const s = '{"a":1} trailing ```';
  assert.equal(extractFirstBalancedJsonObject(s), '{"a":1}');
});

test("safeParseSlateJson handles leading prose before fence", () => {
  const text =
    'Here you go:\n```json\n{"generatedAt":"x","safeLean":{"sport":"golf","game":"PGA","angle":"a","why":"b"},"sharpAngle":{"sport":"tennis","event":"t","angle":"a","why":"b"},"contrarian":{"sport":"f1","match":"m","angle":"a","why":"b"}}\n```';
  const o = safeParseSlateJson(text);
  assert.equal(o.safeLean.sport, "golf");
});
