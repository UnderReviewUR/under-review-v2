/**

 * Mock player-market KV for UR Take regression (Phase B/C).

 */



import { WC_GOLDEN_BOOT_SEED_ROWS } from "../src/data/wc2026GoldenBootSeed.js";

import { WC_PLAYER_SEED } from "../src/data/wc2026PlayerSeed.js";

import { WC_MATCH_PLAYER_PROPS_SEED_BY_EVENT } from "../src/data/wc2026MatchPlayerPropsSeed.js";



const nowMs = Date.now();



/** @type {Record<string, { abbr: string, players: Array<Record<string, unknown>> }>} */

const teams = {};

for (const row of WC_PLAYER_SEED) {

  const abbr = row.nationAbbr;

  if (!teams[abbr]) teams[abbr] = { abbr, players: [] };

  teams[abbr].players.push({

    espnAthleteId: null,

    name: row.name,

    position: row.position || null,

    nationAbbr: abbr,

    isStarterLikely: false,

    goalsTournament: 0,

    assistsTournament: 0,

    injuryStatus: null,

    lastSeenEventId: null,

  });

}



const MATCH_EVENT_ID = "760416";

const seedEvent = WC_MATCH_PLAYER_PROPS_SEED_BY_EVENT[MATCH_EVENT_ID];



export const MOCK_WC_MATCH_PLAYER_PROPS_EVENT = {

  eventId: MATCH_EVENT_ID,

  homeTeam: seedEvent.homeTeam,

  awayTeam: seedEvent.awayTeam,

  lastUpdated: nowMs,

  source: "seed",

  booksUsed: ["seed"],

  stale: false,

  freshness: { isStale: false, ageText: "just now" },

  markets: seedEvent.markets,

};



export const MOCK_WC_PLAYER_MARKET_KV = {

  goldenBoot: {

    lastUpdated: nowMs,

    market: "golden_boot",

    source: "consensus+seed",

    booksUsed: ["seed"],

    stale: false,

    rows: WC_GOLDEN_BOOT_SEED_ROWS.map((r) => ({

      ...r,

      bookOdds: { seed: r.americanOdds },

    })),

  },

  players: {

    lastUpdated: nowMs,

    source: "static",

    teams,

  },

  injuries: {

    lastUpdated: nowMs,

    source: "empty",

    rows: [],

    starsOut: [],

  },

  matchPlayerProps: null,

  wcEventId: null,

};



/** Confirmed XI match detail for verified-tier tests. */

export const MOCK_WC_MATCH_DETAIL_VERIFIED = {

  id: MATCH_EVENT_ID,

  homeTeam: "BRA",

  awayTeam: "FRA",

  lineupConfirmed: true,

  lineups: {

    home: {

      starters: [

        { name: "Alisson" },

        { name: "Marquinhos" },

        { name: "Vinícius Júnior" },

      ],

    },

    away: {

      starters: [

        { name: "Hugo Lloris" },

        { name: "Kylian Mbappé" },

        { name: "Antoine Griezmann" },

      ],

    },

  },

  players: {

    home: [{ name: "Vinícius Júnior" }, { name: "Rodrygo" }],

    away: [{ name: "Kylian Mbappé" }, { name: "Ousmane Dembélé" }],

  },

};



/**

 * Minimal wcContext with player KV for tests.

 */

export function mockWcContextWithPlayerMarkets(overrides = {}) {

  const wcEventId =

    overrides.wcEventId !== undefined ? overrides.wcEventId : null;

  const useMatchProps = wcEventId === MATCH_EVENT_ID;

  const kv = {

    ...MOCK_WC_PLAYER_MARKET_KV,

    wcEventId: useMatchProps ? MATCH_EVENT_ID : null,

    matchPlayerProps: useMatchProps ? MOCK_WC_MATCH_PLAYER_PROPS_EVENT : null,

  };



  const matchDetails =

    overrides.matchDetails !== undefined

      ? overrides.matchDetails

      : useMatchProps

        ? [MOCK_WC_MATCH_DETAIL_VERIFIED]

        : [];



  return {

    dataConfidence: useMatchProps ? "confirmed" : "pre_match_estimate",

    matchDetails,

    playerMarketKv: overrides.playerMarketKv || kv,

    playerMarketTier: overrides.playerMarketTier || "market_only",

    wcIntent: overrides.wcIntent || "TOP_SCORER",

    wcEventId: useMatchProps ? MATCH_EVENT_ID : null,

    ...overrides,

    matchDetails,

  };

}


