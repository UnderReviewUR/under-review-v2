/**
 * Offline estimate: stringify(buildNbaContextForModel(mock)) before vs after slim shapes.
 * Run: node scripts/measure-nba-context-slim.mjs
 */
import { buildNbaContextForModel } from "../api/ur-take.js";

function makeFatPlayer(i) {
  return {
    playerId: 1000 + i,
    name: `Player ${i} Name`,
    team: i % 2 ? "BOS" : "NYK",
    position: "G",
    pts: 20,
    reb: 5,
    ast: 4,
    stl: 1,
    blk: 0,
    pf: 2,
    min: "32.5",
    fg_pct: 0.45,
    fg3_pct: 0.38,
    ft_pct: 0.9,
    games_played: 70,
    season: 2025,
    source: "season_average",
    statsNote: "note",
    tonightGame: "BOS @ NYK",
    recentGames: Array.from({ length: 5 }, (_, j) => ({
      date: "2025-05-0" + j,
      matchup: "BOS @ NYK",
      pts: 18 + j,
      reb: 4,
      ast: 3,
    })),
    praSeason: 29,
    praRecent: 28,
    /* attachPraFieldsToPlayerRow-style input keys (slim maps these to pra_recent_low / pra_recent_high on output) */
    praFloor: 20,
    praCeiling: 40,
    ptsRecent: 20,
    ptsFloor: 10,
    ptsCeiling: 30,
    rebRecent: 5,
    rebFloor: 2,
    rebCeiling: 9,
    astRecent: 4,
    astFloor: 2,
    astCeiling: 8,
  };
}

const fatCtx = {
  todaysGames: [
    {
      awayTeam: { abbr: "BOS", name: "Celtics", score: 100 },
      homeTeam: { abbr: "NYK", name: "Knicks", score: 98 },
      startTimeUtc: new Date().toISOString(),
      state: "in",
    },
  ],
  playoffSeries: Array.from({ length: 8 }, (_, i) => ({
    away: "AAA",
    home: "BBB",
    round: "West",
    homeWins: 2,
    awayWins: 2,
    status: "In progress",
    completedGamesCombinedPoints: Array.from({ length: 12 }, (_, k) => ({
      combinedPoints: 210 + k,
      awayScore: 105,
      homeScore: 105,
      startTimeUtc: "2025-05-01",
    })),
    completedGamesCombinedPointsAverage: 215,
  })),
  playerStats: Array.from({ length: 120 }, (_, i) => makeFatPlayer(i)),
  injuries: [],
  rosterGrounding: { playersByTeamAbbrev: {} },
  propLines: [],
  gameTotals: {},
  bdlGrounding: {},
  bdlAvailability: {},
  urTakeParsing: { note: "x".repeat(4000) },
  propFeedMeta: { x: "y".repeat(2000) },
  liveEdgeAlerts: [{ msg: "z".repeat(1500) }],
  playoffPathGrounding: { paths: "w".repeat(3000) },
};

const matchup = { awayAbbr: "BOS", homeAbbr: "NYK" };

const clone = JSON.parse(JSON.stringify(fatCtx));
const naivePrettyLen = JSON.stringify(clone, null, 2).length;
const naiveCompactLen = JSON.stringify(clone).length;
const forModel = buildNbaContextForModel(JSON.parse(JSON.stringify(fatCtx)), matchup);
const modelLen = JSON.stringify(forModel).length;
const modelPrettyLen = JSON.stringify(forModel, null, 2).length;

console.log(
  JSON.stringify({
    event: "nba_context_measure_mock",
    naiveCompactChars: naiveCompactLen,
    naivePrettyChars: naivePrettyLen,
    modelJsonCharsCompact: modelLen,
    modelJsonCharsPretty: modelPrettyLen,
    reductionVsPrettyPct: Math.round(100 * (1 - modelLen / naivePrettyLen)),
    reductionVsCompactPct: Math.round(100 * (1 - modelLen / naiveCompactLen)),
  }),
);
