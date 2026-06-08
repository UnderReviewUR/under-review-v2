/**
 * Golden Boot / top goalscorer — 25+ source registry (books, UK, aggregators, media).
 * Each source is attempted on cron scrape; failures are logged and skipped.
 */

/** @typedef {"us" | "uk" | "agg" | "media"} WcGbSourceRegion */
/** @typedef {"generic_html" | "uk_fractional" | "aggregator" | "research_prose" | "media_mixed"} WcGbParseProfile */

/**
 * @typedef {object} WcGoldenBootSourceConfig
 * @property {string} label
 * @property {WcGbSourceRegion} region
 * @property {WcGbParseProfile} parseProfile
 * @property {string} envFlag
 * @property {string} [urlEnv]
 * @property {string} [defaultUrl]
 * @property {string} [fallbackUrl]
 */

/** @type {Record<string, WcGoldenBootSourceConfig>} */
export const WC_GOLDEN_BOOT_SOURCE_REGISTRY = {
  draftkings: {
    label: "DraftKings",
    region: "us",
    parseProfile: "generic_html",
    envFlag: "WC_SCRAPE_DK",
    urlEnv: "WC_SCRAPE_DK_URL",
    defaultUrl:
      "https://sportsbook.draftkings.com/leagues/soccer/world-cup-2026?category=goalscorer&subcategory=top-goalscorer",
  },
  fanduel: {
    label: "FanDuel",
    region: "us",
    parseProfile: "research_prose",
    envFlag: "WC_SCRAPE_FD",
    urlEnv: "WC_SCRAPE_FD_URL",
    defaultUrl: "https://www.fanduel.com/research/world-cup-golden-boot-betting-explained",
    fallbackUrl: "https://sportsbook.fanduel.com/soccer/fifa-world-cup-2026",
  },
  betmgm: {
    label: "BetMGM",
    region: "us",
    parseProfile: "generic_html",
    envFlag: "WC_SCRAPE_MGM",
    urlEnv: "WC_SCRAPE_MGM_URL",
    defaultUrl: "https://sports.betmgm.com/en/sports/soccer-4/fifa-world-cup-2026",
  },
  caesars: {
    label: "Caesars",
    region: "us",
    parseProfile: "generic_html",
    envFlag: "WC_SCRAPE_CAESARS",
    urlEnv: "WC_SCRAPE_CAESARS_URL",
    defaultUrl: "https://www.caesars.com/sportsbook-and-casino/soccer",
  },
  betrivers: {
    label: "BetRivers",
    region: "us",
    parseProfile: "generic_html",
    envFlag: "WC_SCRAPE_BETRIVERS",
    urlEnv: "WC_SCRAPE_BETRIVERS_URL",
    defaultUrl: "https://www.betrivers.com/?page=sportsbook&group=1000093616&type=matches",
  },
  pointsbet: {
    label: "PointsBet",
    region: "us",
    parseProfile: "generic_html",
    envFlag: "WC_SCRAPE_POINTSBET",
    urlEnv: "WC_SCRAPE_POINTSBET_URL",
    defaultUrl: "https://pointsbet.com/sports/soccer/FIFA-World-Cup",
  },
  paddypower: {
    label: "Paddy Power",
    region: "uk",
    parseProfile: "uk_fractional",
    envFlag: "WC_SCRAPE_PADDY",
    urlEnv: "WC_SCRAPE_PADDY_URL",
    defaultUrl: "https://www.paddypower.com/football/world-cup-2026",
  },
  bet365: {
    label: "Bet365",
    region: "uk",
    parseProfile: "uk_fractional",
    envFlag: "WC_SCRAPE_BET365",
    urlEnv: "WC_SCRAPE_BET365_URL",
    defaultUrl: "https://www.bet365.com/#/AC/B1/C1/D1002/E89296537/F3/",
  },
  williamhill: {
    label: "William Hill",
    region: "uk",
    parseProfile: "uk_fractional",
    envFlag: "WC_SCRAPE_WH",
    urlEnv: "WC_SCRAPE_WH_URL",
    defaultUrl:
      "https://sports.williamhill.com/betting/en-gb/football/competitions/OB_TY52321/World-Cup-2026",
  },
  skybet: {
    label: "Sky Bet",
    region: "uk",
    parseProfile: "uk_fractional",
    envFlag: "WC_SCRAPE_SKYBET",
    urlEnv: "WC_SCRAPE_SKYBET_URL",
    defaultUrl: "https://skybet.com/football/world-cup",
  },
  ladbrokes: {
    label: "Ladbrokes",
    region: "uk",
    parseProfile: "uk_fractional",
    envFlag: "WC_SCRAPE_LADBROKES",
    urlEnv: "WC_SCRAPE_LADBROKES_URL",
    defaultUrl: "https://sports.ladbrokes.com/football/world-cup",
  },
  coral: {
    label: "Coral",
    region: "uk",
    parseProfile: "uk_fractional",
    envFlag: "WC_SCRAPE_CORAL",
    urlEnv: "WC_SCRAPE_CORAL_URL",
    defaultUrl: "https://sports.coral.co.uk/football/world-cup",
  },
  betfred: {
    label: "Betfred",
    region: "uk",
    parseProfile: "uk_fractional",
    envFlag: "WC_SCRAPE_BETFRED",
    urlEnv: "WC_SCRAPE_BETFRED_URL",
    defaultUrl: "https://www.betfred.com/sports/football/world-cup",
  },
  betway: {
    label: "Betway",
    region: "uk",
    parseProfile: "uk_fractional",
    envFlag: "WC_SCRAPE_BETWAY",
    urlEnv: "WC_SCRAPE_BETWAY_URL",
    defaultUrl: "https://sports.betway.com/en/sports/grp/soccer/world-cup",
  },
  unibet: {
    label: "Unibet",
    region: "uk",
    parseProfile: "uk_fractional",
    envFlag: "WC_SCRAPE_UNIBET",
    urlEnv: "WC_SCRAPE_UNIBET_URL",
    defaultUrl: "https://www.unibet.com/betting/sports/filter/football/world_cup",
  },
  betfair: {
    label: "Betfair",
    region: "uk",
    parseProfile: "uk_fractional",
    envFlag: "WC_SCRAPE_BETFAIR",
    urlEnv: "WC_SCRAPE_BETFAIR_URL",
    defaultUrl: "https://www.betfair.com/sport/football/world-cup",
  },
  oddschecker: {
    label: "OddsChecker",
    region: "agg",
    parseProfile: "aggregator",
    envFlag: "WC_SCRAPE_ODDSCHECKER",
    urlEnv: "WC_SCRAPE_ODDSCHECKER_URL",
    defaultUrl: "https://www.oddschecker.com/us/soccer/world-cup",
    fallbackUrl:
      "https://www.oddschecker.com/football/world-cup/world-cup-top-goalscorer",
  },
  covers: {
    label: "Covers",
    region: "agg",
    parseProfile: "media_mixed",
    envFlag: "WC_SCRAPE_COVERS",
    urlEnv: "WC_SCRAPE_COVERS_URL",
    defaultUrl: "https://www.covers.com/world-cup",
  },
  oddsshark: {
    label: "OddsShark",
    region: "media",
    parseProfile: "media_mixed",
    envFlag: "WC_SCRAPE_ODDSSHARK",
    urlEnv: "WC_SCRAPE_ODDSSHARK_URL",
    defaultUrl: "https://www.oddsshark.com/soccer/world-cup/odds-to-win-2026",
    fallbackUrl: "https://www.oddsshark.com/soccer/world-cup",
  },
  vegasinsider: {
    label: "VegasInsider",
    region: "agg",
    parseProfile: "media_mixed",
    envFlag: "WC_SCRAPE_VEGASINSIDER",
    urlEnv: "WC_SCRAPE_VEGASINSIDER_URL",
    defaultUrl: "https://www.vegasinsider.com/soccer/world-cup-odds/",
  },
  actionnetwork: {
    label: "Action Network",
    region: "media",
    parseProfile: "media_mixed",
    envFlag: "WC_SCRAPE_ACTIONNETWORK",
    urlEnv: "WC_SCRAPE_ACTIONNETWORK_URL",
    defaultUrl: "https://www.actionnetwork.com/soccer/fifa-world-cup-odds",
  },
  vsin: {
    label: "VSiN",
    region: "media",
    parseProfile: "media_mixed",
    envFlag: "WC_SCRAPE_VSIN",
    urlEnv: "WC_SCRAPE_VSIN_URL",
    defaultUrl: "https://vsin.com/world-cup-odds/",
  },
  sky_sports: {
    label: "Sky Sports",
    region: "media",
    parseProfile: "media_mixed",
    envFlag: "WC_SCRAPE_SKY_SPORTS",
    urlEnv: "WC_SCRAPE_SKY_SPORTS_URL",
    defaultUrl: "https://www.skysports.com/football/odds/world-cup",
  },
  sportingnews: {
    label: "Sporting News",
    region: "media",
    parseProfile: "media_mixed",
    envFlag: "WC_SCRAPE_SPORTINGNEWS",
    urlEnv: "WC_SCRAPE_SPORTINGNEWS_URL",
    defaultUrl: "https://www.sportingnews.com/us/betting/news/world-cup-odds",
  },
  pickswise: {
    label: "Pickswise",
    region: "media",
    parseProfile: "media_mixed",
    envFlag: "WC_SCRAPE_PICKSWISE",
    urlEnv: "WC_SCRAPE_PICKSWISE_URL",
    defaultUrl: "https://www.pickswise.com/sportsbook/world-cup-odds/",
  },
  dimers: {
    label: "Dimers",
    region: "media",
    parseProfile: "media_mixed",
    envFlag: "WC_SCRAPE_DIMERS",
    urlEnv: "WC_SCRAPE_DIMERS_URL",
    defaultUrl: "https://dimers.com/news/world-cup-odds",
  },
  rotowire: {
    label: "RotoWire",
    region: "media",
    parseProfile: "media_mixed",
    envFlag: "WC_SCRAPE_ROTOWIRE",
    urlEnv: "WC_SCRAPE_ROTOWIRE_URL",
    defaultUrl: "https://www.rotowire.com/betting/soccer/world-cup-odds.php",
  },
};

/** @deprecated — use WC_GOLDEN_BOOT_SOURCE_REGISTRY */
export const WC_GOLDEN_BOOT_BOOKS = WC_GOLDEN_BOOT_SOURCE_REGISTRY;

/**
 * @param {string} bookKey
 */
export function getWcGoldenBootSourceConfig(bookKey) {
  return WC_GOLDEN_BOOT_SOURCE_REGISTRY[String(bookKey || "").toLowerCase()] || null;
}

export const WC_GOLDEN_BOOT_SOURCE_COUNT = Object.keys(WC_GOLDEN_BOOT_SOURCE_REGISTRY).length;
