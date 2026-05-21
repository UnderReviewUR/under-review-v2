/**
 * Parse an American odds string or number (e.g. "-110", "+150") into a finite integer.
 * @param {string|number|null|undefined} raw
 * @returns {number|null}
 */
export function parseAmericanOddsValue(raw) {
  if (raw == null || raw === "" || raw === "TBD") return null;
  if (typeof raw === "number") {
    return Number.isFinite(raw) && raw !== 0 ? Math.trunc(raw) : null;
  }
  const trimmed = String(raw).trim();
  if (!trimmed || trimmed === "TBD") return null;
  const normalized = trimmed.startsWith("+") ? trimmed.slice(1) : trimmed;
  if (!/^[+-]?\d+$/.test(normalized)) return null;
  const n = Number(normalized);
  return Number.isFinite(n) && n !== 0 ? Math.trunc(n) : null;
}

/**
 * Convert American odds to decimal payout multiplier.
 * @param {number} american
 * @returns {number}
 */
export function americanToDecimal(american) {
  if (american < 0) return 100 / Math.abs(american) + 1;
  return american / 100 + 1;
}

/**
 * Convert decimal payout multiplier to American odds (rounded integer).
 * @param {number} decimal
 * @returns {number}
 */
export function decimalToAmerican(decimal) {
  if (decimal >= 2) return Math.round((decimal - 1) * 100);
  return Math.round(-100 / (decimal - 1));
}

/**
 * Combine American odds for a parlay: convert each leg to decimal, multiply, convert back.
 * @param {number[]} legs — American odds values, e.g. [-110, -110, -110]
 * @returns {number|null} Combined American odds, or null when input is invalid
 */
export function calculateParlayOdds(legs) {
  if (!Array.isArray(legs) || legs.length < 2) return null;

  let combinedDecimal = 1;
  for (const leg of legs) {
    const american = typeof leg === "number" ? leg : parseAmericanOddsValue(leg);
    if (american == null) return null;
    combinedDecimal *= americanToDecimal(american);
  }

  if (!Number.isFinite(combinedDecimal) || combinedDecimal <= 1) return null;
  return decimalToAmerican(combinedDecimal);
}

/**
 * Format American odds for parlay display (+ prefix when positive).
 * @param {number} american
 * @returns {string}
 */
export function formatParlayAmericanOdds(american) {
  const n = Math.round(Number(american));
  if (!Number.isFinite(n) || n === 0) return "";
  return n > 0 ? `+${n}` : String(n);
}

/**
 * Resolve combined parlay odds from leg objects, falling back to API-provided total when legs lack prices.
 * @param {Array<{ odds?: string|number|null }>} parlayLegs
 * @param {string|null|undefined} parlayTotalOdds
 * @returns {string|null}
 */
export function resolveParlayCombinedOddsDisplay(parlayLegs, parlayTotalOdds) {
  if (!Array.isArray(parlayLegs) || parlayLegs.length < 2) return null;

  const americans = parlayLegs.map((leg) => parseAmericanOddsValue(leg?.odds));
  const hasValidOdds = americans.filter((n) => n != null);
  if (hasValidOdds.length >= 2 && hasValidOdds.length === parlayLegs.length) {
    const combined = calculateParlayOdds(americans);
    if (combined != null) return formatParlayAmericanOdds(combined);
  }

  const fallback = String(parlayTotalOdds ?? "").trim();
  if (fallback && fallback !== "TBD" && parseAmericanOddsValue(fallback) != null) {
    return formatParlayAmericanOdds(parseAmericanOddsValue(fallback));
  }

  return null;
}
