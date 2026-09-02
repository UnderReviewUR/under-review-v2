import assert from "node:assert/strict";
import { test } from "node:test";
import { sanitizeLeanBroTone } from "../api/_urTakeCoreVoice.js";
import { pickLivePropLine } from "../api/_nflMatchupCard.js";

test("sanitizeLeanBroTone keeps trailing period within 120 chars", () => {
  const long = `Lean: ${"x".repeat(110)}`;
  const out = sanitizeLeanBroTone(long);
  assert.ok(out.length <= 120);
  assert.match(out, /^Lean:\s.+\.\s*$/);
});

test("pickLivePropLine prefers matching pass TDs over yards", () => {
  const hit = pickLivePropLine(
    [
      { player: "Drake Maye", propRaw: "pass_yds", line: 227 },
      { player: "Drake Maye", propRaw: "passing_tds", line: 1.5 },
    ],
    "Drake Maye",
    ["pass_tds", "passing_tds"],
  );
  assert.equal(hit?.line, 1.5);
  assert.match(String(hit?.propRaw), /td/i);
});

test("pickLivePropLine returns null when only wrong market is posted", () => {
  const miss = pickLivePropLine(
    [{ player: "Drake Maye", propRaw: "pass_yds", line: 227 }],
    "Drake Maye",
    ["pass_tds", "passing_tds"],
  );
  assert.equal(miss, null);
});
