/**
 * Smarkets tick price → decimal → American (bid = consensus).
 * Tick is integer cents on probability scale (e.g. 357 → 3.57 decimal).
 */

/**
 * @param {number | string | null | undefined} tickPrice
 * @returns {number | null}
 */
export function smarketsTickToDecimal(tickPrice) {
  const n = Number(tickPrice);
  if (!Number.isFinite(n) || n <= 0) return null;
  const decimal = n / 100;
  if (decimal <= 1) return null;
  return Math.round(decimal * 1000) / 1000;
}

/**
 * @param {number | null | undefined} decimal
 * @returns {number | null}
 */
export function decimalToAmericanOdds(decimal) {
  if (decimal == null || !Number.isFinite(decimal) || decimal <= 1) return null;
  if (decimal >= 2) {
    return Math.round((decimal - 1) * 100);
  }
  return Math.round(-100 / (decimal - 1));
}

/**
 * Best bid tick from Smarkets quotes payload for one contract.
 * @param {Record<string, unknown> | null | undefined} quotesByContract
 * @param {string | number} contractId
 * @returns {number | null}
 */
export function smarketsBestBidTick(quotesByContract, contractId) {
  const row = quotesByContract?.[String(contractId)];
  const bids = row?.bids;
  if (!Array.isArray(bids) || !bids.length) return null;
  const prices = bids
    .map((b) => Number(b?.price))
    .filter((p) => Number.isFinite(p) && p > 0);
  if (!prices.length) return null;
  return Math.max(...prices);
}

/**
 * @param {number | string | null | undefined} tickPrice
 * @returns {{ decimalOdds: number, americanOdds: number } | null}
 */
export function smarketsBidToOdds(tickPrice) {
  const decimalOdds = smarketsTickToDecimal(tickPrice);
  if (decimalOdds == null) return null;
  const americanOdds = decimalToAmericanOdds(decimalOdds);
  if (americanOdds == null) return null;
  return { decimalOdds, americanOdds };
}
