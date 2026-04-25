/**
 * Permanent regression guard for NBA injury-status responses.
 *
 * These five cases run against the sanitizer + confidence normalizer layers in api/ur-take.js
 * (no live API calls), so they execute in CI on every commit and prevent the BDL grounding leak
 * and the legacy Tier 1/2/3 + STRONG EDGE/LEAN/WATCH vocabulary from regressing back into
 * user-facing chat output.
 */

import test from "node:test";
import assert from "node:assert/strict";

import {
  normalizeConfidenceVocabularyInText,
  stripNbaLeadInDisclosure,
} from "../api/ur-take.js";

test("Case 1 — Tier 1 - Strong Edge in confidence field normalizes to High with no legacy vocab", () => {
  const input = `>> Maxey is the primary play without Embiid - usage spikes to 30%+.

MATCH READ
- Maxey gets full minutes as primary creator.

CONFIDENCE
Tier 1 - Strong Edge. Clear usage redistribution with multiple aligned factors.`;

  const out = normalizeConfidenceVocabularyInText(input);

  assert.match(out, /\bHigh\b/, "expected 'High' to appear in normalized output");
  assert.doesNotMatch(out, /\bTier\s*[1-3]\b/, "no 'Tier N' may remain");
  assert.doesNotMatch(out, /\bSTRONG\s+EDGE\b/i, "no 'STRONG EDGE' may remain");
  assert.doesNotMatch(out, /(?<![a-z])LEAN(?![a-z])/, "no bare uppercase 'LEAN' may remain");
  assert.doesNotMatch(out, /(?<![a-z])WATCH(?![a-z])/, "no bare uppercase 'WATCH' may remain");
});

test("Case 2 — BDL grounding note as lead paragraph is stripped before reaching user", () => {
  const input = `BDL grounding note: could not cleanly match fade his to BallDontLie roster/slate data in this snapshot, so those names are treated as unverified.

>> Brunson GTD status creates a minutes ceiling that makes his points under the sharp side.

Game-to-decision tags typically cap stars at 28-32 minutes even when they play.`;

  const out = stripNbaLeadInDisclosure(input);

  assert.doesNotMatch(out, /BDL grounding note/i, "BDL grounding note must be stripped");
  assert.doesNotMatch(out, /could not cleanly match/i, "could not cleanly match must be stripped");
  assert.doesNotMatch(out, /BallDontLie/i, "BallDontLie reference must be stripped");
  assert.match(out, /Brunson GTD status/, "downstream analysis must survive");
});

test("Case 3 — CONFIDENCE Tier 2 - LEAN normalizes to Medium", () => {
  const input = `>> Lean under is the play if Brunson sits.

MATCH READ
- Knicks bench creation drops without his usage.

CONFIDENCE
Tier 2 - LEAN`;

  const out = normalizeConfidenceVocabularyInText(input);

  assert.match(out, /CONFIDENCE\s*\n\s*Medium\b/, "CONFIDENCE label must read 'Medium'");
  assert.doesNotMatch(out, /\bTier\s*2\b/i, "no 'Tier 2' may remain");
  assert.doesNotMatch(out, /(?<![a-z])LEAN(?![a-z])/, "no bare uppercase 'LEAN' may remain");
  // Lowercase prose 'Lean under is the play' must survive — only the confidence label is normalized.
  assert.match(out, /Lean under is the play/);
});

test("Case 4 — could not cleanly match anywhere in response body is fully stripped", () => {
  const input = `>> Brunson points under is the play if his line opens above 26.5.

The market is slow to move on GTD tags — books cap stars at 28-32 minutes.

Note: could not cleanly match fade his to BallDontLie roster/slate data in this snapshot, so those names are treated as unverified.

CONFIDENCE
Medium`;

  const out = stripNbaLeadInDisclosure(input);

  assert.doesNotMatch(out, /could not cleanly match/i, "phrase must be stripped from body");
  assert.doesNotMatch(out, /BallDontLie/i, "BallDontLie reference must be stripped from body");
  assert.match(out, /Brunson points under/, "primary analysis must survive");
  assert.match(out, /CONFIDENCE/, "trailing CONFIDENCE block must survive");
});

test("Case 5 — clean input with no banned vocabulary passes through unchanged", () => {
  const input = `>> Maxey assists over is the primary play if his line opens 6.5 or lower.

MATCH READ
- Boston switching defense creates iso opportunities for guards.
- Maxey gets full minutes as primary creator without Embiid.

CONFIDENCE
High — clear usage redistribution with multiple aligned factors.`;

  const stripped = stripNbaLeadInDisclosure(input);
  const normalized = normalizeConfidenceVocabularyInText(stripped);

  assert.equal(normalized, input, "clean input must pass through unchanged");
});
