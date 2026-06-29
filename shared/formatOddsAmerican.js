/**
 * American odds display with decimal alongside (global WC audience).
 * Prose answers from the model stay American-only — augment cards/structured fields only.
 */

/**
 * Profit in dollars from a winning bet (excludes returned stake).
 * @param {number} stakeDollars
 * @param {number} american
 * @returns {number | null}
 */
export function americanOddsProfit(stakeDollars, american) {
  const stake = Number(stakeDollars);
  if (!Number.isFinite(stake) || stake <= 0) return null;
  if (!Number.isFinite(american) || american === 0) return null;
  if (american < 0) return Math.round((stake * (100 / Math.abs(american))) * 100) / 100;
  return Math.round(stake * (american / 100) * 100) / 100;
}

/**
 * Conversational profit phrase for follow-up copy ("about sixty cents", "$600 profit").
 * @param {number} stakeDollars
 * @param {number} american
 * @returns {string | null}
 */
export function formatAmericanOddsStakeProfitPhrase(stakeDollars, american) {
  const profit = americanOddsProfit(stakeDollars, american);
  if (profit == null) return null;
  if (profit >= 1) {
    const rounded = profit >= 100 ? Math.round(profit) : profit;
    return `$${rounded} profit`;
  }
  const cents = Math.round(profit * 100);
  if (cents <= 0) return "pennies";
  if (cents === 1) return "about a penny";
  if (cents < 100) return `about ${cents} cents`;
  return `$${profit.toFixed(2)} profit`;
}

/**
 * @param {string | number | null | undefined} raw
 * @returns {number | null}
 */
/**
 * First American odds token in user prose (e.g. "at -669", "+1500").
 * Word-boundary `\b` before a minus sign is unreliable — prefer explicit "at" or a lookbehind.
 * @param {string} text
 * @returns {string | null}
 */
export function extractFirstAmericanOddsToken(text) {
  const q = String(text || "");
  const atPrice = q.match(/\bat\s+([+-]\d{2,})\b/i);
  if (atPrice) return atPrice[1];
  const generic = q.match(/(?<![\d.])([+-]\d{2,})\b/);
  return generic?.[1] || null;
}

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
