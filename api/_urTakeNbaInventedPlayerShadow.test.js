import test from "node:test";
import assert from "node:assert/strict";

import { buildNbaGroundingSnapshot } from "./_urTakeNbaGroundingQA.js";
import {
  buildAllowlistLowerSetFromSnapshot,
  classifyClaimConfidence,
  extractNameCandidates,
  scanNbaInventedPlayerShadow,
} from "./_urTakeNbaInventedPlayerShadow.js";
import { runUnderReviewPostProcess } from "./_urTakeOutputQA.js";

const slateCtx = {
  todaysGames: [
    { awayTeam: { abbr: "MIL" }, homeTeam: { abbr: "PHI" } },
    { awayTeam: { abbr: "DEN" }, homeTeam: { abbr: "LAL" } },
  ],
  rosterGrounding: {
    playersByTeamAbbrev: {
      MIL: ["Giannis Antetokounmpo"],
      PHI: ["Tyrese Maxey"],
      DEN: ["Nikola Jokic"],
      LAL: ["LeBron James"],
    },
  },
  injuries: [{ player: "Joel Embiid", team: "PHI", status: "Out", detail: "" }],
  playerStats: [],
};

const matchup = { awayAbbr: "MIL", homeAbbr: "PHI", label: "MIL @ PHI" };

function shadowCtx() {
  const snap = buildNbaGroundingSnapshot(slateCtx, matchup);
  return {
    allowlistLower: buildAllowlistLowerSetFromSnapshot(snap),
    matchupTeams: /** @type {[string, string]} */ ([
      String(snap.focusAllowedTeams[0]),
      String(snap.focusAllowedTeams[1]),
    ]),
  };
}

test("invented prop sentence produces shadow events", () => {
  const ctx = shadowCtx();
  const text =
    "For MIL @ PHI lean Zephyr McBasketball over 14.5 points — soft POA all night.";
  const r = scanNbaInventedPlayerShadow(text, ctx);
  assert.equal(r.count, 1);
  assert.match(r.events[0].candidate, /Zephyr McBasketball/i);
  assert.equal(r.events[0].confidence, "high");
  assert.equal(r.events[0].reason, "candidate_not_in_verified_union");
});

test("invented injury sentence produces shadow event", () => {
  const ctx = shadowCtx();
  const text =
    "Wilfred Von Nobody is ruled out — pivot to team totals.";
  const r = scanNbaInventedPlayerShadow(text, ctx);
  assert.ok(r.count >= 1);
  const hit = r.events.find((e) => /Wilfred Von Nobody/i.test(e.candidate));
  assert.ok(hit);
  assert.equal(hit.confidence, "high");
});

test("New York / Los Angeles / Game 2 style phrases do not emit invented-player shadow", () => {
  const ctx = shadowCtx();
  const samples = [
    "New York-style pace supports the over 228.5 — books lag rotation math.",
    "Los Angeles travel density historically slows offense — lean under 218.5.",
    "Game 2 totals tighten — fade anything above 230 if whistles stay tight.",
    "Eastern Conference finals intensity bumps fouls — watch under 214.5.",
  ];
  for (const t of samples) {
    const r = scanNbaInventedPlayerShadow(t, ctx);
    assert.equal(r.count, 0, `expected no shadow for: ${t.slice(0, 60)}`);
  }
});

test("allowlisted matchup player does not log", () => {
  const ctx = shadowCtx();
  const text =
    "Tyrese Maxey over 24.5 points is structural — Giannis Antetokounmpo doubles create gaps.";
  const r = scanNbaInventedPlayerShadow(text, ctx);
  assert.equal(r.count, 0);
});

test("other-game player on slate is in allowlist — not invented", () => {
  const ctx = shadowCtx();
  const text =
    "Nikola Jokic over 26.5 points is unrelated to MIL @ PHI but name-check for chaos.";
  const r = scanNbaInventedPlayerShadow(text, ctx);
  assert.equal(r.count, 0);
});

test("no matchup teams — shadow scan returns zero", () => {
  const ctx = shadowCtx();
  const r = scanNbaInventedPlayerShadow("Zephyr McBasketball over 40 points.", {
    allowlistLower: ctx.allowlistLower,
    matchupTeams: null,
  });
  assert.equal(r.count, 0);
});

test("runUnderReviewPostProcess does not change text for shadow-only", () => {
  const ctx = shadowCtx();
  const raw =
    "Lean Tyrese Maxey over 22.5 points — ~52% implied vs defense; HIGH RISK if whistle-heavy.";
  const post = runUnderReviewPostProcess(raw, {
    sport: "nba",
    betIntegrityIssues: [],
    nbaInventedShadow: ctx,
  });
  assert.ok(post.text.includes("Tyrese Maxey"));
  assert.equal(post.qa.metricsLine.nbaInventedPlayerShadowCount, 0);
});

test("extractNameCandidates and classifyClaimConfidence helpers", () => {
  assert.deepEqual(extractNameCandidates("Hello Tyrese Maxey there."), ["Tyrese Maxey"]);
  assert.equal(classifyClaimConfidence("He is averaging 22 per game."), "low");
  assert.equal(classifyClaimConfidence("Lean over 225.5."), "high");
});
