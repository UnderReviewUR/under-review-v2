/**
 * Resolve tomorrow ET slate + sim inputs for WC tomorrow prebuilt cards.
 */

import { readWcMatchesFromKv } from "./_wcData.js";
import { readWcTournamentSimFromKv } from "./_wcTournamentSimData.js";
import { buildStaticPromoMatchesFallback } from "../shared/wc2026PromoFixtures.js";
import { fetchOpenFootballWc2026Schedule } from "../shared/wcOpenFootballSchedule.js";
import { buildWcTomorrowSlatePrebuiltStructured } from "../shared/wcTomorrowSlatePrebuilt.js";

/**
 * @param {number} [nowMs]
 */
async function loadWcMatchesForTomorrowSlate(nowMs = Date.now()) {
  const matchesKv = await readWcMatchesFromKv(Number.MAX_SAFE_INTEGER).catch(() => null);
  let matches = Array.isArray(matchesKv?.matches) ? matchesKv.matches : [];
  if (matches.length >= 20) return matches;

  const openFootball = await fetchOpenFootballWc2026Schedule().catch(() => null);
  if (openFootball?.ok && Array.isArray(openFootball.matches) && openFootball.matches.length) {
    matches = openFootball.matches;
  }
  if (!matches.length) {
    matches = buildStaticPromoMatchesFallback(nowMs);
  }
  return matches;
}

/**
 * @param {{ question?: string, nowMs?: number }} [opts]
 */
export async function resolveWcTomorrowSlatePrebuiltInputs(opts = {}) {
  const nowMs = Number(opts.nowMs) || Date.now();
  const [matches, simRow] = await Promise.all([
    loadWcMatchesForTomorrowSlate(nowMs),
    readWcTournamentSimFromKv(undefined, nowMs).catch(() => null),
  ]);

  return {
    question: String(opts.question || ""),
    matches,
    teamStats: simRow?.teamStats || null,
    simLastUpdated: simRow?.lastUpdated,
    nowMs,
  };
}

/**
 * @param {{ question?: string, nowMs?: number }} [opts]
 */
export async function buildWcTomorrowSlatePrebuiltFromInputs(opts = {}) {
  const inputs = await resolveWcTomorrowSlatePrebuiltInputs(opts);
  return buildWcTomorrowSlatePrebuiltStructured(inputs);
}
