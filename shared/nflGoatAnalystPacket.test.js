import assert from "node:assert/strict";
import test from "node:test";
import {
  formatNflGoatAnalystPacket,
  nflNameHitsQuestion,
  pickNflAskStatPlayerIds,
} from "./nflGoatAnalystPacket.js";
import { createEmptyNflGoatBriefcase } from "./nflGoatExtractionContract.js";

test("nflNameHitsQuestion matches last names in the ask", () => {
  assert.equal(nflNameHitsQuestion("Drake Maye", "Maye over 214.5 passing yards?"), true);
  assert.equal(nflNameHitsQuestion("Jaxon Smith-Njigba", "SEA @ NE spread"), false);
});

test("pickNflAskStatPlayerIds prefers the named player", () => {
  const ids = pickNflAskStatPlayerIds(
    [
      { playerId: 1, player: "Jaxon Smith-Njigba" },
      { playerId: 2, player: "Drake Maye" },
    ],
    "Maye passing yards over?",
    2,
  );
  assert.equal(ids[0], 2);
});

test("formatNflGoatAnalystPacket injects live stats, logs, and defense — not just a grade", () => {
  const b = createEmptyNflGoatBriefcase({ week: 1, season: 2026, primarySource: "balldontlie_nfl" });
  b.slate.odds = [
    {
      away: "SEA",
      home: "NE",
      spread: { home: -3.5 },
      total: { line: 42.5 },
    },
  ];
  b.players.seasonStats = [
    {
      player: "Drake Maye",
      team: "NE",
      position: "QB",
      games: 1,
      passYds: 241,
      passTd: 2,
      source: "balldontlie_season_stats",
    },
  ];
  b.players.recentStats = [
    {
      player: "Drake Maye",
      opponent: "LV",
      week: 1,
      passYds: 241,
      passTd: 2,
      source: "balldontlie_stats",
    },
  ];
  b.league.teamDefense = {
    SEA: {
      tier: "STRONG",
      source: "balldontlie_team_season_stats",
      overall: { ptsAllowed: 19.4, rank: 8 },
      pass: { rank: 11, ydsAllowed: 210 },
      rush: { rank: 7, ydsAllowed: 95 },
    },
  };
  b.league.injuries = [{ player: "Rhamondre Stevenson", team: "NE", status: "Questionable", position: "RB" }];
  const packet = formatNflGoatAnalystPacket({
    briefcase: b,
    question: "Maye over 214.5 passing yards SEA @ NE?",
    scopeAbbrs: new Set(["SEA", "NE"]),
  });
  assert.match(packet, /NFL GOAT ANALYST PACKET/);
  assert.match(packet, /Drake Maye/);
  assert.match(packet, /241/);
  assert.match(packet, /TEAM DEFENSE \(last-year prior/);
  assert.match(packet, /OPENER WEEK/);
  assert.match(packet, /Stevenson/);
  assert.doesNotMatch(packet, /FORCE PASS/);
});
