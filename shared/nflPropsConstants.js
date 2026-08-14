/** Action Network REST (same public aggregator as NBA props). */
export const NFL_PROPS_API_BASE = "https://api.actionnetwork.com/web/v2";

/** DraftKings, FanDuel, BetMGM — consensus priority order. */
export const NFL_PROPS_BOOK_IDS = [15, 30, 79];

export const NFL_PROPS_BOOK_IDS_QUERY = NFL_PROPS_BOOK_IDS.join(",");

/** @type {Record<number, string>} */
export const NFL_PROPS_BOOK_LABELS = {
  15: "DraftKings",
  30: "FanDuel",
  79: "BetMGM",
};

/**
 * @param {number | null | undefined} bookId
 */
export function nflPropsBookLabel(bookId) {
  const id = Number(bookId);
  if (Number.isFinite(id) && NFL_PROPS_BOOK_LABELS[id]) return NFL_PROPS_BOOK_LABELS[id];
  return "Consensus";
}

/**
 * Known Action Network market key → short wire id (UI chips).
 * Unknown `core_bet_type_N_*` keys still ingest via resolveNflPropsWireMarket.
 */
export const NFL_PROPS_MARKET_TYPE_MAP = {
  core_bet_type_9_passing_yards: "pass_yds",
  core_bet_type_11_passing_tds: "pass_tds",
  core_bet_type_12_rushing_yards: "rush_yds",
  core_bet_type_15_receptions: "receptions",
  core_bet_type_16_receiving_yards: "rec_yds",
  core_bet_type_62_anytime_touchdown_scorer: "anytime_td",
  core_bet_type_66_rushing_receiving_yards: "rush_rec_yds",
};

/**
 * Map AN `core_bet_type_N_snake_name` (or known alias) → wire market id.
 * Unknown keys still pass through so the board does not drop thin props.
 * @param {string} marketKey
 * @returns {string | null}
 */
export function resolveNflPropsWireMarket(marketKey) {
  const key = String(marketKey || "").trim();
  if (!key) return null;
  if (NFL_PROPS_MARKET_TYPE_MAP[key]) return NFL_PROPS_MARKET_TYPE_MAP[key];
  const m = key.match(/^core_bet_type_\d+_(.+)$/i);
  if (m) {
    let wire = m[1].toLowerCase().replace(/_scorer$/, "");
    if (wire === "anytime_touchdown") wire = "anytime_td";
    if (wire === "first_touchdown") wire = "first_td";
    if (wire === "passing_yards") wire = "pass_yds";
    if (wire === "passing_tds") wire = "pass_tds";
    if (wire === "rushing_yards") wire = "rush_yds";
    if (wire === "receiving_yards") wire = "rec_yds";
    if (wire === "rushing_receiving_yards") wire = "rush_rec_yds";
    if (wire.length >= 2 && wire.length <= 48) return wire;
  }
  return null;
}

/** Markets requested on scoreboard/markets directory (when used). */
export const NFL_PROPS_CORE_PICK_TYPES = [
  "core_bet_type_9_passing_yards",
  "core_bet_type_11_passing_tds",
  "core_bet_type_12_rushing_yards",
  "core_bet_type_15_receptions",
  "core_bet_type_16_receiving_yards",
  "core_bet_type_62_anytime_touchdown_scorer",
].join(",");

/** Headline markets used for board chips / default UI. */
export const NFL_PROPS_WIRE_MARKETS = [
  "pass_yds",
  "pass_tds",
  "rush_yds",
  "receptions",
  "rec_yds",
  "anytime_td",
  "rush_rec_yds",
];

/** @type {Record<string, string>} */
export const NFL_PROPS_MARKET_LABELS = {
  pass_yds: "pass yards",
  pass_tds: "pass TDs",
  rush_yds: "rush yards",
  receptions: "receptions",
  rec_yds: "rec yards",
  anytime_td: "anytime TD",
  rush_rec_yds: "rush+rec yards",
  targets: "targets",
  drops: "drops",
  rush_attempts: "rush attempts",
  rush_tds: "rush TDs",
  rec_tds: "rec TDs",
  pass_completions: "completions",
  pass_ints: "INTs thrown",
  sacks: "sacks",
  tackles: "tackles",
  solo_tackles: "solo tackles",
  assisted_tackles: "assisted tackles",
  tfl: "tackles for loss",
  qb_hits: "QB hits",
  forced_fumbles: "forced fumbles",
  fumbles: "fumbles",
  fumbles_lost: "fumbles lost",
  def_ints: "def INTs",
  passes_defended: "passes defended",
  first_td: "first TD",
  longest_reception: "longest reception",
  longest_rush: "longest rush",
  kicking_points: "kicking points",
  fg_made: "FGs made",
};

/**
 * @param {number | string} gameId
 */
export function nflPropsCacheKey(gameId) {
  return `nfl_props_${String(gameId).trim()}_v1`;
}

/**
 * @param {string} dateYmd YYYYMMDD or week key
 */
export function nflBoardCacheKey(dateOrWeekKey) {
  return `nfl_board_${String(dateOrWeekKey).trim()}_v1`;
}
