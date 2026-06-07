/**
 * Golden Boot / player outright freshness — mirrors wcOddsFreshness + nbaOutrightsFreshness.
 */

import { WC_GOLDEN_BOOT_MAX_AGE_MS } from "./wc2026PlayerConstants.js";
import { calculateOddsFreshness } from "./wcOddsFreshness.js";
import { isVerifiedWcGoldenBootRow } from "./wcGoldenBootRowGuard.js";

export { WC_GOLDEN_BOOT_MAX_AGE_MS };

/**
 * @param {Record<string, unknown> | null | undefined} kvGoldenBoot
 * @param {number} [nowMs]
 */
export function attachGoldenBootFreshness(kvGoldenBoot, nowMs = Date.now()) {
  if (!kvGoldenBoot) return null;

  const rows = Array.isArray(kvGoldenBoot.rows) ? kvGoldenBoot.rows : [];
  const hasRows = rows.length > 0;

  if (!hasRows) {
    return {
      ...kvGoldenBoot,
      stale: true,
      freshness: calculateOddsFreshness(null, WC_GOLDEN_BOOT_MAX_AGE_MS, nowMs),
    };
  }

  const freshness = calculateOddsFreshness(
    kvGoldenBoot.lastUpdated,
    WC_GOLDEN_BOOT_MAX_AGE_MS,
    nowMs,
  );

  return {
    ...kvGoldenBoot,
    stale: freshness.isStale,
    freshness,
  };
}

/**
 * @param {import("./wc2026PlayerConstants.js").WcGoldenBootRow[]} rows
 * @param {number} [limit]
 */
const GOLDEN_BOOT_JUNK_NAME_RE =
  /\b(world[- ]?cup|fifa|minimum leg|the top|we often see|leg odds)\b/i;

/**
 * @param {import("./wc2026PlayerConstants.js").WcGoldenBootRow | Record<string, unknown>} row
 */
export function isPlausibleGoldenBootRow(row) {
  const name = String(row?.name || "").trim();
  if (!name || name.length < 4) return false;
  if (GOLDEN_BOOT_JUNK_NAME_RE.test(name)) return false;
  if (/^f[a-z]{3,}-/i.test(name)) return false;
  if (!isVerifiedWcGoldenBootRow(row)) return false;
  return true;
}

export function sortGoldenBootRows(rows, limit = 20) {
  return [...(rows || [])]
    .filter((r) => r?.name && r?.americanOdds && isPlausibleGoldenBootRow(r))
    .sort((a, b) => {
      const rankA = Number(a.impliedRank) || 999;
      const rankB = Number(b.impliedRank) || 999;
      if (rankA !== rankB) return rankA - rankB;
      const oddsA = Number.parseInt(String(a.americanOdds).replace(/[+-]/, ""), 10) || 99999;
      const oddsB = Number.parseInt(String(b.americanOdds).replace(/[+-]/, ""), 10) || 99999;
      return oddsA - oddsB;
    })
    .slice(0, limit);
}

/**
 * @param {Record<string, unknown> | null | undefined} kvGoldenBoot
 * @param {number} [limit]
 */
export function goldenBootRowsFromKv(kvGoldenBoot, limit = 20) {
  const rows = Array.isArray(kvGoldenBoot?.rows) ? kvGoldenBoot.rows : [];
  return sortGoldenBootRows(
    rows.map((r) => ({
      name: String(r.name || ""),
      americanOdds: String(r.americanOdds || ""),
      nationAbbr: r.nationAbbr ? String(r.nationAbbr) : undefined,
      espnAthleteId: r.espnAthleteId ? String(r.espnAthleteId) : undefined,
      impliedRank: Number(r.impliedRank) || undefined,
    })),
    limit,
  );
}
