import assert from "node:assert/strict";
import test from "node:test";
import {
  buildDefenseMapFromBdlTeamSeasonStats,
  mergeNflDefenseMaps,
  inferNflOpponentFromSlate,
  buildNflH2hNoteFromRecentStats,
  nflDefenseTierFromRank,
} from "../shared/nflBdlDefenseNormalize.js";
import { buildNflMatchupCard } from "./_nflMatchupCard.js";
import {
  isNflBdlPrimaryEnabled,
  buildNflGoatBriefcase,
  normalizeNflBdlGames,
  normalizeNflBdlInjuries,
} from "./_nflBdl.js";

test("nflDefenseTierFromRank bands", () => {
  assert.equal(nflDefenseTierFromRank(1), "ELITE");
  assert.equal(nflDefenseTierFromRank(12), "STRONG");
  assert.equal(nflDefenseTierFromRank(20), "AVERAGE");
  assert.equal(nflDefenseTierFromRank(25), "WEAK");
  assert.equal(nflDefenseTierFromRank(32), "BOTTOM");
});

test("buildDefenseMapFromBdlTeamSeasonStats ranks by pts allowed", () => {
  const map = buildDefenseMapFromBdlTeamSeasonStats(
    [
      {
        team: { abbreviation: "BUF", full_name: "Buffalo Bills", conference: "AFC" },
        season: 2026,
        games_played: 4,
        opp_total_points_per_game: 14,
        opp_passing_yards_per_game: 180,
        opp_rushing_yards_per_game: 90,
        opp_total_offensive_yards_per_game: 270,
      },
      {
        team: { abbreviation: "DAL", full_name: "Dallas Cowboys", conference: "NFC" },
        season: 2026,
        games_played: 4,
        opp_total_points_per_game: 30,
        opp_passing_yards_per_game: 260,
        opp_rushing_yards_per_game: 140,
        opp_total_offensive_yards_per_game: 400,
      },
    ],
    { season: 2026 },
  );
  assert.equal(map.BUF.overall.rank, 1);
  assert.equal(map.DAL.overall.rank, 2);
  assert.equal(map.BUF.tier, "ELITE");
  assert.equal(map.DAL.pass.rank, 2);
  assert.match(String(map.BUF.propImpact.qb), /pass/i);
});

test("mergeNflDefenseMaps prefers live ranks and keeps static angles", () => {
  const merged = mergeNflDefenseMaps(
    {
      PHI: {
        abbr: "PHI",
        tier: "ELITE",
        source: "balldontlie_team_season_stats",
        overall: { rank: 2, ptsAllowed: 16 },
        pass: { rank: 3 },
        rush: { rank: 4 },
        propImpact: { qb: "short" },
        bettingAngles: [],
      },
    },
    {
      PHI: {
        abbr: "PHI",
        tier: "STRONG",
        overall: { rank: 8, ptsAllowed: 20 },
        pass: { rank: 10 },
        rush: { rank: 9 },
        propImpact: {
          qb: "Long static prose about Eagles secondary and how it affects pass props in scripted spots.",
        },
        bettingAngles: ["fade slot volume"],
        keyPlayers: ["CB1"],
      },
    },
  );
  assert.equal(merged.PHI.tier, "ELITE");
  assert.equal(merged.PHI.overall.rank, 2);
  assert.deepEqual(merged.PHI.bettingAngles, ["fade slot volume"]);
  assert.match(String(merged.PHI.propImpact.qb), /Long static/);
});

test("inferNflOpponentFromSlate picks the other side", () => {
  assert.equal(
    inferNflOpponentFromSlate([{ homeAbbr: "PHI", awayAbbr: "BUF" }], "BUF"),
    "PHI",
  );
  assert.equal(
    inferNflOpponentFromSlate([{ homeAbbr: "PHI", awayAbbr: "BUF" }], "PHI"),
    "BUF",
  );
  assert.equal(inferNflOpponentFromSlate([], "BUF"), null);
});

test("buildNflH2hNoteFromRecentStats summarizes vs opponent", () => {
  const note = buildNflH2hNoteFromRecentStats("James Cook", "MIA", [
    { player: "James Cook", opponent: "MIA", week: 3, rushYds: 95, receptions: 2 },
    { player: "James Cook", opponent: "MIA", week: 12, rushYds: 61, receptions: 4 },
    { player: "Other Guy", opponent: "MIA", week: 1, rushYds: 10 },
  ]);
  assert.match(note, /Recent vs MIA/);
  assert.match(note, /W3/);
  assert.match(note, /95 rush/);
});

test("normalizeNflBdlGames + injuries shape", () => {
  const games = normalizeNflBdlGames([
    {
      id: 99,
      week: 1,
      season: 2026,
      home_team: { abbreviation: "phi", full_name: "Philadelphia Eagles" },
      visitor_team: { abbreviation: "buf", full_name: "Buffalo Bills" },
      date: "2026-09-10T00:00:00Z",
    },
  ]);
  assert.equal(games[0].homeAbbr, "PHI");
  assert.equal(games[0].awayAbbr, "BUF");
  assert.equal(games[0].providerGameId, 99);

  const injuries = normalizeNflBdlInjuries([
    {
      status: "Questionable",
      player: { id: 1, first_name: "James", last_name: "Cook", position: "RB" },
      team: { abbreviation: "BUF" },
    },
  ]);
  assert.equal(injuries[0].player, "James Cook");
  assert.equal(injuries[0].team, "BUF");
});

test("buildNflMatchupCard uses slate opponent + live defense override without vs text", () => {
  const card = buildNflMatchupCard({
    question: "James Cook rush yards",
    games: [{ awayAbbr: "BUF", homeAbbr: "PHI" }],
    propLines: [
      {
        player: "James Cook",
        propRaw: "rush_yds",
        prop: "rush yards",
        line: 72.5,
        overOdds: -110,
        underOdds: -110,
        book: "DraftKings",
      },
    ],
    defenseByTeam: {
      PHI: {
        tier: "ELITE",
        overall: { ptsAllowed: 15.2, rank: 1 },
        pass: { rank: 2 },
        rush: { rank: 1 },
        propImpact: { rb: "FADE rush — elite front." },
        bettingAngles: [],
      },
    },
    recentStats: [
      { player: "James Cook", opponent: "PHI", week: 2, rushYds: 88, receptions: 3 },
    ],
  });
  assert.equal(card.opponent, "PHI");
  assert.equal(card.defenseTier, "ELITE");
  assert.match(card.cardBlock, /FADE rush/);
  assert.match(card.cardBlock, /H2H note:|Recent vs PHI/);
});

test("buildNflGoatBriefcase is safe no-op when NFL_BDL_PRIMARY off", async () => {
  assert.equal(isNflBdlPrimaryEnabled(), false);
  const briefcase = await buildNflGoatBriefcase({ week: 1, season: 2026 });
  assert.equal(briefcase.primarySource, "action_network");
  assert.deepEqual(briefcase.league.teamDefense, {});
  assert.match(String(briefcase.coverage?.note || ""), /primary off|key missing/i);
});
