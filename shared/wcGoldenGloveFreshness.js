/**
 * Golden Glove odds freshness — mirrors Golden Boot helpers.
 */

import { WC_GOLDEN_GLOVE_MAX_AGE_MS } from "./wc2026PlayerConstants.js";
import { calculateOddsFreshness } from "./wcOddsFreshness.js";
import { goldenGloveRowsFromKv } from "./wcPlayerOddsFreshness.js";

export { WC_GOLDEN_GLOVE_MAX_AGE_MS };

/**
 * @param {Record<string, unknown> | null | undefined} kvGoldenGlove
 * @param {number} [nowMs]
 */
export function attachGoldenGloveFreshness(kvGoldenGlove, nowMs = Date.now()) {
  if (!kvGoldenGlove) return null;
  const rows = Array.isArray(kvGoldenGlove.rows) ? kvGoldenGlove.rows : [];
  const freshness = calculateOddsFreshness(
    kvGoldenGlove.lastUpdated,
    WC_GOLDEN_GLOVE_MAX_AGE_MS,
    nowMs,
  );
  return {
    ...kvGoldenGlove,
    stale: !rows.length || freshness.isStale,
    freshness,
  };
}

export { goldenGloveRowsFromKv };
