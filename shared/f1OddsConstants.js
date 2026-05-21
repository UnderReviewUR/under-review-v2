/** Smarkets v3 REST — F1 race odds (no auth). */
export const SMARKETS_API_BASE = "https://api.smarkets.com/v3";

export const SMARKETS_EVENTS_URL = `${SMARKETS_API_BASE}/events/?type_domain=motorsports&type_scope=single_event&state=upcoming`;

/**
 * @param {string | number} eventId
 */
export function f1OddsCacheKey(eventId) {
  const id = String(eventId || "")
    .replace(/[^A-Za-z0-9_-]+/g, "")
    .slice(0, 64);
  return `f1_odds_${id}_v1`;
}

/** UR Take + scrape: which Smarkets market names to pull quotes for. */
export const F1_ODDS_MARKET_KEYS = [
  "raceWinner",
  "top3",
  "top6",
  "fastestLap",
  "winningConstructor",
];

/** @type {Record<string, (marketName: string) => boolean>} */
export const F1_SMARKETS_MARKET_MATCHERS = {
  raceWinner: (name) =>
    /grand prix race\s*-\s*winner/i.test(name) ||
    (/^winner$/i.test(String(name).trim()) && !/constructor|fastest|top/i.test(name)),
  top3: (name) => /top\s*3/i.test(name) && !/both|points finish/i.test(name),
  top6: (name) => /top\s*6/i.test(name) && !/both/i.test(name),
  fastestLap: (name) =>
    /^fastest lap$/i.test(String(name).trim()) ||
    (/fastest lap/i.test(name) && !/car to set|pit stop/i.test(name)),
  winningConstructor: (name) => /winning constructor/i.test(name),
};

export const F1_ODDS_STALE_MS = 2 * 60 * 60 * 1000;

export const F1_ODDS_CACHE_TTL_SECONDS = 6 * 60 * 60;
