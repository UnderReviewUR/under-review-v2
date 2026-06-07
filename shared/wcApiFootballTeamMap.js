/**
 * Map API-Football team names → internal FIFA abbreviations (WC 2026 roster).
 */

import { WC_2026_TEAMS } from "../src/data/wc2026Teams.js";
import { normalizeEspnAbbr } from "../api/_wcEspn.js";

/** @type {Map<string, string>} */
const BY_NORMALIZED_NAME = new Map();

/** @type {Record<string, string>} */
const ALIASES = {
  "united states": "USA",
  "usa": "USA",
  "south korea": "KOR",
  "korea republic": "KOR",
  "republic of korea": "KOR",
  "bosnia and herzegovina": "BIH",
  "bosnia-herzegovina": "BIH",
  "czech republic": "CZE",
  "czechia": "CZE",
  "ivory coast": "CIV",
  "cote d'ivoire": "CIV",
  "côte d'ivoire": "CIV",
  "dr congo": "COD",
  "congo dr": "COD",
  "democratic republic of the congo": "COD",
  "curacao": "CUW",
  "curaçao": "CUW",
  "south africa": "RSA",
  "saudi arabia": "KSA",
  "united arab emirates": "UAE",
};

function normName(s) {
  return String(s || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

for (const team of WC_2026_TEAMS) {
  const abbr = normalizeEspnAbbr(team.abbreviation);
  BY_NORMALIZED_NAME.set(normName(team.name), abbr);
  if (team.shortName) BY_NORMALIZED_NAME.set(normName(team.shortName), abbr);
}

/**
 * @param {string} apiTeamName
 * @returns {string | null}
 */
export function abbrFromApiFootballTeamName(apiTeamName) {
  const key = normName(apiTeamName);
  if (!key) return null;
  if (ALIASES[key]) return normalizeEspnAbbr(ALIASES[key]);
  if (BY_NORMALIZED_NAME.has(key)) return BY_NORMALIZED_NAME.get(key) || null;

  for (const [name, abbr] of BY_NORMALIZED_NAME) {
    if (key.includes(name) || name.includes(key)) return abbr;
  }
  return null;
}

/**
 * @param {string} homeAbbr
 * @param {string} awayAbbr
 * @param {string} [dateYmd] — YYYY-MM-DD
 */
export function espnEventMapKey(homeAbbr, awayAbbr, dateYmd) {
  const home = normalizeEspnAbbr(homeAbbr);
  const away = normalizeEspnAbbr(awayAbbr);
  const date = String(dateYmd || "").slice(0, 10);
  return `${date}|${home}|${away}`;
}
