import test from "node:test";
import assert from "node:assert/strict";
import { etCalendarYmd, resolveNflDraftPromoBand, NFL_DRAFT_2026_ET_DATES } from "./nflDraftCalendarBand.js";

test("etCalendarYmd returns New York calendar date", () => {
  const ymd = etCalendarYmd(new Date("2026-04-24T04:00:00.000Z"));
  assert.equal(typeof ymd, "string");
  assert.match(ymd, /^\d{4}-\d{2}-\d{2}$/);
});

test("resolveNflDraftPromoBand maps 2026 draft ET dates", () => {
  const meta = {
    phase: "during_draft",
    event: { dates: { ...NFL_DRAFT_2026_ET_DATES } },
  };
  assert.equal(
    resolveNflDraftPromoBand(Date.parse("2026-04-24T17:00:00.000Z"), meta).band,
    "rounds2_3",
  );
  assert.equal(
    resolveNflDraftPromoBand(Date.parse("2026-04-25T17:00:00.000Z"), meta).band,
    "rounds4_7",
  );
  assert.equal(
    resolveNflDraftPromoBand(Date.parse("2026-04-23T17:00:00.000Z"), meta).band,
    "round1",
  );
});
