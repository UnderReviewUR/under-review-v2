/**
 * Tournament-winner outrights — aggregator/editorial scrape sources.
 */

import { getEnv } from "../api/_env.js";
import { isWcBookRegionEnabled, isWcGoldenBootBookEnabled } from "./wcBookScrapePolicy.js";

/** @typedef {"agg" | "media"} WcOutrightsAggRegion */

/**
 * @typedef {object} WcOutrightsAggregatorConfig
 * @property {string} label
 * @property {WcOutrightsAggRegion} region
 * @property {string} envFlag
 * @property {string} [urlEnv]
 * @property {string} defaultUrl
 * @property {string} [fallbackUrl]
 * @property {string} [goldenBootBookKey] — reuse GB enable gate when set
 */

/** @type {Record<string, WcOutrightsAggregatorConfig>} */
export const WC_OUTRIGHTS_AGGREGATOR_REGISTRY = {
  covers: {
    label: "Covers",
    region: "agg",
    envFlag: "WC_SCRAPE_COVERS",
    urlEnv: "WC_SCRAPE_COVERS_URL",
    defaultUrl: "https://www.covers.com/world-cup",
    goldenBootBookKey: "covers",
  },
  oddsshark: {
    label: "OddsShark",
    region: "media",
    envFlag: "WC_SCRAPE_ODDSSHARK",
    urlEnv: "WC_SCRAPE_ODDSSHARK_URL",
    defaultUrl: "https://www.oddsshark.com/soccer/world-cup/odds-to-win-2026",
    fallbackUrl: "https://www.oddsshark.com/soccer/world-cup",
    goldenBootBookKey: "oddsshark",
  },
  oddschecker: {
    label: "OddsChecker",
    region: "agg",
    envFlag: "WC_SCRAPE_ODDSCHECKER",
    urlEnv: "WC_SCRAPE_ODDSCHECKER_URL",
    defaultUrl: "https://www.oddschecker.com/us/soccer/world-cup",
    fallbackUrl:
      "https://www.oddschecker.com/football/world-cup/world-cup-top-goalscorer",
    goldenBootBookKey: "oddschecker",
  },
};

export const WC_OUTRIGHTS_AGGREGATOR_COUNT = Object.keys(WC_OUTRIGHTS_AGGREGATOR_REGISTRY).length;

/**
 * @param {string} key
 */
export function getWcOutrightsAggregatorConfig(key) {
  return WC_OUTRIGHTS_AGGREGATOR_REGISTRY[String(key || "").toLowerCase()] || null;
}

/**
 * @param {string} key
 */
export function isWcOutrightsAggregatorEnabled(key) {
  const cfg = getWcOutrightsAggregatorConfig(key);
  if (!cfg) return false;
  if (!isWcBookRegionEnabled(cfg.region)) return false;

  if (cfg.goldenBootBookKey && isWcGoldenBootBookEnabled(cfg.goldenBootBookKey)) {
    const raw = getEnv(cfg.envFlag, { treatEmptyAsMissing: false });
    if (raw !== undefined) {
      const v = String(raw).trim().toLowerCase();
      if (v === "0" || v === "false" || v === "no") return false;
    }
    return true;
  }

  const raw = getEnv(cfg.envFlag, { treatEmptyAsMissing: false });
  if (raw !== undefined) {
    const v = String(raw).trim().toLowerCase();
    if (v === "0" || v === "false" || v === "no") return false;
    return v === "1" || v === "true" || v === "yes";
  }

  return cfg.region === "agg" || cfg.region === "media";
}

/**
 * @param {string} key
 * @returns {string[]}
 */
export function listWcOutrightsAggregatorUrls(key) {
  const cfg = getWcOutrightsAggregatorConfig(key);
  if (!cfg || !isWcOutrightsAggregatorEnabled(key)) return [];

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
export function listEnabledWcOutrightsAggregators() {
  return Object.keys(WC_OUTRIGHTS_AGGREGATOR_REGISTRY).filter((k) =>
    isWcOutrightsAggregatorEnabled(k),
  );
}
