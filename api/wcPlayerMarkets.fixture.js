/**
 * Mock player-market KV for UR Take regression (Phase B).
 */

import { WC_GOLDEN_BOOT_SEED_ROWS } from "../src/data/wc2026GoldenBootSeed.js";
import { WC_PLAYER_SEED } from "../src/data/wc2026PlayerSeed.js";

const nowMs = 1_700_000_000_000;

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
};

/**
 * Minimal wcContext with player KV for tests.
 */
export function mockWcContextWithPlayerMarkets(overrides = {}) {
  return {
    dataConfidence: "pre_match_estimate",
    matchDetails: [],
    playerMarketKv: MOCK_WC_PLAYER_MARKET_KV,
    playerMarketTier: "market_only",
    wcIntent: overrides.wcIntent || "TOP_SCORER",
    ...overrides,
  };
}
