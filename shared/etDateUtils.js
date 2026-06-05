/**
 * Shared Eastern-Time date helpers — consolidates getEtYmdAt and parseYmd
 * previously duplicated across golfOddsCachePolicy, wc2026Constants,
 * freeTierQuota, nbaPlayoffSlateFromActionNetwork, and _espnEtDates.
 */

/**
 * Current or given instant as YYYY-MM-DD in America/New_York.
 * @param {number} [nowMs]
 * @returns {string}
 */
export function getEtYmdAt(nowMs = Date.now()) {
  return new Date(nowMs).toLocaleDateString("en-CA", { timeZone: "America/New_York" });
}

/**
 * Parse a YYYY-MM-DD string into components.
 * @param {string} ymd
 * @returns {{ y: number, mo: number, da: number } | null}
 */
export function parseYmd(ymd) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(ymd || "").trim());
  if (!m) return null;
  return { y: parseInt(m[1], 10), mo: parseInt(m[2], 10), da: parseInt(m[3], 10) };
}

/**
 * Convert an ISO timestamp to YYYY-MM-DD in America/New_York.
 * @param {string} isoString
 * @returns {string}
 */
export function toEtDateString(isoString) {
  if (!isoString) return "";
  return new Date(isoString).toLocaleDateString("en-CA", {
    timeZone: "America/New_York",
  });
}
