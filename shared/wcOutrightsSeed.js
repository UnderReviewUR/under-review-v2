/**
 * Cold-start tournament winner outrights from static team draw data.
 * Used when ESPN/Odds API KV is empty — enables Market +XXX delta lines locally and in prod.
 */

import { WC_2026_TEAMS } from "../src/data/wc2026Teams.js";

/**
 * @param {number} [nowMs]
 */
export function buildWcOutrightsSeedMap(nowMs = Date.now()) {
  /** @type {Record<string, string>} */
  const outrights = {};
  for (const t of WC_2026_TEAMS) {
    const abbr = String(t.abbreviation || "").trim().toUpperCase();
    const odds = String(t.outrightOdds || "").trim();
    if (abbr && /^\+\d+/.test(odds)) outrights[abbr] = odds;
  }
  return outrights;
}

/**
 * @param {number} [nowMs]
 */
export function buildWcOutrightsSeedPayload(nowMs = Date.now()) {
  const outrights = buildWcOutrightsSeedMap(nowMs);
  return {
    outrights,
    lastUpdated: nowMs,
    source: "static_seed",
    seeded: true,
  };
}
