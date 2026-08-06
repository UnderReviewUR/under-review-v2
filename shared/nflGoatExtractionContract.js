/**
 * NFL GOAT extraction contract — what UR Take + board must receive so Ask
 * can be expert on the markets fans actually bet.
 *
 * Ultra-easy idea: one weekly "briefcase" of facts. If a field is empty,
 * Ask still answers — it just says what was missing. Prefer live > static.
 */

/** @typedef {'core'|'props'|'futures'|'sgp'|'live'} NflBetBucket */

/**
 * Top markets by recreational + handle relevance (US books / SGP mix).
 * Rank is advisory for coverage priority, not a hard UI order.
 *
 * @type {readonly Array<{
 *   id: string,
 *   rank: number,
 *   label: string,
 *   bucket: NflBetBucket,
 *   bdlPropTypes?: string[],
 *   bdlEndpoints: string[],
 *   askMustCover: string,
 * }>}
 */
export const NFL_TOP_25_BET_MARKETS = Object.freeze([
  {
    id: "spread",
    rank: 1,
    label: "Point spread",
    bucket: "core",
    bdlEndpoints: ["odds", "games"],
    askMustCover: "Side, number, why the number is right/wrong (script, injuries, rest).",
  },
  {
    id: "total",
    rank: 2,
    label: "Game total (O/U)",
    bucket: "core",
    bdlEndpoints: ["odds", "games"],
    askMustCover: "Pace, weather, injuries to offense/defense, implied scoring.",
  },
  {
    id: "moneyline",
    rank: 3,
    label: "Moneyline",
    bucket: "core",
    bdlEndpoints: ["odds", "games"],
    askMustCover: "When ML > spread (dog/underdog value), not just favorite loyalty.",
  },
  {
    id: "anytime_td",
    rank: 4,
    label: "Anytime touchdown",
    bucket: "props",
    bdlPropTypes: ["anytime_td"],
    bdlEndpoints: ["odds/player_props", "stats", "player_injuries"],
    askMustCover: "Red-zone role, goal-line carries, volatility — never lock language.",
  },
  {
    id: "pass_yds",
    rank: 5,
    label: "Passing yards",
    bucket: "props",
    bdlPropTypes: ["passing_yards"],
    bdlEndpoints: ["odds/player_props", "stats", "advanced_stats/passing"],
    askMustCover: "Pressure, secondary, game script, weather; cite line + books when present.",
  },
  {
    id: "rush_yds",
    rank: 6,
    label: "Rushing yards",
    bucket: "props",
    bdlPropTypes: ["rushing_yards"],
    bdlEndpoints: ["odds/player_props", "stats", "advanced_stats/rushing", "teams/.../roster"],
    askMustCover: "Carry share, committee, opponent rush defense, script.",
  },
  {
    id: "rec_yds",
    rank: 7,
    label: "Receiving yards",
    bucket: "props",
    bdlPropTypes: ["receiving_yards"],
    bdlEndpoints: ["odds/player_props", "stats", "advanced_stats/receiving"],
    askMustCover: "Targets, aDOT/role, coverage matchup, QB health.",
  },
  {
    id: "receptions",
    rank: 8,
    label: "Receptions",
    bucket: "props",
    bdlPropTypes: ["receptions"],
    bdlEndpoints: ["odds/player_props", "stats"],
    askMustCover: "Target volume / slot vs outside; check-down scripts.",
  },
  {
    id: "pass_tds",
    rank: 9,
    label: "Passing touchdowns",
    bucket: "props",
    bdlPropTypes: ["passing_tds"],
    bdlEndpoints: ["odds/player_props", "stats"],
    askMustCover: "Red-zone rate + opponent RZ defense; lumpy vs yards.",
  },
  {
    id: "first_td",
    rank: 10,
    label: "First touchdown scorer",
    bucket: "props",
    bdlPropTypes: ["first_td"],
    bdlEndpoints: ["odds/player_props"],
    askMustCover: "Opening-drive tendency + RZ roles; higher variance than anytime.",
  },
  {
    id: "sgp",
    rank: 11,
    label: "Same-game parlay (correlated legs)",
    bucket: "sgp",
    bdlEndpoints: ["odds", "odds/player_props"],
    askMustCover: "Call out correlation (pass yards + WR yards); don't stack fake independence.",
  },
  {
    id: "team_total",
    rank: 12,
    label: "Team total",
    bucket: "core",
    bdlEndpoints: ["odds", "games"],
    askMustCover: "One-sided scoring thesis when full-game total is muddy.",
  },
  {
    id: "alt_spread_total",
    rank: 13,
    label: "Alternate spread / alternate total",
    bucket: "core",
    bdlEndpoints: ["odds"],
    askMustCover: "Price the juiced number honestly; when alt is lottery vs value.",
  },
  {
    id: "1h_spread_total",
    rank: 14,
    label: "1st half spread / total",
    bucket: "core",
    bdlPropTypes: ["passing_yards_1h", "anytime_td_1h"],
    bdlEndpoints: ["odds", "odds/player_props"],
    askMustCover: "Script before adjustments; coaching half tendencies when known.",
  },
  {
    id: "rush_rec_yds",
    rank: 15,
    label: "Rush + receiving yards",
    bucket: "props",
    bdlPropTypes: ["rushing_receiving_yards"],
    bdlEndpoints: ["odds/player_props", "stats"],
    askMustCover: "Dual-threat RBs/WRs; safer volume than pure rush in some scripts.",
  },
  {
    id: "completions_attempts",
    rank: 16,
    label: "Completions / attempts",
    bucket: "props",
    bdlPropTypes: ["passing_completions", "passing_attempts"],
    bdlEndpoints: ["odds/player_props", "stats"],
    askMustCover: "Pace + pass rate over raw talent.",
  },
  {
    id: "longest_play",
    rank: 17,
    label: "Longest rush / reception / pass",
    bucket: "props",
    bdlPropTypes: ["longest_rush", "longest_reception", "longest_pass"],
    bdlEndpoints: ["odds/player_props"],
    askMustCover: "Explosive play rate; high variance — speculative framing.",
  },
  {
    id: "interceptions",
    rank: 18,
    label: "Interceptions thrown",
    bucket: "props",
    bdlPropTypes: ["interceptions"],
    bdlEndpoints: ["odds/player_props", "stats"],
    askMustCover: "Pressure + aggression; rare events — don't overclaim.",
  },
  {
    id: "kicking",
    rank: 19,
    label: "Kicking points / FGs made",
    bucket: "props",
    bdlPropTypes: ["kicking_points", "fg_made"],
    bdlEndpoints: ["odds/player_props"],
    askMustCover: "Total environment + red-zone TD vs FG profile.",
  },
  {
    id: "live_in_game",
    rank: 20,
    label: "Live / in-play markets",
    bucket: "live",
    bdlEndpoints: ["games", "odds", "odds/player_props", "stats"],
    askMustCover: "Score/state first; stale props get yanked — say if board thinned.",
  },
  {
    id: "season_win_total",
    rank: 21,
    label: "Season team win total",
    bucket: "futures",
    bdlEndpoints: ["standings", "team_season_stats"],
    askMustCover: "Predictor winTotal + schedule; remaining vs preseason number.",
  },
  {
    id: "sb_outright",
    rank: 22,
    label: "Super Bowl / conference winner",
    bucket: "futures",
    bdlEndpoints: ["standings", "games"],
    askMustCover: "Path + market price; don't invent odds not in payload.",
  },
  {
    id: "award_futures",
    rank: 23,
    label: "MVP / OROY / DROY / awards",
    bucket: "futures",
    bdlEndpoints: ["season_stats", "stats"],
    askMustCover: "Narrative + counting stats; speculative unless prices injected.",
  },
  {
    id: "defense_st",
    rank: 24,
    label: "Defense / ST props (sacks, INT, etc.)",
    bucket: "props",
    bdlEndpoints: ["odds/player_props", "stats", "team_stats"],
    askMustCover: "Opportunity + opponent OL/QB; thinner markets.",
  },
  {
    id: "method_exact",
    rank: 25,
    label: "Method of victory / exotic results",
    bucket: "core",
    bdlEndpoints: ["odds", "games"],
    askMustCover: "Lottery markets — pass or speculative only unless asked.",
  },
]);

/**
 * Fields that must be fillable on the weekly briefcase (GOAT day-1).
 * `requiredForElite` = we measure coverage; empty is OK early but logged.
 */
export const NFL_GOAT_CONTRACT_FIELDS = Object.freeze([
  { key: "slate.games", requiredForElite: true, source: "games", note: "This week’s matchups + status" },
  { key: "slate.odds", requiredForElite: true, source: "odds", note: "Spread / ML / total by book" },
  { key: "slate.playerProps", requiredForElite: true, source: "odds/player_props", note: "Cross-position props" },
  { key: "league.injuries", requiredForElite: true, source: "player_injuries", note: "Before any lean" },
  { key: "league.rosters", requiredForElite: true, source: "teams/{id}/roster", note: "Depth / roles" },
  { key: "players.recentStats", requiredForElite: true, source: "stats", note: "L5 / recent games" },
  { key: "players.seasonStats", requiredForElite: true, source: "season_stats", note: "Season baselines" },
  {
    key: "players.advanced",
    requiredForElite: false,
    source: "advanced_stats/*",
    note: "Support only — never the whole thesis",
  },
  {
    key: "slate.openingOdds",
    requiredForElite: false,
    source: "odds/opening",
    note: "Line-move / CLV phase 2",
  },
  {
    key: "live.plays",
    requiredForElite: false,
    source: "plays",
    note: "In-game only when asked",
  },
]);

/**
 * Clean prefer-rules for Ask (not silence rules).
 */
export const NFL_ASK_PREFER_RULES = Object.freeze({
  /** Prefer live board props/odds when present; still answer if missing. */
  preferLiveMarkets: true,
  /** Prefer injuries/roster before role claims; if missing, say so and continue. */
  preferInjuryDepth: true,
  /** Prefer recent/season stats for usage; advanced is optional support. */
  preferStatsOverAdvanced: true,
  /** Never refuse a bet type in the top-25 list for “lack of perfect data.” */
  neverRefuseTop25ForThinData: true,
  /** Static May season O/Us only when live props absent. */
  staticSeasonPropsAreFallbackOnly: true,
});

/**
 * Empty briefcase skeleton for board + UR Take injection.
 * @param {{ week?: number|null, season?: number|null, asOf?: string|null, primarySource?: string }} [meta]
 */
export function createEmptyNflGoatBriefcase(meta = {}) {
  return {
    version: 1,
    asOf: meta.asOf || null,
    week: meta.week ?? null,
    season: meta.season ?? null,
    primarySource: meta.primarySource || "pending",
    fallbackSource: "action_network",
    slate: {
      games: [],
      odds: [],
      playerProps: [],
      openingOdds: [],
    },
    league: {
      injuries: [],
      rostersByTeam: {},
      standings: [],
    },
    players: {
      recentStats: [],
      seasonStats: [],
      advanced: { passing: [], rushing: [], receiving: [] },
    },
    live: {
      playsByGameId: {},
    },
    coverage: {
      /** @type {Record<string, boolean>} */
      fields: Object.fromEntries(NFL_GOAT_CONTRACT_FIELDS.map((f) => [f.key, false])),
      top25Supported: NFL_TOP_25_BET_MARKETS.map((m) => m.id),
    },
  };
}

/**
 * Mark which contract fields have data (for audits / logging).
 * @param {ReturnType<typeof createEmptyNflGoatBriefcase>} briefcase
 */
export function auditNflGoatBriefcaseCoverage(briefcase) {
  const b = briefcase || createEmptyNflGoatBriefcase();
  const fields = {
    "slate.games": Array.isArray(b.slate?.games) && b.slate.games.length > 0,
    "slate.odds": Array.isArray(b.slate?.odds) && b.slate.odds.length > 0,
    "slate.playerProps": Array.isArray(b.slate?.playerProps) && b.slate.playerProps.length > 0,
    "league.injuries": Array.isArray(b.league?.injuries) && b.league.injuries.length > 0,
    "league.rosters":
      b.league?.rostersByTeam && Object.keys(b.league.rostersByTeam).length > 0,
    "players.recentStats": Array.isArray(b.players?.recentStats) && b.players.recentStats.length > 0,
    "players.seasonStats": Array.isArray(b.players?.seasonStats) && b.players.seasonStats.length > 0,
    "players.advanced":
      (b.players?.advanced?.passing?.length || 0) +
        (b.players?.advanced?.rushing?.length || 0) +
        (b.players?.advanced?.receiving?.length || 0) >
      0,
    "slate.openingOdds": Array.isArray(b.slate?.openingOdds) && b.slate.openingOdds.length > 0,
    "live.plays":
      b.live?.playsByGameId && Object.keys(b.live.playsByGameId).length > 0,
  };

  const required = NFL_GOAT_CONTRACT_FIELDS.filter((f) => f.requiredForElite);
  const requiredHit = required.filter((f) => fields[f.key]).length;
  return {
    fields,
    requiredHit,
    requiredTotal: required.length,
    requiredPct: required.length ? Math.round((requiredHit / required.length) * 100) : 0,
    eliteReady: required.every((f) => fields[f.key]),
  };
}

/**
 * Prompt block: expert on top markets without thinning answers.
 */
export function buildNflTop25ExpertisePromptBlock() {
  const lines = NFL_TOP_25_BET_MARKETS.map(
    (m) => `${m.rank}. ${m.label} — ${m.askMustCover}`,
  );
  return `NFL TOP-25 MARKET EXPERTISE (fan volume + SGP reality)
You are expected to advise confidently on these bet types. Missing a live line is not a reason to refuse — state what is missing in one short clause, then still give the structural lean.

${lines.join("\n")}

PREFER RULES (clean — do not undercut knowledge):
- Prefer live board odds/props in the payload when present; if absent, use structural knowledge + any season/static props and say "live line not in payload."
- Prefer injury/roster/depth before firm role claims; if absent, continue with historical role + uncertainty tag — do not stonewall.
- Prefer recent/season stats for usage; advanced metrics are support only (one clause max).
- Same-game parlays: name correlation risk when stacking related legs.
- Anytime / first TD: never "lock/safe/automatic."
- Futures (win totals, SB, awards): use injected prices only; otherwise qualitative pathing.`;
}
