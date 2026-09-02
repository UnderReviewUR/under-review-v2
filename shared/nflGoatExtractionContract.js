/**
 * NFL GOAT extraction contract — what UR Take + board must receive so Ask
 * can be expert on the markets fans actually bet.
 *
 * Ultra-easy idea: one weekly "briefcase" of facts. If a field is empty,
 * Ask still answers — it just says what was missing. Prefer live > static.
 */

import { nflAskGradeExemptPockets } from "./nflAskComposeRule.js";

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
    bdlPropTypes: [
      "sacks",
      "tackles",
      "solo_tackles",
      "assisted_tackles",
      "interceptions",
      "forced_fumbles",
      "fumbles",
      "fumbles_lost",
    ],
    bdlEndpoints: ["odds/player_props", "stats", "team_stats"],
    askMustCover: "Opportunity + opponent OL/QB; thinner markets — speculative if no line.",
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
 * Extended player-prop catalog beyond the top-25 headline list.
 * `posting`: how often major US books usually post the market.
 * @type {readonly Array<{ id: string, label: string, propTypes: string[], posting: 'common'|'sometimes'|'rare', group: string }>}
 */
export const NFL_EXTENDED_PROP_CATALOG = Object.freeze([
  // Offense volume
  { id: "targets", label: "Targets", propTypes: ["targets", "receiving_targets"], posting: "sometimes", group: "pass_catcher" },
  { id: "drops", label: "Drops", propTypes: ["drops"], posting: "rare", group: "pass_catcher" },
  { id: "rush_attempts", label: "Rush attempts", propTypes: ["rushing_attempts"], posting: "common", group: "rusher" },
  { id: "rush_tds", label: "Rushing TDs", propTypes: ["rushing_tds"], posting: "sometimes", group: "rusher" },
  { id: "rec_tds", label: "Receiving TDs", propTypes: ["receiving_tds"], posting: "sometimes", group: "pass_catcher" },
  // QB volume extras (completions/attempts already in top 25)
  { id: "pass_ints", label: "Interceptions thrown", propTypes: ["interceptions"], posting: "common", group: "qb" },
  // Ball security
  { id: "fumbles", label: "Fumbles", propTypes: ["fumbles"], posting: "rare", group: "ball_security" },
  { id: "fumbles_lost", label: "Fumbles lost", propTypes: ["fumbles_lost"], posting: "rare", group: "ball_security" },
  // Defense
  { id: "sacks", label: "Sacks", propTypes: ["sacks", "defensive_sacks"], posting: "common", group: "defense" },
  { id: "half_sacks", label: "Half sacks / sack fractions", propTypes: ["sacks", "half_sacks"], posting: "rare", group: "defense" },
  { id: "tackles", label: "Tackles (total)", propTypes: ["tackles", "total_tackles"], posting: "common", group: "defense" },
  { id: "solo_tackles", label: "Solo tackles", propTypes: ["solo_tackles"], posting: "sometimes", group: "defense" },
  { id: "assisted_tackles", label: "Assisted tackles", propTypes: ["assisted_tackles", "assist_tackles"], posting: "sometimes", group: "defense" },
  { id: "tfl", label: "Tackles for loss", propTypes: ["tackles_for_loss"], posting: "rare", group: "defense" },
  { id: "qb_hits", label: "QB hits", propTypes: ["qb_hits"], posting: "rare", group: "defense" },
  { id: "forced_fumbles", label: "Forced fumbles", propTypes: ["forced_fumbles"], posting: "sometimes", group: "defense" },
  { id: "def_ints", label: "Defensive interceptions", propTypes: ["defensive_interceptions", "interceptions"], posting: "sometimes", group: "defense" },
  { id: "passes_defended", label: "Passes defended", propTypes: ["passes_defended"], posting: "rare", group: "defense" },
]);

/**
 * Briefcase pockets — how the suitcase stays organized.
 * Every Ask turn only needs the pockets relevant to the question.
 */
export const NFL_BRIEFCASE_POCKETS = Object.freeze([
  {
    id: "matchups",
    path: "slate.games",
    label: "Matchups",
    alwaysLoad: true,
    note: "Who plays whom, when, status",
  },
  {
    id: "game_prices",
    path: "slate.odds",
    label: "Game prices",
    alwaysLoad: true,
    note: "Spread / ML / total",
  },
  {
    id: "player_prices",
    path: "slate.playerProps",
    label: "Player prices",
    alwaysLoad: true,
    note: "All posted props for the slate (offense + defense)",
  },
  {
    id: "availability",
    path: "league.injuries",
    label: "Availability",
    alwaysLoad: true,
    note: "Injuries before role claims",
  },
  {
    id: "roles",
    path: "league.rosters",
    label: "Roles / depth",
    alwaysLoad: true,
    note: "Who is QB1 / RB1 / nickel, etc.",
  },
  {
    id: "form",
    path: "players.recentStats",
    label: "Recent form",
    alwaysLoad: false,
    note: "Load when a player or prop is named",
  },
  {
    id: "season_baselines",
    path: "players.seasonStats",
    label: "Season baselines",
    alwaysLoad: false,
    note: "Load when a player or prop is named",
  },
  {
    id: "advanced",
    path: "players.advanced",
    label: "Advanced support",
    alwaysLoad: false,
    note: "Optional seasoning only",
  },
  {
    id: "openers",
    path: "slate.openingOdds",
    label: "Opening lines",
    alwaysLoad: false,
    note: "Line-move questions",
  },
  {
    id: "live_tape",
    path: "live.plays",
    label: "Live tape",
    alwaysLoad: false,
    note: "In-game only",
  },
]);

/**
 * Fields that must be fillable on the weekly briefcase (GOAT day-1).
 * `requiredForElite` = we measure coverage; empty is OK early but logged.
 */
export const NFL_GOAT_CONTRACT_FIELDS = Object.freeze([
  { key: "slate.games", requiredForElite: true, source: "games", note: "This week’s matchups + status", pocket: "matchups" },
  { key: "slate.odds", requiredForElite: true, source: "odds", note: "Spread / ML / total by book", pocket: "game_prices" },
  { key: "slate.playerProps", requiredForElite: true, source: "odds/player_props", note: "Cross-position props", pocket: "player_prices" },
  { key: "league.injuries", requiredForElite: true, source: "player_injuries", note: "Before any lean", pocket: "availability" },
  { key: "league.rosters", requiredForElite: true, source: "teams/{id}/roster", note: "Depth / roles", pocket: "roles" },
  { key: "players.recentStats", requiredForElite: true, source: "stats", note: "L5 / recent games", pocket: "form" },
  { key: "players.seasonStats", requiredForElite: true, source: "season_stats", note: "Season baselines", pocket: "season_baselines" },
  {
    key: "players.advanced",
    requiredForElite: false,
    source: "advanced_stats/*",
    note: "Support only — never the whole thesis",
    pocket: "advanced",
  },
  {
    key: "slate.openingOdds",
    requiredForElite: false,
    source: "odds/opening",
    note: "Line-move / CLV phase 2",
    pocket: "openers",
  },
  {
    key: "live.plays",
    requiredForElite: false,
    source: "plays",
    note: "In-game only when asked",
    pocket: "live_tape",
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
      teams: [],
      activePlayers: [],
      teamStats: [],
      /** Live defense map from BDL team_season_stats when NFL_BDL_PRIMARY=1 */
      teamDefense: {},
      defenseSource: null,
    },
    players: {
      recentStats: [],
      seasonStats: [],
      advanced: { passing: [], rushing: [], receiving: [] },
    },
    dfs: {
      slates: [],
      draftables: [],
    },
    fantasy: {
      scoringFormats: [],
      projections: [],
      weeklyStats: [],
      rankings: [],
      adp: [],
    },
    live: {
      playsByGameId: {},
    },
    coverage: {
      /** @type {Record<string, boolean>} */
      fields: Object.fromEntries(NFL_GOAT_CONTRACT_FIELDS.map((f) => [f.key, false])),
      top25Supported: NFL_TOP_25_BET_MARKETS.map((m) => m.id),
      extendedPropIds: NFL_EXTENDED_PROP_CATALOG.map((p) => p.id),
    },
  };
}

/**
 * @param {ReturnType<typeof createEmptyNflGoatBriefcase>} briefcase
 */
function fieldPresenceMap(briefcase) {
  const b = briefcase || createEmptyNflGoatBriefcase();
  return {
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
}

/**
 * Mark which contract fields have data (for audits / logging).
 * @param {ReturnType<typeof createEmptyNflGoatBriefcase>} briefcase
 */
export function auditNflGoatBriefcaseCoverage(briefcase) {
  const fields = fieldPresenceMap(briefcase);
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
 * Infer which market family the user is asking about.
 * @param {string} question
 * @returns {{ marketId: string, label: string, neededPaths: string[], propTypeHints: string[] }}
 */
export function detectNflAskMarket(question) {
  const q = String(question || "").toLowerCase();
  /** @type {Array<{ id: string, label: string, re: RegExp, paths: string[], props?: string[] }>} */
  const rules = [
    // SGP first so "SGP + pass yards" does not collapse to a single prop lane.
    { id: "sgp", label: "Same-game parlay", re: /\bsgp\b|\bsame[-\s]?game\s+parlay\b|\bparlay\b/, paths: ["slate.odds", "slate.playerProps", "league.injuries"], props: [] },
    { id: "targets", label: "Targets", re: /\btargets?\b/, paths: ["slate.playerProps", "players.recentStats", "league.injuries"], props: ["targets"] },
    { id: "drops", label: "Drops", re: /\bdrops?\b/, paths: ["slate.playerProps", "players.recentStats"], props: ["drops"] },
    { id: "sacks", label: "Sacks", re: /\b(?:half[-\s]?sacks?|sacks?)\b/, paths: ["slate.playerProps", "players.recentStats", "league.injuries"], props: ["sacks"] },
    { id: "tackles", label: "Tackles", re: /\b(?:solo\s+)?tackles?\b|\btfl\b/, paths: ["slate.playerProps", "players.recentStats"], props: ["tackles", "solo_tackles"] },
    { id: "forced_fumbles", label: "Forced fumbles", re: /\bforced\s+fumbles?\b/, paths: ["slate.playerProps", "players.recentStats"], props: ["forced_fumbles"] },
    { id: "fumbles", label: "Fumbles", re: /\bfumbles?(?:\s+lost)?\b/, paths: ["slate.playerProps", "players.recentStats"], props: ["fumbles", "fumbles_lost"] },
    { id: "pass_ints", label: "INTs thrown", re: /\b(?:ints?|interceptions?)\s+thrown\b|\bthrow(?:s|ing)?\s+(?:an?\s+)?int/, paths: ["slate.playerProps", "players.recentStats", "slate.odds"], props: ["interceptions", "pass_ints"] },
    { id: "def_ints", label: "Defensive INTs", re: /\bdefensive\s+interceptions?\b|\bpicks?\b|\binterceptions?\b/, paths: ["slate.playerProps", "players.recentStats"], props: ["defensive_interceptions", "def_ints", "interceptions"] },
    { id: "anytime_td", label: "Anytime TD", re: /\banytime\s+td\b|\btouchdown\s+scorer\b|\bto\s+score\b/, paths: ["slate.playerProps", "league.injuries", "league.rosters", "players.recentStats"], props: ["anytime_td"] },
    // Passing TDs before pass yards so "passing TDs" does not fall through to general → yards.
    { id: "pass_tds", label: "Passing touchdowns", re: /\bpass(?:ing)?\s+(?:tds?|touchdowns?)\b|\bpassing\s+td\b/, paths: ["slate.playerProps", "league.injuries", "players.recentStats", "slate.odds"], props: ["passing_tds", "pass_tds"] },
    { id: "rush_tds", label: "Rushing touchdowns", re: /\brush(?:ing)?\s+(?:tds?|touchdowns?)\b/, paths: ["slate.playerProps", "league.injuries", "players.recentStats"], props: ["rushing_tds", "rush_tds"] },
    { id: "rec_tds", label: "Receiving touchdowns", re: /\breceiv(?:ing)?\s+(?:tds?|touchdowns?)\b|\brec\s+(?:tds?|touchdowns?)\b/, paths: ["slate.playerProps", "league.injuries", "players.recentStats"], props: ["receiving_tds", "rec_tds"] },
    { id: "pass_yds", label: "Passing yards", re: /\bpass(?:ing)?\s+yards?\b/, paths: ["slate.playerProps", "league.injuries", "players.recentStats", "slate.odds"], props: ["passing_yards"] },
    { id: "rush_yds", label: "Rushing yards", re: /\brush(?:ing)?\s+yards?\b/, paths: ["slate.playerProps", "league.injuries", "league.rosters", "players.recentStats"], props: ["rushing_yards"] },
    { id: "rec_yds", label: "Receiving yards", re: /\breceiv(?:ing|er)?\s+yards?\b|\brec\s+yards?\b|\breceiving\b/, paths: ["slate.playerProps", "league.injuries", "players.recentStats"], props: ["receiving_yards"] },
    { id: "receptions", label: "Receptions", re: /\breceptions?\b|\brec(?:eptions)?\b(?!\s+yards?\b)/, paths: ["slate.playerProps", "players.recentStats"], props: ["receptions"] },
    { id: "spread", label: "Spread", re: /\bspread\b|\bats\b|\bcover\b|\b(?:the\s+)?(?:dog|favorite|fav)\b|\bpick'?em\b/, paths: ["slate.odds", "slate.games", "league.injuries"], props: [] },
    // Game totals: prefer explicit total/o/u, or over/under with a 2-digit line (avoids 1.5 prop lines).
    { id: "total", label: "Game total", re: /\b(?:game\s+)?total\b|\bover\/under\b|\bo\/u\b|(?:\bover|\bunder)\s+(?:the\s+)?(?:total\s+)?\d{2}(?:\.\d)?\b/, paths: ["slate.odds", "slate.games", "league.injuries"], props: [] },
    { id: "moneyline", label: "Moneyline", re: /\bmoneyline\b|\bml\b/, paths: ["slate.odds", "slate.games", "league.injuries"], props: [] },
  ];

  for (const rule of rules) {
    if (rule.re.test(q)) {
      return {
        marketId: rule.id,
        label: rule.label,
        neededPaths: rule.paths,
        propTypeHints: rule.props || [],
      };
    }
  }

  // Opinion / lean / prediction — games + injuries; do not require player props.
  if (
    /\b(lean|fade|play|hammer|love|hate|prediction|predict|who\s+wins?\b|who\s+do\s+you\s+(like|take)|give\s+me\s+a\s+(lean|play)|what'?s?\s+your\s+(lean|take))\b/.test(
      q,
    )
  ) {
    return {
      marketId: "opinion",
      label: "Opinion / lean",
      neededPaths: ["slate.games", "league.injuries"],
      propTypeHints: [],
    };
  }

  return {
    marketId: "general",
    label: "General NFL",
    neededPaths: ["slate.games", "league.injuries"],
    propTypeHints: [],
  };
}

/**
 * Count props in briefcase matching type hints (loose).
 * @param {ReturnType<typeof createEmptyNflGoatBriefcase>} briefcase
 * @param {string[]} propTypeHints
 */
export function countBriefcasePropsMatching(briefcase, propTypeHints) {
  const hints = (propTypeHints || []).map((h) => String(h).toLowerCase().replace(/\s+/g, "_"));
  if (!hints.length) return { matched: 0, sampleTypes: [] };
  const rows = Array.isArray(briefcase?.slate?.playerProps) ? briefcase.slate.playerProps : [];
  /** @type {Set<string>} */
  const sample = new Set();
  let matched = 0;
  for (const row of rows) {
    const raw = String(row.propRaw || row.prop_type || row.prop || "")
      .toLowerCase()
      .replace(/\s+/g, "_");
    if (hints.some((h) => raw.includes(h) || h.includes(raw))) {
      matched += 1;
      if (raw) sample.add(raw);
    }
  }
  return { matched, sampleTypes: [...sample].slice(0, 8) };
}

/**
 * Per-interaction suitcase health — are the right pockets filled for THIS question?
 * Smooth ops = alwaysLoad pockets full weekly + needed paths present for the ask.
 *
 * @param {ReturnType<typeof createEmptyNflGoatBriefcase>} briefcase
 * @param {string} [question]
 */
export function evaluateBriefcaseForInteraction(briefcase, question = "") {
  const audit = auditNflGoatBriefcaseCoverage(briefcase);
  const detected = detectNflAskMarket(question);
  const presence = audit.fields;
  const missingNeeded = detected.neededPaths.filter((p) => !presence[p]);
  const propMatch = countBriefcasePropsMatching(briefcase, detected.propTypeHints);

  const alwaysPaths = NFL_BRIEFCASE_POCKETS.filter((p) => p.alwaysLoad).map((p) => p.path);
  const alwaysMissing = alwaysPaths.filter((p) => !presence[p]);

  const noLiveProp = Boolean(detected.propTypeHints.length && propMatch.matched === 0);
  const priced =
    detected.propTypeHints.length > 0 ||
    detected.marketId === "spread" ||
    detected.marketId === "total" ||
    detected.marketId === "moneyline" ||
    detected.marketId === "sgp";
  const isGamePriceAsk = Boolean(priced && detected.propTypeHints.length === 0);
  const isOpinionAsk =
    detected.marketId === "general" || detected.marketId === "opinion";
  const exempt = nflAskGradeExemptPockets(detected);
  const alwaysMissingForGrade = alwaysMissing.filter((p) => !exempt.has(p));
  const missingNeededForGrade = missingNeeded.filter((p) => !exempt.has(p));

  let grade = "green";
  if (alwaysMissingForGrade.length || missingNeededForGrade.length >= 2) grade = "red";
  else if (
    missingNeededForGrade.length === 1 ||
    (detected.propTypeHints.length && propMatch.matched === 0)
  )
    grade = "yellow";

  const corePriceMissing = missingNeededForGrade.some(
    (p) => p === "slate.odds" || p === "slate.games" || p === "slate.playerProps",
  );
  const forcePass = Boolean(
    priced && (noLiveProp || (detected.propTypeHints.length === 0 && corePriceMissing)),
  );

  let guidance;
  if (forcePass) {
    guidance =
      "Priced market missing — close with PASS. Do not invent a number. Structural notes only.";
  } else if (isGamePriceAsk) {
    guidance =
      "Game prices are posted. Empty player-prop or roster pockets do not force PASS. Lean the posted spread/total or pass on script — never invent a prop number.";
  } else if (isOpinionAsk) {
    guidance =
      "Opinion / lean ask — answer a side or script lean. Empty player props do not force PASS. Do not invent a posted number.";
  } else if (grade === "green") {
    guidance = "Suitcase organized for this ask — prefer live pockets, answer fully.";
  } else if (grade === "yellow") {
    guidance = "One pocket thin — answer with a gap clause; cap conviction at Medium.";
  } else {
    guidance = "Core pockets empty — structural notes only; do not invent a posted number.";
  }

  return {
    grade,
    /** Smooth enough to answer without stalling */
    smooth: grade !== "red",
    detected,
    missingNeeded,
    alwaysMissing,
    propMatch,
    forcePass,
    noLiveProp,
    eliteReady: audit.eliteReady,
    requiredPct: audit.requiredPct,
    guidance,
  };
}

/**
 * Weekly prop-mix audit: which catalog markets appear in the suitcase.
 * @param {ReturnType<typeof createEmptyNflGoatBriefcase>} briefcase
 */
export function auditBriefcasePropCatalogCoverage(briefcase) {
  const rows = Array.isArray(briefcase?.slate?.playerProps) ? briefcase.slate.playerProps : [];
  /** @type {Map<string, number>} */
  const byType = new Map();
  for (const row of rows) {
    const raw = String(row.propRaw || row.prop_type || row.prop || "")
      .toLowerCase()
      .replace(/\s+/g, "_");
    if (!raw) continue;
    byType.set(raw, (byType.get(raw) || 0) + 1);
  }
  const postedTypes = [...byType.keys()];
  const catalog = NFL_EXTENDED_PROP_CATALOG.map((p) => {
    const hit = p.propTypes.some((t) =>
      postedTypes.some((pt) => pt.includes(t) || t.includes(pt)),
    );
    return { id: p.id, label: p.label, posting: p.posting, present: hit };
  });
  const present = catalog.filter((c) => c.present).length;
  return {
    totalPropRows: rows.length,
    distinctPropTypes: postedTypes.length,
    sampleTypes: postedTypes.slice(0, 24),
    extendedPresent: present,
    extendedTotal: catalog.length,
    extendedPct: catalog.length ? Math.round((present / catalog.length) * 100) : 0,
    catalog,
  };
}

/**
 * Prompt block: expert on top markets without thinning answers.
 */
export function buildNflTop25ExpertisePromptBlock() {
  const lines = NFL_TOP_25_BET_MARKETS.map(
    (m) => `${m.rank}. ${m.label} — ${m.askMustCover}`,
  );
  const extended = NFL_EXTENDED_PROP_CATALOG.map(
    (p) => `- ${p.label} (${p.posting})`,
  ).join("\n");
  return `NFL TOP-25 MARKET EXPERTISE (fan volume + SGP reality)
You are expected to advise confidently on these bet types. Missing a live line is not a reason to refuse — state what is missing in one short clause, then still give the structural lean.

${lines.join("\n")}

EXTENDED PLAYER PROPS (also in scope when asked — books post unevenly):
${extended}
For rare/thin props (drops, half-sacks, PD, etc.): if no live line, still give a role/opportunity read and mark it speculative — never invent a number.

PREFER RULES (clean — do not undercut knowledge):
- Prefer live board odds/props in the payload when present; if absent, use structural knowledge + any season/static props and say "live line not in payload."
- Prefer injury/roster/depth before firm role claims; if absent, continue with historical role + uncertainty tag — do not stonewall.
- Prefer recent/season stats for usage; advanced metrics are support only (one clause max).
- Same-game parlays: name correlation risk when stacking related legs.
- Anytime / first TD: never "lock/safe/automatic."
- Futures (win totals, SB, awards): use injected prices only; otherwise qualitative pathing.`;
}
