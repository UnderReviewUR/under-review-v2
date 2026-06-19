/**
 * WC turn planner — lane and data-package constants.
 */

/** @typedef {import("./wcUrTakeIntent.js").WcUrTakeIntent} WcUrTakeIntent */

/**
 * Delivery lane — maps 1:1 to an execution arm in handler / fast-path modules.
 * @readonly
 */
export const WC_TURN_LANE = {
  RULES_LLM: "rules_llm",
  GROUP_SLATE: "group_slate",
  RUNNER_UP_FOLLOWUP: "runner_up_followup",
  PROPS_FAST: "props_fast",
  PROPS_CLAUDE: "props_claude",
  LIVE_IN_PLAY: "live_in_play",
  LIVE_BET_TIMING: "live_bet_timing",
  LIVE_MATCH_WINNER: "live_match_winner",
  MATCHUP_PREBUILT: "matchup_prebuilt",
  MATCHUP_ALT_FOLLOWUP: "matchup_alt_followup",
  MATCHUP_ML_REPEAT: "matchup_ml_repeat",
  PLAYER_MARKET_STRUCTURED: "player_market_structured",
  LLM_THREAD: "llm_thread",
  LLM_FULL: "llm_full",
  LLM_LITE: "llm_lite",
};

/**
 * Context/data slices the handler should load for this turn.
 * @readonly
 */
export const WC_DATA_PACKAGE = {
  MATCHES: "matches",
  MATCH_DETAIL: "match_detail",
  FIXTURE_ODDS: "fixture_odds",
  PLAYER_PROPS_KV: "player_props_kv",
  TOURNAMENT_SIM: "tournament_sim",
  GROUP_MISPRICE: "group_misprice",
  BDL_FUTURES: "bdl_futures",
  GOLDEN_BOOT: "golden_boot",
  GROUNDING_PACKET: "grounding_packet",
  PRIOR_STRUCTURED: "prior_structured",
  STATIC_RULES: "static_rules",
  LIVE_INTEL: "live_intel",
};

/** Lanes that bypass Claude when downstream guards agree. */
export const WC_TURN_FAST_PATH_LANES = new Set([
  WC_TURN_LANE.PROPS_FAST,
  WC_TURN_LANE.GROUP_SLATE,
  WC_TURN_LANE.RUNNER_UP_FOLLOWUP,
  WC_TURN_LANE.LIVE_IN_PLAY,
  WC_TURN_LANE.LIVE_BET_TIMING,
  WC_TURN_LANE.LIVE_MATCH_WINNER,
  WC_TURN_LANE.MATCHUP_PREBUILT,
  WC_TURN_LANE.MATCHUP_ALT_FOLLOWUP,
  WC_TURN_LANE.MATCHUP_ML_REPEAT,
  WC_TURN_LANE.PLAYER_MARKET_STRUCTURED,
]);

/**
 * @typedef {object} WcTurnPlan
 * @property {string} lane
 * @property {WcUrTakeIntent} intent
 * @property {string | null} pinnedEventId
 * @property {string | null} pinnedHome
 * @property {string | null} pinnedAway
 * @property {string | null} pinMethod
 * @property {Record<string, unknown> | null} priorLean
 * @property {string[]} dataPackages
 * @property {boolean} shouldUseFastPath
 * @property {boolean} useLiteContext
 * @property {"High"|"Medium"|"Speculative"} confidence
 * @property {string} reason
 * @property {boolean} isConversationFollowUp
 * @property {string | null} propsAskShape
 * @property {boolean} propsRouteV2Apply
 * @property {string | null} priorLaneHint
 */
