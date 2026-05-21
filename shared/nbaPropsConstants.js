/** Action Network REST (public odds aggregator). */
export const NBA_PROPS_API_BASE = "https://api.actionnetwork.com/web/v2";

/** DraftKings, FanDuel, BetMGM — consensus priority order. */
export const NBA_PROPS_BOOK_IDS = [15, 30, 79];

export const NBA_PROPS_BOOK_IDS_QUERY = NBA_PROPS_BOOK_IDS.join(",");

/** @type {Record<string, "points" | "rebounds" | "assists">} */
export const NBA_PROPS_MARKET_TYPE_MAP = {
  core_bet_type_27_points: "points",
  core_bet_type_28_rebounds: "rebounds",
  core_bet_type_29_assists: "assists",
  core_bet_type_23_rebounds: "rebounds",
  core_bet_type_26_assists: "assists",
};

export const NBA_PROPS_CORE_PICK_TYPES = [
  "core_bet_type_27_points",
  "core_bet_type_23_rebounds",
  "core_bet_type_26_assists",
].join(",");

/**
 * @param {number | string} gameId
 */
export function nbaPropsCacheKey(gameId) {
  return `nba_props_${String(gameId).trim()}_v1`;
}
