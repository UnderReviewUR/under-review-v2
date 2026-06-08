/**

 * World Cup book scrape feature flags, rate policy, and auth (no Odds API).

 */



import { getEnv } from "../api/_env.js";
import { getWcTeamByAbbr } from "../src/data/wc2026Teams.js";
import {
  WC_GOLDEN_BOOT_SOURCE_REGISTRY as WC_GOLDEN_BOOT_BOOKS,
  getWcGoldenBootSourceConfig,
} from "./wcGoldenBootSourceRegistry.js";

export { WC_GOLDEN_BOOT_BOOKS, getWcGoldenBootSourceConfig };



export const WC_BOOK_SCRAPE_TIMEOUT_MS = 12_000;

export const WC_BOOK_USER_AGENT =

  "Mozilla/5.0 (compatible; UnderReview-WC-PlayerMarkets/1.0; +https://under-review.app)";



/** Delay between sequential book requests (rate-friendly). */

export const WC_BOOK_SCRAPE_BASE_DELAY_MS = 450;



/** Extra backoff after HTTP errors or timeouts. */

export const WC_BOOK_SCRAPE_BACKOFF_MS = 1_200;



/** Per-book retries after fetch/parse failure. */

export const WC_BOOK_SCRAPE_MAX_RETRIES = 1;



/** @typedef {"us" | "uk" | "agg" | "media"} WcBookRegion */

const US_DEFAULT_ON = new Set(["draftkings", "fanduel", "betmgm"]);



/**

 * Region gate — UK and aggregators default OFF unless env explicitly enabled.

 * @param {WcBookRegion} region

 */

export function isWcBookRegionEnabled(region) {

  if (region === "us") return true;

  const flag =
    region === "uk" ? "WC_SCRAPE_UK" : region === "media" ? "WC_SCRAPE_MEDIA" : "WC_SCRAPE_AGG";

  const raw = getEnv(flag, { treatEmptyAsMissing: false });

  if (raw === undefined) {
    if (process.env.VERCEL_ENV === "production") {
      return region === "uk" || region === "agg" || region === "media";
    }
    return false;
  }

  const v = String(raw).trim().toLowerCase();

  return v === "1" || v === "true" || v === "yes";

}



/**

 * @param {string} bookKey

 */

export function isWcGoldenBootBookEnabled(bookKey) {
  const cfg = getWcGoldenBootSourceConfig(bookKey);
  if (!cfg) return false;
  if (!isWcBookRegionEnabled(cfg.region)) return false;

  const raw = getEnv(cfg.envFlag, { treatEmptyAsMissing: false });
  if (raw !== undefined) {
    const v = String(raw).trim().toLowerCase();
    if (v === "0" || v === "false" || v === "no") return false;
    return v === "1" || v === "true" || v === "yes";
  }

  if (cfg.region === "us") return US_DEFAULT_ON.has(bookKey);
  return true;
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

  const urls = listWcGoldenBootScrapeUrls(bookKey);

  return urls[0] || null;

}

/**
 * Primary + fallback URLs per book (FanDuel Research before sportsbook SPA shell).
 * @param {string} bookKey
 * @returns {string[]}
 */
export function listWcGoldenBootScrapeUrls(bookKey) {
  const cfg = WC_GOLDEN_BOOT_BOOKS[bookKey];
  if (!cfg || !isWcGoldenBootBookEnabled(bookKey)) return [];

  const fromEnv = cfg.urlEnv ? getEnv(cfg.urlEnv, { treatEmptyAsMissing: false }) : undefined;
  if (fromEnv && String(fromEnv).trim()) return [String(fromEnv).trim()];

  /** @type {string[]} */
  const urls = [];
  if (cfg.defaultUrl) urls.push(cfg.defaultUrl);
  if (cfg.fallbackUrl) urls.push(cfg.fallbackUrl);
  return [...new Set(urls)];
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

    eventUrlTemplate: "https://sportsbook.draftkings.com/event/{eventId}",

  },

  fanduel: {

    urlTemplateEnv: "WC_SCRAPE_FD_MATCH_URL_TEMPLATE",

    region: "us",

    defaultTemplate: "https://sportsbook.fanduel.com/soccer?tab=world-cup",

    eventUrlTemplate:

      "https://sportsbook.fanduel.com/soccer/fifa-world-cup-2026/{home}-v-{away}",

  },

  betmgm: {

    urlTemplateEnv: "WC_SCRAPE_MGM_MATCH_URL_TEMPLATE",

    region: "us",

    defaultTemplate: "https://sports.betmgm.com/en/sports/soccer-4/fifa-world-cup-2026",

    eventUrlTemplate: "https://sports.betmgm.com/en/sports/events/{eventId}",

  },

  williamhill: {

    urlTemplateEnv: "WC_SCRAPE_WH_MATCH_URL_TEMPLATE",

    region: "uk",

    defaultTemplate:

      "https://sports.williamhill.com/betting/en-gb/football/competitions/OB_TY52321/World-Cup-2026",

    eventUrlTemplate:

      "https://sports.williamhill.com/betting/en-gb/football/matches/{eventId}",

  },

  paddypower: {

    urlTemplateEnv: "WC_SCRAPE_PADDY_MATCH_URL_TEMPLATE",

    region: "uk",

    defaultTemplate: "https://www.paddypower.com/football/world-cup-2026",

    eventUrlTemplate: "https://www.paddypower.com/football/world-cup-2026/{home}-v-{away}",

  },

  bet365: {

    urlTemplateEnv: "WC_SCRAPE_BET365_MATCH_URL_TEMPLATE",

    region: "uk",

    defaultTemplate: "https://www.bet365.com/#/AC/B1/C1/D1002/E89296537/F3/",

    eventUrlTemplate: "https://www.bet365.com/#/AC/B1/C1/D1002/E89296537/F3/I{eventId}/",

  },

  skybet: {

    urlTemplateEnv: "WC_SCRAPE_SKYBET_MATCH_URL_TEMPLATE",

    region: "uk",

    defaultTemplate: "https://skybet.com/football/world-cup",

    eventUrlTemplate: "https://skybet.com/football/world-cup/{home}-v-{away}",

  },

};



/**

 * @param {string} bookKey

 * @param {{ homeTeam?: string, awayTeam?: string, eventId?: string }} meta

 */

/**
 * @param {string} template
 * @param {{ homeTeam?: string, awayTeam?: string, eventId?: string }} meta
 */
export function applyWcMatchPlayerPropsUrlTemplate(template, meta = {}) {
  const tpl = String(template || "").trim();
  if (!tpl) return null;

  const slug = (s) =>
    String(s || "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");

  const homeAbbr = String(meta.homeTeam || "").toUpperCase().slice(0, 3);
  const awayAbbr = String(meta.awayTeam || "").toUpperCase().slice(0, 3);
  const homeTeam = getWcTeamByAbbr(homeAbbr);
  const awayTeam = getWcTeamByAbbr(awayAbbr);

  return tpl
    .replace(/\{eventId\}/gi, String(meta.eventId || ""))
    .replace(/\{home\}/gi, slug(homeTeam?.name || meta.homeTeam))
    .replace(/\{away\}/gi, slug(awayTeam?.name || meta.awayTeam))
    .replace(/\{homeAbbr\}/gi, homeAbbr)
    .replace(/\{awayAbbr\}/gi, awayAbbr);
}

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



  return applyWcMatchPlayerPropsUrlTemplate(template, meta);

}

/**
 * Primary template plus per-fixture event URL fallback (Phase 1).
 * @param {string} bookKey
 * @param {{ homeTeam?: string, awayTeam?: string, eventId?: string }} [meta]
 */
export function listWcMatchPlayerPropsScrapeUrls(bookKey, meta = {}) {
  const cfg = WC_MATCH_PLAYER_PROP_BOOKS[bookKey];
  if (!cfg || !isWcGoldenBootBookEnabled(bookKey)) return [];

  const urls = [];
  const primary = resolveWcMatchPlayerPropsBookUrl(bookKey, meta);
  if (primary) urls.push(primary);

  const eventId = String(meta.eventId || "").trim();
  const eventTpl = cfg.eventUrlTemplate;
  if (eventId && eventTpl) {
    const eventUrl = applyWcMatchPlayerPropsUrlTemplate(eventTpl, meta);
    if (eventUrl && !urls.includes(eventUrl)) urls.push(eventUrl);
  }

  return urls;
}



/**

 * @returns {string[]}

 */

export function listEnabledWcMatchPlayerPropBooks() {
  const fromMatchCfg = Object.keys(WC_MATCH_PLAYER_PROP_BOOKS).filter((k) =>
    isWcGoldenBootBookEnabled(k),
  );
  if (fromMatchCfg.length) return fromMatchCfg;
  return listEnabledWcGoldenBootBooks();
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
  /** @type {Record<string, boolean>} */
  const goldenBoot = {};
  for (const key of Object.keys(WC_GOLDEN_BOOT_BOOKS)) {
    goldenBoot[key] = isWcGoldenBootBookEnabled(key);
  }

  return {
    goldenBootSourcesRegistered: Object.keys(WC_GOLDEN_BOOT_BOOKS).length,
    goldenBootSourcesEnabled: listEnabledWcGoldenBootBooks().length,
    goldenBoot,
    regions: {
      us: isWcBookRegionEnabled("us"),
      uk: isWcBookRegionEnabled("uk"),
      agg: isWcBookRegionEnabled("agg"),
      media: isWcBookRegionEnabled("media"),
    },
    env: {
      WC_SCRAPE_UK: getEnv("WC_SCRAPE_UK", { treatEmptyAsMissing: false }) ?? "(prod default on)",
      WC_SCRAPE_AGG: getEnv("WC_SCRAPE_AGG", { treatEmptyAsMissing: false }) ?? "(prod default on)",
      WC_SCRAPE_MEDIA: getEnv("WC_SCRAPE_MEDIA", { treatEmptyAsMissing: false }) ?? "(prod default on)",
    },
  };
}


