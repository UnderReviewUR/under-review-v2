/**
 * World Cup book scrape feature flags + rate policy (no Odds API).
 */

import { getEnv } from "../api/_env.js";

export const WC_BOOK_SCRAPE_TIMEOUT_MS = 12_000;
export const WC_BOOK_USER_AGENT =
  "Mozilla/5.0 (compatible; UnderReview-WC-PlayerMarkets/1.0; +https://under-review.app)";

/** @type {Record<string, { envFlag: string, urlEnv?: string, defaultUrl?: string }>} */
export const WC_GOLDEN_BOOT_BOOKS = {
  draftkings: {
    envFlag: "WC_SCRAPE_DK",
    urlEnv: "WC_SCRAPE_DK_URL",
    defaultUrl: "https://sportsbook.draftkings.com/leagues/soccer/world-cup-2026",
  },
  fanduel: {
    envFlag: "WC_SCRAPE_FD",
    urlEnv: "WC_SCRAPE_FD_URL",
    defaultUrl: "https://sportsbook.fanduel.com/soccer?tab=world-cup",
  },
  betmgm: {
    envFlag: "WC_SCRAPE_MGM",
    urlEnv: "WC_SCRAPE_MGM_URL",
    defaultUrl: "https://sports.betmgm.com/en/sports/soccer-4/fifa-world-cup-2026",
  },
  paddypower: {
    envFlag: "WC_SCRAPE_UK",
    urlEnv: "WC_SCRAPE_PADDY_URL",
    defaultUrl: "https://www.paddypower.com/football/world-cup-2026",
  },
  bet365: {
    envFlag: "WC_SCRAPE_UK",
    urlEnv: "WC_SCRAPE_BET365_URL",
    defaultUrl: "https://www.bet365.com/#/AC/B1/C1/D1002/E89296537/F3/",
  },
  williamhill: {
    envFlag: "WC_SCRAPE_UK",
    urlEnv: "WC_SCRAPE_WH_URL",
    defaultUrl: "https://sports.williamhill.com/betting/en-gb/football/competitions/OB_TY52321/World-Cup-2026",
  },
  oddschecker: {
    envFlag: "WC_SCRAPE_AGG",
    urlEnv: "WC_SCRAPE_ODDSCHECKER_URL",
    defaultUrl: "https://www.oddschecker.com/football/world-cup/world-cup-top-goalscorer",
  },
  covers: {
    envFlag: "WC_SCRAPE_AGG",
    urlEnv: "WC_SCRAPE_COVERS_URL",
    defaultUrl: "https://www.covers.com/sport/football/fifa-world-cup/odds",
  },
};

/**
 * US books enabled by default in dev unless explicitly disabled.
 * @param {string} bookKey
 */
export function isWcGoldenBootBookEnabled(bookKey) {
  const cfg = WC_GOLDEN_BOOT_BOOKS[bookKey];
  if (!cfg) return false;

  const raw = getEnv(cfg.envFlag, { treatEmptyAsMissing: false });
  if (raw === undefined) {
    return bookKey === "draftkings" || bookKey === "fanduel" || bookKey === "betmgm";
  }
  const v = String(raw).trim().toLowerCase();
  return v === "1" || v === "true" || v === "yes";
}

/**
 * @param {string} bookKey
 */
export function resolveWcGoldenBootBookUrl(bookKey) {
  const cfg = WC_GOLDEN_BOOT_BOOKS[bookKey];
  if (!cfg) return null;
  const fromEnv = cfg.urlEnv ? getEnv(cfg.urlEnv, { treatEmptyAsMissing: false }) : undefined;
  if (fromEnv && String(fromEnv).trim()) return String(fromEnv).trim();
  return cfg.defaultUrl || null;
}

/**
 * @returns {string[]}
 */
export function listEnabledWcGoldenBootBooks() {
  return Object.keys(WC_GOLDEN_BOOT_BOOKS).filter((k) => isWcGoldenBootBookEnabled(k));
}

/** @type {Record<string, { urlTemplateEnv: string, defaultTemplate?: string }>} */
export const WC_MATCH_PLAYER_PROP_BOOKS = {
  draftkings: {
    urlTemplateEnv: "WC_SCRAPE_DK_MATCH_URL_TEMPLATE",
    defaultTemplate:
      "https://sportsbook.draftkings.com/leagues/soccer/world-cup-2026?category=goalscorer&subcategory=anytime-goalscorer",
  },
  fanduel: {
    urlTemplateEnv: "WC_SCRAPE_FD_MATCH_URL_TEMPLATE",
    defaultTemplate: "https://sportsbook.fanduel.com/soccer?tab=world-cup",
  },
  betmgm: {
    urlTemplateEnv: "WC_SCRAPE_MGM_MATCH_URL_TEMPLATE",
    defaultTemplate: "https://sports.betmgm.com/en/sports/soccer-4/fifa-world-cup-2026",
  },
};

/**
 * @param {string} bookKey
 * @param {{ homeTeam?: string, awayTeam?: string, eventId?: string }} meta
 */
export function resolveWcMatchPlayerPropsBookUrl(bookKey, meta = {}) {
  if (!isWcGoldenBootBookEnabled(bookKey)) return null;
  const cfg = WC_MATCH_PLAYER_PROP_BOOKS[bookKey];
  if (!cfg) return resolveWcGoldenBootBookUrl(bookKey);

  const fromEnv = cfg.urlTemplateEnv
    ? getEnv(cfg.urlTemplateEnv, { treatEmptyAsMissing: false })
    : undefined;
  const template =
    fromEnv && String(fromEnv).trim()
      ? String(fromEnv).trim()
      : cfg.defaultTemplate || resolveWcGoldenBootBookUrl(bookKey);

  if (!template) return null;

  const slug = (s) =>
    String(s || "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");

  return template
    .replace(/\{eventId\}/gi, String(meta.eventId || ""))
    .replace(/\{home\}/gi, slug(meta.homeTeam))
    .replace(/\{away\}/gi, slug(meta.awayTeam))
    .replace(/\{homeAbbr\}/gi, String(meta.homeTeam || "").toUpperCase().slice(0, 3))
    .replace(/\{awayAbbr\}/gi, String(meta.awayTeam || "").toUpperCase().slice(0, 3));
}

/**
 * @returns {string[]}
 */
export function listEnabledWcMatchPlayerPropBooks() {
  return Object.keys(WC_MATCH_PLAYER_PROP_BOOKS).filter((k) => isWcGoldenBootBookEnabled(k));
}
