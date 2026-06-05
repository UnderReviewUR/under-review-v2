/** FIFA World Cup 2026 — player registry, Golden Boot, injuries KV contracts. */



export const WC_PLAYERS_KV_KEY = "wc2026_players";

export const WC_GOLDEN_BOOT_KV_KEY = "wc2026_golden_boot";

export const WC_INJURIES_KV_KEY = "wc2026_injuries";

export const WC_MATCH_PLAYER_PROPS_KV_KEY = "wc2026_match_player_props";

export const WC_PLAYER_MARKETS_OVERRIDE_KV_KEY = "wc2026_player_markets_override";



/** 24h KV TTL — full tournament index. */

export const WC_PLAYERS_TTL_SECONDS = 24 * 3600;



/** 6h KV TTL — Golden Boot / top scorer outrights. */

export const WC_GOLDEN_BOOT_TTL_SECONDS = 6 * 3600;



/** 2h KV TTL — aggregated injury board during tournament. */

export const WC_INJURIES_TTL_SECONDS = 2 * 3600;



/** 12h KV TTL — per-event match player props index (`byEventId`). */

export const WC_MATCH_PLAYER_PROPS_TTL_SECONDS = 12 * 3600;



/** 7d TTL — manual breaking / odds / injury overrides. */

export const WC_PLAYER_MARKETS_OVERRIDE_TTL_SECONDS = 7 * 24 * 3600;



/** UR Take + API freshness gate (Golden Boot). */

export const WC_GOLDEN_BOOT_MAX_AGE_MS = 6 * 60 * 60 * 1000;



/** UR Take verified tier for match-scoped anytime scorer lines (ramp/live). */

export const WC_MATCH_PLAYER_PROPS_MAX_AGE_MS = 2 * 60 * 60 * 1000;



/** Cron: full player registry rollup. */

export const WC_PLAYERS_SCRAPE_INTERVAL_MS = 12 * 60 * 60 * 1000;



/** Cron: Golden Boot odds (4–6h target). */

export const WC_GOLDEN_BOOT_SCRAPE_INTERVAL_MS = 4 * 60 * 60 * 1000;



/** Cron: injuries aggregator. */

export const WC_INJURIES_SCRAPE_INTERVAL_MS = 2 * 60 * 60 * 1000;



/**

 * @typedef {"verified" | "market_only" | "squad" | "thin"} WcPlayerMarketTier

 */



/**

 * @typedef {object} WcGoldenBootRow

 * @property {string} name

 * @property {string} americanOdds

 * @property {string} [nationAbbr]

 * @property {string} [espnAthleteId]

 * @property {number} [impliedRank]

 */



/**

 * @typedef {object} WcRegistryPlayer

 * @property {string | null} espnAthleteId

 * @property {string} name

 * @property {string | null} position

 * @property {string} nationAbbr

 * @property {boolean} isStarterLikely

 * @property {number} goalsTournament

 * @property {number} assistsTournament

 * @property {string | null} injuryStatus

 * @property {string | null} lastSeenEventId

 */


