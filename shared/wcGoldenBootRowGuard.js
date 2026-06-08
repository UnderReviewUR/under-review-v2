/**
 * Golden Boot row guard — block cross-sport (golf) bleed and parser junk without nation.
 */

import { WC_2026_TEAMS } from "../src/data/wc2026Teams.js";
import { WC_GOLDEN_BOOT_SEED_ROWS } from "../src/data/wc2026GoldenBootSeed.js";
import { normalizeWcPlayerName } from "./wcPlayerRegistry.js";

/** @type {Set<string>} */
const WC_NATION_ABBRS = new Set(
  WC_2026_TEAMS.map((t) => String(t.abbreviation || "").toUpperCase()).filter(Boolean),
);

/**
 * @param {string} name
 */
function nameGuardKey(name) {
  return normalizeWcPlayerName(name)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

/** Golf outright names that must never surface in World Cup Golden Boot output. */
const GOLF_OUTRIGHT_DENYLIST = new Set(
  [
    "Patrick Cantlay",
    "Paul Casey",
    "Marc Leishman",
    "Scottie Scheffler",
    "Xander Schauffele",
    "Rory McIlroy",
    "Collin Morikawa",
    "Viktor Hovland",
    "Wyndham Clark",
    "Ludvig Aberg",
    "Tommy Fleetwood",
    "Shane Lowry",
    "Brooks Koepka",
    "Jon Rahm",
    "Bryson DeChambeau",
    "Jordan Spieth",
    "Justin Thomas",
    "Tony Finau",
    "Hideki Matsuyama",
    "Tom Kim",
    "Jason Day",
    "Adam Scott",
    "Matt Fitzpatrick",
    "Russell Henley",
    "Sahith Theegala",
    "Cameron Smith",
    "Dustin Johnson",
    "Phil Mickelson",
    "Tiger Woods",
    "Max Homa",
    "Keegan Bradley",
    "Sam Burns",
    "Rickie Fowler",
    "Brian Harman",
    "Cameron Young",
  ].map(nameGuardKey),
);

/** @type {Set<string>} */
const SEED_PLAYER_KEYS = new Set(
  WC_GOLDEN_BOOT_SEED_ROWS.map((r) => `${String(r.nationAbbr).toUpperCase()}|${nameGuardKey(r.name)}`),
);

/**
 * @param {string} name
 */
export function isCrossSportGolferName(name) {
  return GOLF_OUTRIGHT_DENYLIST.has(nameGuardKey(name));
}

/**
 * @param {string | null | undefined} nationAbbr
 */
export function hasValidWcGoldenBootNation(nationAbbr) {
  return WC_NATION_ABBRS.has(String(nationAbbr || "").toUpperCase());
}

/**
 * @param {import("./wc2026PlayerConstants.js").WcGoldenBootRow | Record<string, unknown>} row
 */
export function isVerifiedWcGoldenBootRow(row) {
  const name = normalizeWcPlayerName(row?.name);
  if (!name || isCrossSportGolferName(name)) return false;

  const nation = String(row?.nationAbbr || "").toUpperCase();
  if (!hasValidWcGoldenBootNation(nation)) return false;

  const seedKey = `${nation}|${nameGuardKey(name)}`;
  if (SEED_PLAYER_KEYS.has(seedKey)) return true;

  // Live/scraped rows must carry a FIFA nation — blocks DK golf-page bleed (Cantlay, Casey, etc.).
  return Boolean(nation);
}

const PARSER_JUNK_NAME_RE =
  /\b(minimum leg|we often see|the top|fworld|sportsbook|goalscorer market|leg odds)\b/i;

/**
 * @param {string} name
 */
export function isGoldenBootParserJunkName(name) {
  const n = nameGuardKey(name);
  if (!n || n.length < 4) return true;
  if (PARSER_JUNK_NAME_RE.test(n)) return true;
  if (!/\s/.test(n) && n.length > 24) return true;
  return false;
}

/**
 * @param {Array<{ name: string, americanOdds: string, nationAbbr?: string }>} rows
 */
export function filterGoldenBootScrapeRows(rows) {
  return (rows || []).filter((row) => {
    const name = normalizeWcPlayerName(row?.name);
    if (!name || isCrossSportGolferName(name)) return false;
    if (isGoldenBootParserJunkName(name)) return false;
    if (!row?.americanOdds) return false;
    return true;
  });
}

/**
 * @param {string} text
 */
export function textMentionsCrossSportGolfer(text) {
  const blob = nameGuardKey(String(text || ""));
  for (const golfer of GOLF_OUTRIGHT_DENYLIST) {
    if (blob.includes(golfer)) return true;
  }
  return false;
}
