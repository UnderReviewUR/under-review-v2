/**
 * World Cup 2026 venue metadata — altitude, country, and conditions flags.
 * Used to inject context-aware disclaimers into UR Take prompts.
 */

/**
 * @typedef {object} WcVenueInfo
 * @property {string} city
 * @property {string} stadium
 * @property {string} country — "USA" | "MEX" | "CAN"
 * @property {number} altitudeFt
 * @property {boolean} highAltitude — ≥ 5,000 ft
 * @property {string | null} altitudeNote
 */

/** @type {Array<{ city: string, pattern: RegExp, country: string, altitudeFt: number }>} */
const VENUE_DB = [
  // Mexico
  { city: "Mexico City", pattern: /\bmexico\s*city\b|estadio azteca\b|azteca\b|ciudad de m[eé]xico\b/i, country: "MEX", altitudeFt: 7349 },
  { city: "Guadalajara", pattern: /\bguadalajara\b|estadio akron\b|akron\b/i, country: "MEX", altitudeFt: 5138 },
  { city: "Monterrey", pattern: /\bmonterrey\b|estadio bbva\b|bbva\b/i, country: "MEX", altitudeFt: 1765 },
  // USA
  { city: "New York/New Jersey", pattern: /\bmetlife\b|east rutherford\b|new jersey\b/i, country: "USA", altitudeFt: 10 },
  { city: "Los Angeles", pattern: /\bsofi\b|los angeles\b|inglewood\b/i, country: "USA", altitudeFt: 100 },
  { city: "Dallas", pattern: /\bat&t stadium\b|arlington\b|dallas\b/i, country: "USA", altitudeFt: 600 },
  { city: "Miami", pattern: /\bhard rock\b|miami\b/i, country: "USA", altitudeFt: 6 },
  { city: "Atlanta", pattern: /\bmercedes-benz\b|atlanta\b/i, country: "USA", altitudeFt: 1050 },
  { city: "Houston", pattern: /\bnrg stadium\b|houston\b/i, country: "USA", altitudeFt: 80 },
  { city: "Philadelphia", pattern: /\blincoln financial\b|philadelphia\b/i, country: "USA", altitudeFt: 40 },
  { city: "Seattle", pattern: /\blumen field\b|seattle\b/i, country: "USA", altitudeFt: 20 },
  { city: "San Francisco Bay Area", pattern: /\blevi'?s?\b|santa clara\b|san francisco\b/i, country: "USA", altitudeFt: 40 },
  { city: "Kansas City", pattern: /\barrowhead\b|kansas city\b/i, country: "USA", altitudeFt: 800 },
  { city: "Boston/Foxborough", pattern: /\bfoxborough\b|gillette\b|boston\b/i, country: "USA", altitudeFt: 300 },
  // Canada
  { city: "Toronto", pattern: /\bbmo field\b|toronto\b/i, country: "CAN", altitudeFt: 250 },
  { city: "Vancouver", pattern: /\bbc place\b|vancouver\b/i, country: "CAN", altitudeFt: 0 },
];

const HIGH_ALTITUDE_THRESHOLD_FT = 5000;

/**
 * @param {string | null | undefined} stadium
 * @param {string | null | undefined} city
 * @returns {WcVenueInfo | null}
 */
export function resolveWcVenue(stadium, city) {
  const haystack = `${String(stadium || "")} ${String(city || "")}`.trim();
  if (!haystack) return null;

  for (const v of VENUE_DB) {
    if (v.pattern.test(haystack)) {
      const highAltitude = v.altitudeFt >= HIGH_ALTITUDE_THRESHOLD_FT;
      return {
        city: v.city,
        stadium: String(stadium || "").trim() || v.city,
        country: v.country,
        altitudeFt: v.altitudeFt,
        highAltitude,
        altitudeNote: highAltitude
          ? `High altitude venue (${v.altitudeFt.toLocaleString()} ft) — ball travels faster, players tire quicker, scoring patterns may differ from sea-level norms.`
          : null,
      };
    }
  }
  return null;
}

/**
 * @param {Array<Record<string, unknown>>} fixtures
 * @returns {string | null}
 */
export function formatVenueWarningsForPrompt(fixtures) {
  if (!Array.isArray(fixtures) || !fixtures.length) return null;
  const warnings = [];
  const seen = new Set();

  for (const fx of fixtures) {
    const venue = resolveWcVenue(fx.stadium, fx.city);
    if (!venue) continue;
    const key = venue.city;
    if (seen.has(key)) continue;
    seen.add(key);

    if (venue.highAltitude) {
      warnings.push(
        `  ${fx.homeTeam || "?"} vs ${fx.awayTeam || "?"} @ ${venue.city} (${venue.altitudeFt.toLocaleString()} ft): ${venue.altitudeNote}`,
      );
    }
  }

  if (!warnings.length) return null;
  return ["VENUE CONDITIONS (factor into match analysis):", ...warnings].join("\n");
}
