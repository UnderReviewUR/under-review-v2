/**
 * Resolve tomorrow ET slate + sim inputs for WC tomorrow prebuilt cards.
 */

import { readWcTournamentSimFromKv } from "./_wcTournamentSimData.js";
import { readWcMatchesFromKv } from "./_wcData.js";
import { getMatchesPayload } from "./world-cup.js";
import { buildStaticPromoMatchesFallback } from "../shared/wc2026PromoFixtures.js";
import { isWcTournamentWindow } from "../shared/wc2026Constants.js";
import { buildWcTomorrowSlatePrebuiltStructured } from "../shared/wcTomorrowSlatePrebuilt.js";

/**
 * Same match board as /api/world-cup (KV-first, no openfootball fallback during tournament).
 * @param {number} [nowMs]
 */
async function loadWcMatchesForTomorrowSlate(nowMs = Date.now()) {
  try {
    const payload = await getMatchesPayload();
    if (Array.isArray(payload?.matches) && payload.matches.length) {
      return payload.matches;
    }
  } catch (err) {
    console.warn("[wc-tomorrow-slate] getMatchesPayload failed:", err?.message || err);
  }

  const matchesKv = await readWcMatchesFromKv(Number.MAX_SAFE_INTEGER).catch(() => null);
  if (Array.isArray(matchesKv?.matches) && matchesKv.matches.length) {
    return matchesKv.matches;
  }

  if (!isWcTournamentWindow(nowMs)) {
    return buildStaticPromoMatchesFallback(nowMs);
  }

  return [];
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
