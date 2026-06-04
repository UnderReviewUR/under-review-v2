/**
 * Roll tournament goals/assists from wc_match_detail rows into player registry.
 */

import {
  createEmptyPlayerRegistry,
  seedRegistryFromStaticList,
  upsertRegistryFromMatchDetail,
} from "./wcPlayerRegistry.js";

/**
 * @param {Array<Record<string, unknown>>} matchDetails
 * @param {number} [nowMs]
 */
export function buildRegistryFromMatchDetails(matchDetails, nowMs = Date.now()) {
  let registry = createEmptyPlayerRegistry(nowMs);
  seedRegistryFromStaticList(registry);

  for (const detail of matchDetails || []) {
    registry = upsertRegistryFromMatchDetail(registry, detail);
  }

  registry.lastUpdated = nowMs;
  registry.source = matchDetails?.length ? "espn_match_details+seed" : "static";
  return registry;
}
