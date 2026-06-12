import assert from "node:assert/strict";
import test from "node:test";
import {
  formatWcMarketsStatusChip,
  wcUrTakeConfidenceNote,
  wcXiUserChipLabel,
} from "./wcProductVoice.js";
import { sanitizeWcPublicPayload, ensureWcPublicOutrights } from "./wcPublicPayload.js";

test("wcXiUserChipLabel never admits missing feeds", () => {
  assert.equal(wcXiUserChipLabel("unavailable"), "Pre-kickoff");
  assert.ok(!wcXiUserChipLabel("pending").toLowerCase().includes("pending data"));
});

test("wcUrTakeConfidenceNote is guidance not apology", () => {
  const note = wcUrTakeConfidenceNote("limited_intel");
  assert.ok(note);
  assert.ok(!/not available|missing|stale/i.test(note));
});

test("formatWcMarketsStatusChip is positive", () => {
  const chip = formatWcMarketsStatusChip({ ageMinutes: 12, lastUpdated: Date.now() });
  assert.ok(chip);
  assert.ok(!/stale/i.test(chip));
});

test("sanitizeWcPublicPayload strips internal flags", () => {
  const out = sanitizeWcPublicPayload({
    stale: true,
    fallback: true,
    error: "espn_down",
    matches: [{ id: "1", oddsStale: true }],
  });
  assert.equal(out.stale, undefined);
  assert.equal(out.error, undefined);
  assert.equal(out.matches[0].oddsStale, undefined);
});

test("ensureWcPublicOutrights always returns markets", () => {
  const out = ensureWcPublicOutrights({ outrights: {} });
  assert.ok(Object.keys(out.outrights).length >= 12);
});
