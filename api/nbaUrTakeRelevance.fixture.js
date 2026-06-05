/**

 * NBA Finals 2026 — regression thread (Knicks vs Spurs).

 */



/** @typedef {{ question: string, expectedEntities: string[], expectedIntent: string, forbiddenEntities: string[], scenario?: string, expectPropsFresh?: boolean, expectGameTotal?: boolean, expectFinalsMode?: boolean, expectVerdict?: string, expectFollowUpChip?: RegExp }} NbaRelevanceFixtureTurn */



/** @type {NbaRelevanceFixtureTurn[]} */

export const NBA_FINALS_RELEVANCE_REGRESSION_TURNS = [

  {

    scenario: "pregame_game1",

    question:

      "NBA Finals Game 1 tonight (SAS @ NYK): what is the sharpest angle — spread, total, or key prop — and what one thing flips the read?",

    expectedEntities: ["SAS", "NYK"],

    expectedIntent: "PREGAME_MATCHUP",

    forbiddenEntities: ["LAL", "OKC", "BOS"],

    expectFinalsMode: true,

  },

  {

    scenario: "live_q2_props",

    question:

      "We're in Q2 of Knicks vs Spurs — what's the best live angle on Brunson points props right now?",

    expectedEntities: ["NYK", "SAS"],

    expectedIntent: "LIVE_IN_GAME",

    forbiddenEntities: ["LAL", "OKC"],

    expectPropsFresh: true,

    expectGameTotal: true,

    expectFinalsMode: true,

    expectVerdict: "LIVE_IN_GAME",

  },

  {

    scenario: "live_followup_turn3",

    question: "Score just updated — same game, what's the live lean now?",

    expectedEntities: [],

    expectedIntent: "LIVE_IN_GAME",

    forbiddenEntities: [],

    expectFinalsMode: true,

    expectVerdict: "LIVE_IN_GAME",

    expectFollowUpChip: /live lean/i,

  },

  {

    scenario: "live_thread_edge_followup",

    question: "What kills this edge on Brunson points overs?",

    expectedEntities: [],

    expectedIntent: "LIVE_IN_GAME",

    forbiddenEntities: [],

    expectFinalsMode: true,

    expectVerdict: "LIVE_IN_GAME",

    expectFollowUpChip: /kills this/i,

  },

  {

    scenario: "who_wins_series",

    question: "Who wins the series?",

    expectedEntities: [],

    expectedIntent: "SERIES_WINNER",

    forbiddenEntities: ["LAL", "OKC"],

    expectFinalsMode: true,

    expectVerdict: "SERIES",

  },

  {

    scenario: "series_winner_misprice",

    question: "Are the Knicks mispriced at +180 to win the NBA Finals series?",

    expectedEntities: ["NYK"],

    expectedIntent: "SERIES_WINNER",

    forbiddenEntities: ["SAS", "LAL"],

    expectFinalsMode: true,

    expectVerdict: "HAS_EDGE",

    expectFollowUpChip: /kills this edge/i,

  },

  {

    scenario: "finals_mvp",

    question: "Finals MVP value on Wembanyama — is he mispriced at +220?",

    expectedEntities: ["SAS"],

    expectedIntent: "FINALS_MVP",

    forbiddenEntities: ["NYK", "LAL"],

    expectFinalsMode: true,

  },

  {

    scenario: "game_3_preview",

    question: "Game 3 preview — who has the edge?",

    expectedEntities: [],

    expectedIntent: "PREGAME_MATCHUP",

    forbiddenEntities: ["LAL", "OKC"],

    expectFinalsMode: true,

    expectVerdict: "MATCHUP",

  },

];


