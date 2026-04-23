/**
 * Canonical home-screen event contract.
 * All home modules must derive from {@link buildHomeEventPipeline}; no independent validity/time rules.
 */

/** @typedef {'upcoming'|'active'} PipelineEventState */

export const PIPELINE_STATE = Object.freeze({
  UPCOMING: "upcoming",
  ACTIVE: "active",
});

/**
 * @typedef {object} NormalizedHomeEvent
 * @property {string} sport — nba|mlb|tennis|f1|golf|nfl
 * @property {string} league
 * @property {string} event_id — canonical dedup id (same key family as homeEventDedup)
 * @property {number|null} start_time_utc — unix ms
 * @property {number|null} end_time_utc — unix ms; exclusion if <= now when set
 * @property {string} display_time_local — formatted once in the pipeline (user-local)
 * @property {PipelineEventState} state
 * @property {boolean} is_live
 * @property {number} priority_score — higher = earlier in priority list
 * @property {string} data_source — e.g. balldontlie, odds_api, atp_board, espn, etc.
 * @property {string} matchup_label — "AWAY @ HOME" style
 * @property {boolean} [is_nba_playoff]
 * @property {object} [raw] — optional pointer to raw feed row (client only; omitted on server)
 */

export function emptyPipelineResult() {
  return {
    events: [],
    nbaGamesForHome: [],
    mlbGamesForHome: [],
    tennisMatchesForHome: [],
    golfVisibleOnHome: false,
    liveSnapshotKeys: [],
    meta: {
      hasAtpFromOdds: false,
      nbaPlayoffContext: false,
    },
  };
}
