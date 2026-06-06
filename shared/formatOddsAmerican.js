/**
 * American odds display with decimal alongside (global WC audience).
 * Prose answers from the model stay American-only — augment cards/structured fields only.
 */

/**
 * @param {string | number | null | undefined} raw
 * @returns {number | null}
 */
export function parseAmericanOddsValue(raw) {
  if (raw == null || raw === "" || raw === "TBD") return null;
  if (typeof raw === "number") {
    return Number.isFinite(raw) && raw !== 0 ? Math.trunc(raw) : null;
  }
  const trimmed = String(raw).trim();
  if (!trimmed || trimmed === "TBD" || trimmed === "—" || trimmed === "-") return null;
  const normalized = trimmed.startsWith("+") ? trimmed.slice(1) : trimmed;
  if (!/^[+-]?\d+$/.test(normalized)) return null;
  const n = Number(normalized);
  return Number.isFinite(n) && n !== 0 ? Math.trunc(n) : null;
}

/**
 * @param {number} american
 * @returns {number | null}
 */
export function americanToDecimal(american) {
  if (!Number.isFinite(american) || american === 0) return null;
  if (american < 0) return 100 / Math.abs(american) + 1;
  return american / 100 + 1;
}

/**
 * @param {number} decimal
 * @returns {string}
 */
export function formatDecimalOdds(decimal) {
  if (!Number.isFinite(decimal) || decimal <= 1) return "";
  if (decimal >= 10) return decimal.toFixed(2);
  return decimal.toFixed(2);
}

/**
 * Format American odds with decimal in parentheses: "+15000 (151.00)".
 * @param {string | number | null | undefined} raw
 * @returns {string}
 */
export function formatOddsAmerican(raw) {
  if (raw == null) return "—";
  const s = String(raw).trim();
  if (!s || s === "—" || s.toLowerCase() === "null" || s.toLowerCase() === "undefined") {
    return "—";
  }

  const american = parseAmericanOddsValue(s);
  if (american == null) return s;

  const americanDisplay = american > 0 ? `+${american}` : String(american);
  const decimal = americanToDecimal(american);
  if (decimal == null) return americanDisplay;

  return `${americanDisplay} (${formatDecimalOdds(decimal)})`;
}
