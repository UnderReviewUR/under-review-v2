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

/** Action Network market key → wire market name. */
export const NFL_PROPS_MARKET_TYPE_MAP = {
  core_bet_type_9_passing_yards: "pass_yds",
  core_bet_type_11_passing_tds: "pass_tds",
  core_bet_type_12_rushing_yards: "rush_yds",
  core_bet_type_15_receptions: "receptions",
  core_bet_type_16_receiving_yards: "rec_yds",
  core_bet_type_62_anytime_touchdown_scorer: "anytime_td",
  core_bet_type_66_rushing_receiving_yards: "rush_rec_yds",
};

/** Markets requested on scoreboard/markets directory (when used). */
export const NFL_PROPS_CORE_PICK_TYPES = [
  "core_bet_type_9_passing_yards",
  "core_bet_type_11_passing_tds",
  "core_bet_type_12_rushing_yards",
  "core_bet_type_15_receptions",
  "core_bet_type_16_receiving_yards",
  "core_bet_type_62_anytime_touchdown_scorer",
].join(",");

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
