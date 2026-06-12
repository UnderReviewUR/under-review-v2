/**
 * BallDontLie GOAT ingest health — catch silent drops (raw rows vs normalized KV).
 */

import { BDL_PROP_TO_MARKET, BDL_PROP_TYPES_NOT_YET_MAPPED } from "../api/_wcBdlNormalize.js";
import { WC_MATCH_PLAYER_PROP_MARKET_KEYS } from "./wcMatchPlayerProps.js";

/** All prop_type values documented for FIFA player_props. */
export const BDL_FIFA_DOCUMENTED_PROP_TYPES = [
  "anytime_goal",
  "assists",
  "card",
  "first_goal",
  "goal_or_assist",
  "last_goal",
  "red_card",
  "saves",
  "shot_each_half",
  "shot_on_target_each_half",
  "shots",
  "shots_on_target",
  "tackles",
];

/**
 * @param {Record<string, Array<Record<string, unknown>>>} markets
 */
function countNormalizedPropRows(markets) {
  if (!markets || typeof markets !== "object") return 0;
  return WC_MATCH_PLAYER_PROP_MARKET_KEYS.reduce(
    (n, key) => n + (Array.isArray(markets[key]) ? markets[key].length : 0),
    0,
  );
}

/**
 * Compare raw BDL player_props rows to normalized markets — flags join gaps and unmapped types.
 * @param {Array<Record<string, unknown>>} rows
 * @param {Record<string, Array<Record<string, unknown>>>} markets
 * @param {Record<string, { name: string, nationAbbr?: string | null }>} [playerLookup]
 */
export function auditBdlPlayerPropsIngest(rows, markets, playerLookup = {}) {
  const raw = Array.isArray(rows) ? rows : [];
  /** @type {Record<string, number>} */
  const rawPropTypes = {};
  /** @type {Record<string, number>} */
  const unmappedPropTypes = {};
  let missingPlayerLookup = 0;
  let mappedRowCount = 0;

  for (const row of raw) {
    const propType = String(row.prop_type || "unknown");
    rawPropTypes[propType] = (rawPropTypes[propType] || 0) + 1;

    const marketKey = BDL_PROP_TO_MARKET[propType];
    if (!marketKey) {
      unmappedPropTypes[propType] = (unmappedPropTypes[propType] || 0) + 1;
      continue;
    }
    mappedRowCount += 1;

    const inlineName = String(
      row.player?.name || row.player?.short_name || "",
    ).trim();
    const lookupHit =
      row.player_id != null ? playerLookup[String(row.player_id)]?.name : null;
    if (!inlineName && !lookupHit) missingPlayerLookup += 1;
  }

  const normalizedCount = countNormalizedPropRows(markets);
  /** @type {string[]} */
  const warnings = [];

  if (raw.length > 0 && normalizedCount === 0) {
    warnings.push("normalized_zero");
  }
  if (missingPlayerLookup > 0) {
    warnings.push(`missing_player_lookup:${missingPlayerLookup}`);
  }
  const unmappedKeys = Object.keys(unmappedPropTypes);
  if (unmappedKeys.length) {
    warnings.push(`unmapped_prop_types:${unmappedKeys.join(",")}`);
  }
  const undocumented = Object.keys(rawPropTypes).filter(
    (t) => !BDL_FIFA_DOCUMENTED_PROP_TYPES.includes(t) && t !== "unknown",
  );
  if (undocumented.length) {
    warnings.push(`undocumented_prop_types:${undocumented.join(",")}`);
  }

  const intentionalUnmapped = unmappedKeys.filter((t) =>
    BDL_PROP_TYPES_NOT_YET_MAPPED.includes(t),
  );

  return {
    rawCount: raw.length,
    mappedRowCount,
    normalizedCount,
    missingPlayerLookup,
    lookupSize: Object.keys(playerLookup).length,
    rawPropTypes,
    unmappedPropTypes,
    intentionalUnmappedPropTypes: intentionalUnmapped,
    healthy:
      raw.length === 0
        ? true
        : normalizedCount > 0 && missingPlayerLookup === 0,
    warnings,
  };
}
