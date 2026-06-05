/**

 * World Cup book scrape feature flags, rate policy, and auth (no Odds API).

 */



import { getEnv } from "../api/_env.js";



export const WC_BOOK_SCRAPE_TIMEOUT_MS = 12_000;

export const WC_BOOK_USER_AGENT =

  "Mozilla/5.0 (compatible; UnderReview-WC-PlayerMarkets/1.0; +https://under-review.app)";



/** Delay between sequential book requests (rate-friendly). */

export const WC_BOOK_SCRAPE_BASE_DELAY_MS = 450;



/** Extra backoff after HTTP errors or timeouts. */

export const WC_BOOK_SCRAPE_BACKOFF_MS = 1_200;



/** Per-book retries after fetch/parse failure. */

export const WC_BOOK_SCRAPE_MAX_RETRIES = 1;



/** @typedef {"us" | "uk" | "agg"} WcBookRegion */



/** @type {Record<string, { envFlag: string; region: WcBookRegion; urlEnv?: string, defaultUrl?: string }>} */

export const WC_GOLDEN_BOOT_BOOKS = {

  draftkings: {

    envFlag: "WC_SCRAPE_DK",

    region: "us",

    urlEnv: "WC_SCRAPE_DK_URL",

    defaultUrl: "https://sportsbook.draftkings.com/leagues/soccer/world-cup-2026",

  },

  fanduel: {

    envFlag: "WC_SCRAPE_FD",

    region: "us",

    urlEnv: "WC_SCRAPE_FD_URL",

    defaultUrl: "https://sportsbook.fanduel.com/soccer?tab=world-cup",

  },

  betmgm: {

    envFlag: "WC_SCRAPE_MGM",

    region: "us",

    urlEnv: "WC_SCRAPE_MGM_URL",

    defaultUrl: "https://sports.betmgm.com/en/sports/soccer-4/fifa-world-cup-2026",

  },

  paddypower: {

    envFlag: "WC_SCRAPE_UK",

    region: "uk",

    urlEnv: "WC_SCRAPE_PADDY_URL",

    defaultUrl: "https://www.paddypower.com/football/world-cup-2026",

  },

  bet365: {

    envFlag: "WC_SCRAPE_UK",

    region: "uk",

    urlEnv: "WC_SCRAPE_BET365_URL",

    defaultUrl: "https://www.bet365.com/#/AC/B1/C1/D1002/E89296537/F3/",

  },

  williamhill: {

    envFlag: "WC_SCRAPE_UK",

    region: "uk",

    urlEnv: "WC_SCRAPE_WH_URL",

    defaultUrl: "https://sports.williamhill.com/betting/en-gb/football/competitions/OB_TY52321/World-Cup-2026",

  },

  oddschecker: {

    envFlag: "WC_SCRAPE_AGG",

    region: "agg",

    urlEnv: "WC_SCRAPE_ODDSCHECKER_URL",

    defaultUrl: "https://www.oddschecker.com/football/world-cup/world-cup-top-goalscorer",

  },

  covers: {

    envFlag: "WC_SCRAPE_AGG",

    region: "agg",

    urlEnv: "WC_SCRAPE_COVERS_URL",

    defaultUrl: "https://www.covers.com/sport/football/fifa-world-cup/odds",

  },

};



const US_DEFAULT_ON = new Set(["draftkings", "fanduel", "betmgm"]);



/**

 * Region gate — UK and aggregators default OFF unless env explicitly enabled.

 * @param {WcBookRegion} region

 */

export function isWcBookRegionEnabled(region) {

  if (region === "us") return true;

  const flag = region === "uk" ? "WC_SCRAPE_UK" : "WC_SCRAPE_AGG";

  const raw = getEnv(flag, { treatEmptyAsMissing: false });

  if (raw === undefined) return false;

  const v = String(raw).trim().toLowerCase();

  return v === "1" || v === "true" || v === "yes";

}



/**

 * @param {string} bookKey

 */

export function isWcGoldenBootBookEnabled(bookKey) {

  const cfg = WC_GOLDEN_BOOT_BOOKS[bookKey];

  if (!cfg) return false;

  if (!isWcBookRegionEnabled(cfg.region)) return false;



  const raw = getEnv(cfg.envFlag, { treatEmptyAsMissing: false });

  if (raw === undefined) {

    return US_DEFAULT_ON.has(bookKey);

  }

  const v = String(raw).trim().toLowerCase();

  return v === "1" || v === "true" || v === "yes";

}



/**

 * @param {string} bookKey

 */

export function wcBookRegion(bookKey) {

  return WC_GOLDEN_BOOT_BOOKS[bookKey]?.region || "us";

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



/** @type {Record<string, { urlTemplateEnv: string, defaultTemplate?: string, region?: WcBookRegion }>} */

export const WC_MATCH_PLAYER_PROP_BOOKS = {

  draftkings: {

    urlTemplateEnv: "WC_SCRAPE_DK_MATCH_URL_TEMPLATE",

    region: "us",

    defaultTemplate:

      "https://sportsbook.draftkings.com/leagues/soccer/world-cup-2026?category=goalscorer&subcategory=anytime-goalscorer",

  },

  fanduel: {

    urlTemplateEnv: "WC_SCRAPE_FD_MATCH_URL_TEMPLATE",

    region: "us",

    defaultTemplate: "https://sportsbook.fanduel.com/soccer?tab=world-cup",

  },

  betmgm: {

    urlTemplateEnv: "WC_SCRAPE_MGM_MATCH_URL_TEMPLATE",

    region: "us",

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



/**

 * Pause between book scrapes (index-aware jitter).

 * @param {number} bookIndex

 * @param {{ hadError?: boolean }} [opts]

 */

export async function delayBetweenWcBookScrapes(bookIndex, opts = {}) {

  const base = WC_BOOK_SCRAPE_BASE_DELAY_MS + bookIndex * 80;

  const extra = opts.hadError ? WC_BOOK_SCRAPE_BACKOFF_MS : 0;

  const ms = base + extra;

  if (ms <= 0) return;

  await new Promise((r) => setTimeout(r, ms));

}



/**

 * Cron/admin auth for manual override POSTs.

 * @param {import("http").IncomingMessage | { headers?: Record<string, string | string[] | undefined>, authorization?: string }} req

 */

export function verifyWcPlayerMarketsAdminAuth(req) {

  const secret = getEnv("CRON_SECRET", { treatEmptyAsMissing: false });

  if (!secret || !String(secret).trim()) return false;

  const auth =

    req?.headers?.authorization ||

    req?.authorization ||

    (typeof req?.headers?.get === "function" ? req.headers.get("authorization") : "");

  return String(auth || "") === `Bearer ${String(secret).trim()}`;

}



/**

 * Snapshot of enabled flags for status dashboard.

 */

export function wcBookScrapeFlagsSnapshot() {

  return {

    us: {

      draftkings: isWcGoldenBootBookEnabled("draftkings"),

      fanduel: isWcGoldenBootBookEnabled("fanduel"),

      betmgm: isWcGoldenBootBookEnabled("betmgm"),

    },

    uk: {

      enabled: isWcBookRegionEnabled("uk"),

      paddypower: isWcGoldenBootBookEnabled("paddypower"),

      bet365: isWcGoldenBootBookEnabled("bet365"),

      williamhill: isWcGoldenBootBookEnabled("williamhill"),

    },

    agg: {

      enabled: isWcBookRegionEnabled("agg"),

      oddschecker: isWcGoldenBootBookEnabled("oddschecker"),

      covers: isWcGoldenBootBookEnabled("covers"),

    },

    env: {

      WC_SCRAPE_UK: getEnv("WC_SCRAPE_UK", { treatEmptyAsMissing: false }) ?? "(default off)",

      WC_SCRAPE_AGG: getEnv("WC_SCRAPE_AGG", { treatEmptyAsMissing: false }) ?? "(default off)",

    },

  };

}


