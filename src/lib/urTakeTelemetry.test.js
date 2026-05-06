import test from "node:test";
import assert from "node:assert/strict";

import { sanitizeUrTakeTelemetryProps } from "./urTakeTelemetry.js";

test("sanitizeUrTakeTelemetryProps keeps primitives and truncates long strings", () => {
  const long = "x".repeat(200);
  const out = sanitizeUrTakeTelemetryProps({
    sport: "nba",
    liveMode: true,
    followUpCount: 3,
    ms: 1200,
    text: long,
    skip: null,
    skipUndef: undefined,
  });
  assert.equal(out.sport, "nba");
  assert.equal(out.liveMode, true);
  assert.equal(out.followUpCount, 3);
  assert.equal(out.ms, 1200);
  assert.ok(String(out.text).length <= 162);
  assert.ok(!("skip" in out));
  assert.ok(!("skipUndef" in out));
});

test("sanitizeUrTakeTelemetryProps drops non-finite numbers", () => {
  const out = sanitizeUrTakeTelemetryProps({ bad: NaN, ok: 1 });
  assert.equal(out.ok, 1);
  assert.ok(!("bad" in out));
});

test("sanitizeUrTakeTelemetryProps caps followUpTexts to 3 strings × 80 chars", () => {
  const long = "y".repeat(100);
  const out = sanitizeUrTakeTelemetryProps({
    followUpTexts: ["  Alpha?  ", "Beta?", long, "fourth"],
  });
  assert.deepEqual(out.followUpTexts, ["Alpha?", "Beta?", "y".repeat(80)]);
});

