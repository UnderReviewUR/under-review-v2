import assert from "node:assert/strict";
import test from "node:test";
import { buildHomeDailyEdgeView } from "./buildHomeDailyEdgeView.js";

const NOW = Date.parse("2026-07-04T20:00:00-04:00");

const STALE_LIVE = {
  id: "mar",
  homeTeam: "MAR",
  awayTeam: "BRA",
  status: "live",
  homeScore: 1,
  awayScore: 0,
  commenceTs: NOW - 4 * 60 * 60 * 1000,
};

const CURRENT_LIVE = {
  id: "live1",
  homeTeam: "FRA",
  awayTeam: "PAR",
  status: "live",
  homeScore: 0,
  awayScore: 0,
  minute: 32,
  commenceTs: NOW - 35 * 60 * 1000,
};

const NEXT = {
  id: "next1",
  homeTeam: "USA",
  awayTeam: "MEX",
  status: "ns",
  commenceTs: NOW + 2 * 60 * 60 * 1000,
  date: "2026-07-04",
  time: "22:00",
};

test("buildHomeDailyEdgeView — pivots off stale Morocco preview to live match + score", () => {
  const view = buildHomeDailyEdgeView(
    {
      ok: true,
      headline: "Morocco's defensive shell keeps Brazil honest at plus money.",
      bodyChunk: "Under 2.5 looks live.",
      closing: "Lean Morocco double chance.",
      matchupLabel: "BRA vs MAR",
      wcEventId: "mar",
      sportHint: "worldcup",
      question: "Morocco angle?",
    },
    [STALE_LIVE, CURRENT_LIVE, NEXT],
    NOW,
  );
  assert.equal(view.matchupLabel, "PAR vs FRA");
  assert.equal(view.kicker, "Live now");
  assert.match(String(view.scoreLine), /0–0 · 32'/);
  assert.equal(view.synced, false);
  assert.match(view.headline, /live/i);
});

test("buildHomeDailyEdgeView — next up when nothing live", () => {
  const view = buildHomeDailyEdgeView(
    {
      ok: true,
      headline: "Old stale copy",
      matchupLabel: "BRA vs MAR",
      wcEventId: "mar",
      sportHint: "worldcup",
    },
    [{ ...STALE_LIVE, status: "ft" }, NEXT],
    NOW,
  );
  assert.equal(view.matchupLabel, "MEX vs USA");
  assert.equal(view.kicker, "Tonight");
  assert.equal(view.synced, false);
});

test("buildHomeDailyEdgeView — keeps synced preview copy", () => {
  const view = buildHomeDailyEdgeView(
    {
      ok: true,
      headline: "France should control tempo.",
      bodyChunk: "PAR sits deep.",
      closing: "Lean FRA ML.",
      matchupLabel: "PAR vs FRA",
      wcEventId: "live1",
      sportHint: "worldcup",
      question: "FRA lean?",
    },
    [CURRENT_LIVE],
    NOW,
  );
  assert.equal(view.synced, true);
  assert.equal(view.headline, "France should control tempo.");
});
