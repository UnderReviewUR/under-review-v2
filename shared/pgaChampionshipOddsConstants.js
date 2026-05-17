/** PGA Championship official site GraphQL (powers pgachampionship.com/odds). */
export const PGA_CHAMPIONSHIP_ODDS_PAGE_URL = "https://www.pgachampionship.com/odds";

export const PGA_CHAMPIONSHIP_GRAPHQL_BASE =
  "https://www.pgachampionship.com/graphql/delivery/pga/v4/scoring";

export const PGA_CHAMPIONSHIP_ODDS_IDS = {
  eventOdds: "event-00000173-3422-d5ad-a7fb-3c7ead7b0000-event-odds",
  eventOddsLastUpdate: "event-00000173-3422-d5ad-a7fb-3c7ead7b0000-event-odds-last-update",
  staticLeaderboardAssets:
    "event-00000173-3422-d5ad-a7fb-3c7ead7b0000-static-leaderboard-assets",
};

export const PGA_CHAMPIONSHIP_PERSISTED_HASH = {
  EventOdds: "f905de1a997e94cbe9e84b01c366f66febe7058299b6a4fa3fdb442351b62c2a",
  LastUpdate: "326e1c458a6f1b546ae0e7c10bcc8d596a2b35ecad02dfaf55283c66d5c3f597",
  StaticLeaderboardAssets:
    "95a82c9c8791b13d0529972f1f318f4950351276f01d40b6ed2ed631e93de9ab",
};

/** Durable KV / in-memory cache key for scraped PGA Championship odds. */
export const PGA_CHAMPIONSHIP_ODDS_CACHE_KEY = "golf_pga_championship_odds_v1";
