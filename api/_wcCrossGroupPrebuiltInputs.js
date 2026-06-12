/**
 * Resolve sim + BDL GOAT inputs for cross-group value prebuilt cards.
 * Live KV first, then seed / compute fallbacks — never return empty when seeds exist.
 */

import { readWcTournamentSimFromKv, resolveWcTournamentSimForPrompt } from "./_wcTournamentSimData.js";
import { readBdlLiveFuturesFromKv } from "./_wcBdlData.js";
import { readWcBdlGoatSeedFromKv } from "./_wcBdlSeed.js";

/**
 * @param {number} [nowMs]
 */
export async function resolveWcCrossGroupPrebuiltInputs(nowMs = Date.now()) {
  const [simRow, bdlLive] = await Promise.all([
    readWcTournamentSimFromKv(undefined, nowMs).catch(() => null),
    readBdlLiveFuturesFromKv(nowMs).catch(() => null),
  ]);

  /** @type {{ byMarketType?: Record<string, unknown>, lastUpdated?: number, source?: string } | null} */
  let bdlFutures = bdlLive?.byMarketType ? bdlLive : null;
  if (!bdlFutures?.byMarketType) {
    const seed = await readWcBdlGoatSeedFromKv(nowMs).catch(() => null);
    if (seed?.byMarketType && Object.keys(seed.byMarketType).length) {
      bdlFutures = seed;
    }
  }

  let teamStats = simRow?.teamStats || null;
  if (!teamStats) {
    const simResolved = await resolveWcTournamentSimForPrompt({ nowMs }).catch(() => null);
    teamStats = simResolved?.simResults?.teamStats || null;
  }

  return { teamStats, bdlFutures, nowMs };
}
