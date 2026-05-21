import test from "node:test";
import assert from "node:assert/strict";

import {
  buildUnderReviewVoicePrompt,
  buildSlipReviewVoicePrompt,
  sanitizeOverFormalOutput,
  isBestPropsSlateScopeQuestion,
} from "./_urTakeVoiceProfile.js";

test("sanitizeOverFormalOutput rounds ugly stat decimals", () => {
  assert.match(sanitizeOverFormalOutput("about 13.584 pts tonight"), /~14 pts/);
  assert.match(sanitizeOverFormalOutput("model says 36.62 PRA"), /~37 PRA/);
  assert.ok(!/\d+\.\d{3,}\s*(pts|PRA)/i.test(sanitizeOverFormalOutput("lean ~13.584 pts")));
});

test("sanitizeOverFormalOutput removes robotic header lines", () => {
  const raw = `Quick lean.\nSTATUS SHIFT\nEmbiid questionable.\n`;
  const out = sanitizeOverFormalOutput(raw);
  assert.ok(!/\bSTATUS SHIFT\b/i.test(out));
  assert.match(out, /Embiid questionable/);
});

test("isBestPropsSlateScopeQuestion — best NBA props tonight", () => {
  assert.equal(isBestPropsSlateScopeQuestion("best NBA props tonight"), true);
});

test("isBestPropsSlateScopeQuestion — this game narrows scope", () => {
  assert.equal(isBestPropsSlateScopeQuestion("best props in this game tonight"), false);
});

test("buildUnderReviewVoicePrompt follow-up shares same voice header family", () => {
  const fu = buildUnderReviewVoicePrompt({
    isFollowUp: true,
    sportHint: "nba",
    question: "",
  });
  assert.match(fu, /UNDERREVIEW VOICE — FOLLOW-UP/);
  assert.match(fu, /sharp sports bettor/);
});

test("buildSlipReviewVoicePrompt requires all legs acknowledgment", () => {
  const s = buildSlipReviewVoicePrompt();
  assert.match(s, /every leg/);
  assert.match(s, /same count and order/);
});
