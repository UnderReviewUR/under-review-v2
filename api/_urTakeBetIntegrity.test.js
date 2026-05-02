import test from "node:test";
import assert from "node:assert/strict";

import {
  applyBetIntegrityPostProcess,
  rewriteInvalidStatTerminology,
  sentenceFailsDoubleDoubleLogic,
  sentenceFailsTripleDoubleLogic,
  STAT_TERM_DD_REPLACEMENT,
} from "./_urTakeBetIntegrity.js";

const BAD_DD_LINE =
  "The double-double absorbs variance — he can hit it on 8 REB + 2 AST.";

test("invalid double-double with both cited stats under 10 fails and is rewritten", () => {
  assert.equal(sentenceFailsDoubleDoubleLogic(BAD_DD_LINE), true);

  const issues = [];
  const out = rewriteInvalidStatTerminology(BAD_DD_LINE, issues);
  assert.ok(issues.includes("invalid_stat_term_logic"));
  assert.ok(!/\b8\s*REB\s*\+\s*2\s*AST\b/i.test(out));
  assert.ok(out.includes(STAT_TERM_DD_REPLACEMENT.slice(0, 40)));
});

test("bad double-double example cannot pass full pipeline unchanged", () => {
  const { text, issues, modified } = applyBetIntegrityPostProcess(BAD_DD_LINE);
  assert.equal(modified, true);
  assert.ok(issues.includes("invalid_stat_term_logic"));
  assert.ok(!/8\s*REB\s*\+\s*2\s*AST/i.test(text));
});

test("valid double-double citation with a stat at or above 10 is not flagged", () => {
  const ok =
    "He logged a double-double with 14 pts and 11 rebounds against drop coverage.";
  assert.equal(sentenceFailsDoubleDoubleLogic(ok), false);
  const issues = [];
  const out = rewriteInvalidStatTerminology(ok, issues);
  assert.equal(out.trim(), ok.trim());
  assert.equal(issues.filter((i) => i === "invalid_stat_term_logic").length, 0);
});

test("triple-double with any cited line still under 10 fails", () => {
  const bad =
    "Triple-double watch: he's sitting on 22 pts, 11 ast, 9 reb — one board away.";
  assert.equal(sentenceFailsTripleDoubleLogic(bad), true);
});

test("triple-double with all three lines at 10+ passes", () => {
  const ok =
    "His last triple-double was 18 pts, 14 ast, 12 reb — full oxygen usage.";
  assert.equal(sentenceFailsTripleDoubleLogic(ok), false);
});

test("stat validation is separate from hype softening", () => {
  const combined = `${BAD_DD_LINE} Embiid's floor is nearly automatic.`;
  const { issues } = applyBetIntegrityPostProcess(combined);
  assert.ok(issues.includes("invalid_stat_term_logic"));
  assert.ok(issues.includes("softened_hype_language"));
});

test("softens nearly automatic without probability", () => {
  const raw =
    "Embiid's double-double floor is nearly automatic vs this frontcourt.";
  const { text, issues, modified } = applyBetIntegrityPostProcess(raw);
  assert.equal(modified, true);
  assert.ok(issues.includes("softened_hype_language"));
  assert.ok(!issues.includes("invalid_stat_term_logic"));
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
