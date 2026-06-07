import assert from "node:assert/strict";
import test from "node:test";
import {
  buildLiveMatchChanceQualityFromDetail,
  buildMatchChanceQualityFromDetail,
  computePlayerChanceIndex,
  computeTeamChanceIndex,
  formatLiveMatchChanceQualityPromptBlock,
  formatMatchChanceQualityPromptBlock,
  isWcLiveMatchStatus,
} from "./wcMatchChanceQuality.js";

test("computeTeamChanceIndex weights SOT and possession", () => {
  const idx = computeTeamChanceIndex({
    shots: 12,
    shotsOnTarget: 5,
    possessionPct: 60,
    corners: 4,
  });
  assert.ok(idx != null && idx > 0.5);
});

test("buildMatchChanceQualityFromDetail requires FT finalized detail", () => {
  assert.equal(
    buildMatchChanceQualityFromDetail({ status: "live", finalized: false }),
    null,
  );
  const payload = buildMatchChanceQualityFromDetail({
    eventId: "760500",
    homeTeam: "FRA",
    awayTeam: "ENG",
    status: "FT",
    finalized: true,
    homeScore: 2,
    awayScore: 1,
    teamStats: {
      home: { shots: 14, shotsOnTarget: 6, possessionPct: 58, corners: 5 },
      away: { shots: 8, shotsOnTarget: 3, possessionPct: 42, corners: 2 },
    },
    players: {
      home: [
        {
          name: "Kylian Mbappé",
          shots: 5,
          shotsOnTarget: 3,
          keyPasses: 2,
          goals: 1,
          assists: 1,
        },
      ],
      away: [],
    },
  });
  assert.ok(payload);
  assert.equal(payload.source, "espn_chance_index");
  assert.ok(payload.team.home.chanceIndex > payload.team.away.chanceIndex);
  assert.match(payload.players[0].name, /Mbapp/);
  assert.ok(computePlayerChanceIndex(payload.players[0]) > 0);
});

test("buildLiveMatchChanceQualityFromDetail works during live match", () => {
  assert.equal(isWcLiveMatchStatus("live"), true);
  assert.equal(isWcLiveMatchStatus("FT"), false);
  const payload = buildLiveMatchChanceQualityFromDetail({
    eventId: "760501",
    homeTeam: "FRA",
    awayTeam: "ENG",
    status: "live",
    homeScore: 0,
    awayScore: 0,
    teamStats: {
      home: { shots: 8, shotsOnTarget: 4, possessionPct: 62, corners: 3 },
      away: { shots: 2, shotsOnTarget: 0, possessionPct: 38, corners: 0 },
    },
    players: {
      home: [{ name: "Kylian Mbappé", shots: 3, shotsOnTarget: 2, keyPasses: 1 }],
      away: [],
    },
  });
  assert.ok(payload);
  assert.equal(payload.phase, "live");
  assert.equal(payload.source, "espn_live_chance_index");
  assert.ok(payload.team.home.chanceIndex > payload.team.away.chanceIndex);
});

test("formatLiveMatchChanceQualityPromptBlock forbids Opta xG language", () => {
  const payload = buildLiveMatchChanceQualityFromDetail({
    eventId: "760501",
    homeTeam: "FRA",
    awayTeam: "ENG",
    status: "1h",
    teamStats: {
      home: { shots: 6, shotsOnTarget: 3, possessionPct: 58, corners: 2 },
      away: { shots: 3, shotsOnTarget: 1, possessionPct: 42, corners: 1 },
    },
    players: {
      home: [{ name: "Kylian Mbappé", shots: 2, shotsOnTarget: 1, keyPasses: 1 }],
      away: [],
    },
  });
  const block = formatLiveMatchChanceQualityPromptBlock(payload);
  assert.match(block, /LIVE CHANCE INDEX/);
  assert.match(block, /not Opta xG/i);
  assert.match(block, /Team chance index/);
  assert.match(block, /Mbapp/);
});

test("formatMatchChanceQualityPromptBlock forbids Opta xG language", () => {
  const payload = buildMatchChanceQualityFromDetail({
    eventId: "760500",
    homeTeam: "FRA",
    awayTeam: "ENG",
    status: "FT",
    finalized: true,
    teamStats: {
      home: { shots: 10, shotsOnTarget: 4, possessionPct: 55, corners: 3 },
      away: { shots: 6, shotsOnTarget: 2, possessionPct: 45, corners: 1 },
    },
    players: {
      home: [{ name: "Kylian Mbappé", shots: 4, shotsOnTarget: 2, keyPasses: 1, goals: 1 }],
      away: [],
    },
  });
  const block = formatMatchChanceQualityPromptBlock(payload);
  assert.match(block, /POST-MATCH CHANCE QUALITY/);
  assert.match(block, /not Opta xG/i);
  assert.match(block, /Team chance index/);
  assert.match(block, /Mbapp/);
});
