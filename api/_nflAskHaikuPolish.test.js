import assert from "node:assert/strict";
import test from "node:test";
import {
  buildNflLockedLegsBrief,
  extractNflPolishNumbers,
  mergeNflHaikuPolish,
  nflHaikuPolishIsSafe,
} from "./_nflAskHaikuPolish.js";

const locked = {
  call: "NIX UNDER 229.5",
  lean: "Lean: Nix under 229.5.",
  whyNow: "Board:\n1. Nix under 229.5 (passing yards)\n2. Worthy under 40.5 (receiving yards)",
  edge: "I'd take the under. Don't stack it.",
  confidence: "Speculative",
};

test("extractNflPolishNumbers pulls posted lines", () => {
  assert.deepEqual(extractNflPolishNumbers("Nix under 229.5 and Worthy 40.5"), [229.5, 40.5]);
});

test("buildNflLockedLegsBrief includes call and board", () => {
  const brief = buildNflLockedLegsBrief(locked);
  assert.match(brief, /NIX UNDER 229\.5/);
  assert.match(brief, /Worthy under 40\.5/);
});

test("safe polish keeps locked numbers and side", () => {
  const polish = {
    whyNow:
      "I'd ride Nix under 229.5 tonight — early-season pace makes me fade the big number. Worthy under 40.5 is the side ticket.",
    edge: "Stick the under; don't ladder it.",
  };
  assert.equal(nflHaikuPolishIsSafe(locked, polish), true);
  const merged = mergeNflHaikuPolish(locked, polish);
  assert.equal(merged.call, locked.call);
  assert.equal(merged.lean, locked.lean);
  assert.match(String(merged.whyNow), /229\.5/);
});

test("rejects invented lines and side flips", () => {
  assert.equal(
    nflHaikuPolishIsSafe(locked, {
      whyNow: "Take Nix under 275.5 instead.",
      edge: "Hammer it.",
    }),
    false,
  );
  assert.equal(
    nflHaikuPolishIsSafe(locked, {
      whyNow: "Actually take the over on Nix at 229.5.",
      edge: "Take the over.",
    }),
    false,
  );
});
