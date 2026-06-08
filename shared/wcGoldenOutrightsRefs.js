/**
 * Golden eval + prompt examples — outright lines aligned to readWcOutrightsFromKv seed fallback.
 * Live KV overrides seed in prod; tests/fixtures track static_seed until ESPN/Odds API fills KV.
 */

import { buildWcOutrightsSeedMap } from "./wcOutrightsSeed.js";

const seed = buildWcOutrightsSeedMap();

/**
 * @param {string} abbr
 */
export function wcSeedOutrightFor(abbr) {
  return seed[String(abbr || "").trim().toUpperCase()] || null;
}

/** Spain cold-start tournament winner line from wc2026Teams.js */
export const WC_GOLDEN_ESP_OUTRIGHT = wcSeedOutrightFor("ESP");

/** Norway cold-start tournament winner line */
export const WC_GOLDEN_NOR_OUTRIGHT = wcSeedOutrightFor("NOR");

/**
 * @param {string} abbr
 * @param {string} [fallback]
 */
export function wcGoldenMarketLabel(abbr, fallback = "+10000") {
  return wcSeedOutrightFor(abbr) || fallback;
}
