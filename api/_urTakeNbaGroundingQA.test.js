import test from "node:test";
import assert from "node:assert/strict";

import { lintUrTakeOutput } from "./_urTakeOutputQA.js";
import { buildNbaGroundingSnapshot, lintNbaHardGrounding } from "./_urTakeNbaGroundingQA.js";

const dualGameContext = {
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
  injuries: [],
  playerStats: [],
};

test("buildNbaGroundingSnapshot captures slate teams and focus matchup", () => {
  const snap = buildNbaGroundingSnapshot(dualGameContext, {
    awayAbbr: "MIL",
    homeAbbr: "PHI",
    label: "MIL @ PHI",
  });
  assert.ok(snap.verifiedPlayerToTeam.has("nikola jokic"));
  assert.equal(snap.verifiedPlayerToTeam.get("nikola jokic"), "DEN");
  assert.deepEqual(snap.focusAllowedTeams, ["MIL", "PHI"]);
  assert.ok(snap.slateTeamAbbrevs.includes("DEN"));
});

test("wrong-team / off-matchup player mention is flagged", () => {
  const snap = buildNbaGroundingSnapshot(dualGameContext, {
    awayAbbr: "MIL",
    homeAbbr: "PHI",
    label: "MIL @ PHI",
  });
  const bad =
    "For MIL @ PHI same-game: Nikola Jokic over 8 assists is the misprice — Denver runs pick-and-roll volume.";
  const r = lintNbaHardGrounding(bad, snap);
  assert.ok(r.criticalCodes.includes("nba_grounding_player_off_matchup"));
  assert.ok(r.events.some((e) => e.ruleCode === "nba_grounding_player_off_matchup" && /Jokic/i.test(e.player || "")));
});

test("non-slate player not in verified catalog — cannot flag (no hallucinated name detection)", () => {
  const snap = buildNbaGroundingSnapshot(dualGameContext, {
    awayAbbr: "MIL",
    homeAbbr: "PHI",
    label: "MIL @ PHI",
  });
  const t = "Fake McFakerson clears the board for Philly.";
  const r = lintNbaHardGrounding(t, snap);
  assert.equal(r.criticalCodes.length, 0);
});

test("injury status contradiction vs context is flagged", () => {
  const ctx = {
    ...dualGameContext,
    injuries: [{ player: "Joel Embiid", team: "PHI", status: "Out", detail: "Knee" }],
  };
  const snap = buildNbaGroundingSnapshot(ctx, {
    awayAbbr: "MIL",
    homeAbbr: "PHI",
    label: "MIL @ PHI",
  });
  const bad = "Joel Embiid is probable for tonight and should eat minutes.";
  const r = lintNbaHardGrounding(bad, snap);
  assert.ok(r.criticalCodes.includes("nba_grounding_injury_contradiction"));
});

test("clean response passes lintNbaHardGrounding", () => {
  const snap = buildNbaGroundingSnapshot(dualGameContext, {
    awayAbbr: "MIL",
    homeAbbr: "PHI",
    label: "MIL @ PHI",
  });
  const ok =
    "Tyrese Maxey over 24.5 points is live — Giannis Antetokounmpo draws doubles that open Maxey's pull-up.";
  const r = lintNbaHardGrounding(ok, snap);
  assert.equal(r.criticalCodes.length, 0);
});

test("lintUrTakeOutput wires NBA grounding snapshot for sport=nba", () => {
  const snap = buildNbaGroundingSnapshot(dualGameContext, {
    awayAbbr: "MIL",
    homeAbbr: "PHI",
    label: "MIL @ PHI",
  });
  const lint = lintUrTakeOutput("Lean Nikola Jokic assists on this MIL @ PHI card.", {
    sport: "nba",
    nbaGroundingSnapshot: snap,
    betIntegrityIssues: [],
  });
  assert.ok(lint.criticalRegenerationCodes.includes("nba_grounding_player_off_matchup"));
  assert.ok(Array.isArray(lint.groundingEvents) && lint.groundingEvents.length > 0);
});

test("clean NBA response passes output QA with snapshot attached", () => {
  const snap = buildNbaGroundingSnapshot(dualGameContext, {
    awayAbbr: "MIL",
    homeAbbr: "PHI",
    label: "MIL @ PHI",
  });
  const text =
    "Lean Tyrese Maxey over 22.5 points — ~55% implied vs soft POA; HIGH RISK if foul trouble spikes; season avg context vs line.";
  const lint = lintUrTakeOutput(text, {
    sport: "nba",
    nbaGroundingSnapshot: snap,
    betIntegrityIssues: [],
  });
  assert.equal(lint.criticalRegenerationCodes.includes("nba_grounding_player_off_matchup"), false);
  assert.equal(lint.criticalRegenerationCodes.includes("nba_grounding_injury_contradiction"), false);
});
