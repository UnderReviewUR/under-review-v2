/**
 * Batched scrape last-run timestamps — one KV read/write per scheduler tick
 * instead of one GET per target.
 */

import { getDurableJson, setDurableJson } from "./_durableStore.js";
import { buildScrapeLastRunKvKey } from "../shared/scrapeCadencePolicy.js";

export const SCRAPE_LAST_RUN_BUNDLE_KV_KEY = "scrape_last_run_bundle";
const BUNDLE_TTL_SECONDS = 14 * 24 * 60 * 60;

/**
 * @returns {Promise<{ runs: Record<string, number>, dirty: boolean }>}
 */
export async function loadScrapeLastRunBundle() {
  const row = await getDurableJson(SCRAPE_LAST_RUN_BUNDLE_KV_KEY);
  const runs =
    row?.runs && typeof row.runs === "object" && !Array.isArray(row.runs)
      ? { ...row.runs }
      : {};
  return { runs, dirty: false };
}

/**
 * @param {{ runs: Record<string, number> }} bundle
 * @param {string} sport
 * @param {string} gameId
 */
export function readLastRunFromBundle(bundle, sport, gameId) {
  const field = buildScrapeLastRunKvKey(sport, gameId);
  const ms = Number(bundle.runs[field]);
  return Number.isFinite(ms) ? ms : null;
}

/**
 * @param {{ runs: Record<string, number>, dirty?: boolean }} bundle
 * @param {string} sport
 * @param {string} gameId
 * @param {number} lastRunMs
 */
export function writeLastRunToBundle(bundle, sport, gameId, lastRunMs) {
  const field = buildScrapeLastRunKvKey(sport, gameId);
  bundle.runs[field] = lastRunMs;
  bundle.dirty = true;
}

/**
 * @param {{ runs: Record<string, number>, dirty?: boolean }} bundle
 */
export async function persistScrapeLastRunBundle(bundle) {
  if (!bundle.dirty) return;
  await setDurableJson(
    SCRAPE_LAST_RUN_BUNDLE_KV_KEY,
    { runs: bundle.runs, updatedAt: Date.now() },
    { ttlSeconds: BUNDLE_TTL_SECONDS },
  );
  bundle.dirty = false;
}
