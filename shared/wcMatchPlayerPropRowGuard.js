/**
 * Match player prop row guard — block golf bleed and HTML parser junk.
 */

import { normalizeWcPlayerName } from "./wcPlayerRegistry.js";
import {
  isCrossSportGolferName,
  isGoldenBootParserJunkName,
} from "./wcGoldenBootRowGuard.js";

/**
 * @param {string} name
 */
export function isMatchPlayerPropParserJunkName(name) {
  return isGoldenBootParserJunkName(name);
}

/**
 * @param {Array<{ name?: string, americanOdds?: string, nationAbbr?: string }>} rows
 */
export function filterMatchPlayerPropScrapeRows(rows) {
  return (rows || []).filter((row) => {
    const name = normalizeWcPlayerName(String(row?.name || ""));
    if (!name || isCrossSportGolferName(name) || isMatchPlayerPropParserJunkName(name)) {
      return false;
    }
    if (!row?.americanOdds) return false;
    return true;
  });
}

/**
 * @param {Record<string, Array<Record<string, unknown>>>} markets
 */
export function filterMatchPlayerPropMarkets(markets) {
  if (!markets || typeof markets !== "object") return createEmptyFilteredMarkets();
  /** @type {Record<string, Array<Record<string, unknown>>>} */
  const out = {};
  for (const [key, rows] of Object.entries(markets)) {
    out[key] = filterMatchPlayerPropScrapeRows(rows);
  }
  return out;
}

function createEmptyFilteredMarkets() {
  return {};
}
