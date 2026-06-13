import assert from "node:assert/strict";
import test from "node:test";
import { sanitizeWcUserFacingProse, sanitizeUrTakeUserFacingProse } from "./wcUserFacingCopy.js";

test("sanitizeWcUserFacingProse strips GOAT from book line", () => {
  const out = sanitizeWcUserFacingProse(
    "Book line: +100 (DraftKings via BallDontLie GOAT live · as of Jun 13).",
  );
  assert.match(out, /Book line: \+100 · DraftKings · Jun 13/);
  assert.doesNotMatch(out, /GOAT|BallDontLie/i);
});

test("sanitizeWcUserFacingProse rewrites BDL missing-line copy", () => {
  const out = sanitizeWcUserFacingProse(
    "No BDL group-winner seed is posted for this market, so citing a specific +XXXX would be invented.",
  );
  assert.match(out, /No group-winner line is posted/);
  assert.doesNotMatch(out, /\bBDL\b/i);
});

test("sanitizeUrTakeUserFacingProse strips NBA BDL grounding leak", () => {
  const out = sanitizeUrTakeUserFacingProse(
    "BDL grounding shows Mitchell questionable — lean Under 28.5 points.",
  );
  assert.match(out, /Mitchell questionable/i);
  assert.doesNotMatch(out, /BDL grounding/i);
});

test("sanitizeWcUserFacingProse strips UR model bracket prefix", () => {
  const out = sanitizeWcUserFacingProse(
    "[UR model · 10k Poisson/Elo · Jun 13] COD sim 23.7% advance vs market-implied 50.0%.",
  );
  assert.doesNotMatch(out, /Poisson\/Elo/i);
  assert.match(out, /23\.7%/);
});
