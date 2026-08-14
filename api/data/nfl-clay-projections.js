/**
 * Mike Clay–style volume priors for NFL Ask (not a fantasy rankings feed).
 * Fields map to prop baselines: pass/rush/rec volume + TD rates.
 *
 * Refresh path:
 * - Cron: GET /api/nfl-clay-refresh (weekly)
 * - Operator ingest: npm run ingest:nfl-clay -- path/to/clay.json
 * - Optional remote: set NFL_CLAY_PROJECTIONS_URL to a JSON blob you control
 */
export const NFL_CLAY_INJURY_RULE =
  "If a player is expected to miss games, scale season volume by expected games / 17 before comparing to a full-season O/U. Never treat a partial-season Clay pace as a healthy-season total.";

/** @typedef {{
 *  pos?: string,
 *  team?: string,
 *  passYds?: number,
 *  passTd?: number,
 *  rushYds?: number,
 *  rushTd?: number,
 *  rushAtt?: number,
 *  rec?: number,
 *  recYds?: number,
 *  recTd?: number,
 *  targets?: number,
 *  note?: string
 * }} NflClayPlayerProjection */

/** @type {{
 *  asOf: string,
 *  source: string,
 *  sourceLabel: string,
 *  injuryRule: string,
 *  players: Record<string, NflClayPlayerProjection>
 * }} */
export const NFL_CLAY_PROJECTIONS_SEED = {
  asOf: "2026-05-15",
  source: "seed",
  sourceLabel:
    "Internal role/volume prior (seed — replace via ingest/cron; never cite in user answers)",
  injuryRule: NFL_CLAY_INJURY_RULE,
  players: {
    "Josh Allen": {
      pos: "QB",
      team: "BUF",
      passYds: 3800,
      passTd: 28,
      rushYds: 520,
      rushTd: 8,
      note: "Dual-threat prior — rush volume is the prop separator vs pocket QBs",
    },
    "Patrick Mahomes": {
      pos: "QB",
      team: "KC",
      passYds: 4050,
      passTd: 32,
      rushYds: 280,
      rushTd: 2,
      note: "High pass volume; weapons drive TD rate more than rush",
    },
    "Lamar Jackson": {
      pos: "QB",
      team: "BAL",
      passYds: 3650,
      passTd: 26,
      rushYds: 780,
      rushTd: 5,
      note: "Rush yards/TDs are primary prop engines; pass volume mid-tier",
    },
    "Joe Burrow": {
      pos: "QB",
      team: "CIN",
      passYds: 3925,
      passTd: 31,
      rushYds: 140,
      rushTd: 2,
      note: "Pocket volume QB1 band when healthy",
    },
    "Jalen Hurts": {
      pos: "QB",
      team: "PHI",
      passYds: 3525,
      passTd: 25,
      rushYds: 550,
      rushTd: 12,
      note: "Rush TD equity > pure pass volume",
    },
    "Drake Maye": {
      pos: "QB",
      team: "NE",
      passYds: 4125,
      passTd: 30,
      rushYds: 350,
      rushTd: 4,
      note: "Efficiency + volume both priced aggressively for Year 2",
    },
    "James Cook": {
      pos: "RB",
      team: "BUF",
      rushAtt: 280,
      rushYds: 1400,
      rushTd: 10,
      rec: 45,
      recYds: 380,
      targets: 58,
      note: "Workhorse rush volume; receiving is secondary",
    },
    "Saquon Barkley": {
      pos: "RB",
      team: "PHI",
      rushAtt: 300,
      rushYds: 1450,
      rushTd: 11,
      rec: 40,
      recYds: 320,
      targets: 52,
      note: "Early-down + explosive profile; watch committee noise",
    },
    "Bijan Robinson": {
      pos: "RB",
      team: "ATL",
      rushAtt: 270,
      rushYds: 1350,
      rushTd: 9,
      rec: 55,
      recYds: 480,
      targets: 72,
      note: "Three-down volume; receptions matter for prop floors",
    },
    "Ja'Marr Chase": {
      pos: "WR",
      team: "CIN",
      targets: 160,
      rec: 105,
      recYds: 1450,
      recTd: 11,
      note: "WR1 target share with Burrow; yards + TD dual path",
    },
    "CeeDee Lamb": {
      pos: "WR",
      team: "DAL",
      targets: 155,
      rec: 100,
      recYds: 1380,
      recTd: 9,
      note: "Volume WR1; TD rate more volatile than targets",
    },
    "Justin Jefferson": {
      pos: "WR",
      team: "MIN",
      targets: 150,
      rec: 98,
      recYds: 1400,
      recTd: 8,
      note: "Elite efficiency + target floor",
    },
    "Amon-Ra St. Brown": {
      pos: "WR",
      team: "DET",
      targets: 145,
      rec: 105,
      recYds: 1250,
      recTd: 9,
      note: "Slot volume / catch rate drive reception props",
    },
    "Travis Kelce": {
      pos: "TE",
      team: "KC",
      targets: 120,
      rec: 85,
      recYds: 950,
      recTd: 7,
      note: "TE1 target share; age/usage watch for midseason cuts",
    },
    "George Kittle": {
      pos: "TE",
      team: "SF",
      targets: 100,
      rec: 75,
      recYds: 900,
      recTd: 6,
      note: "Efficiency TE; volume below Kelce band",
    },
  },
};
