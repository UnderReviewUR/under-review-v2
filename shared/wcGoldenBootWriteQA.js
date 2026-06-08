/**
 * Golden Boot KV write gate — block golf bleed / parser junk before cache.
 */

import {
  filterGoldenBootScrapeRows,
  isVerifiedWcGoldenBootRow,
} from "./wcGoldenBootRowGuard.js";

export const WC_GOLDEN_BOOT_MIN_VERIFIED_ROWS = 3;
export const WC_GOLDEN_BOOT_TARGET_ROWS = 10;

/**
 * @param {Array<{ name: string, americanOdds: string, nationAbbr?: string }>} rows
 * @param {{ source?: string, booksUsed?: string[] }} [meta]
 */
export function validateGoldenBootKvRows(rows, meta = {}) {
  const cleaned = filterGoldenBootScrapeRows(rows || []).filter((r) =>
    isVerifiedWcGoldenBootRow(r),
  );
  const booksUsed = Array.isArray(meta.booksUsed) ? meta.booksUsed : [];
  const source = String(meta.source || "");
  const hasEspn = booksUsed.includes("espn") || source.includes("espn");
  const hasSeed = booksUsed.includes("seed") || source.includes("seed");
  const hasLiveBook = booksUsed.some((b) => b !== "seed" && b !== "espn");

  /** @type {string[]} */
  const issueCodes = [];
  if (cleaned.length < WC_GOLDEN_BOOT_MIN_VERIFIED_ROWS) {
    issueCodes.push("wc_golden_boot_insufficient_verified_rows");
  }
  if (!hasEspn && !hasLiveBook && !hasSeed) {
    issueCodes.push("wc_golden_boot_no_trusted_source");
  }

  return {
    ok: issueCodes.length === 0,
    issueCodes,
    verifiedCount: cleaned.length,
    cleaned,
    hasEspn,
    hasLiveBook,
    hasSeed,
  };
}

/**
 * @param {Array<{ name: string, americanOdds: string, nationAbbr?: string }>} rows
 * @param {{ source?: string, booksUsed?: string[] }} [meta]
 */
export function gateGoldenBootKvWrite(rows, meta = {}) {
  const qa = validateGoldenBootKvRows(rows, meta);
  return {
    allowWrite: qa.ok,
    rows: qa.cleaned,
    ...qa,
  };
}
