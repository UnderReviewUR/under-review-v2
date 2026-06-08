/**
 * Scrape tournament-winner outrights from Covers / OddsShark / OddsChecker hubs.
 */

import { fetchBookPageHtmlForScrape } from "./_wcBookScrapeCommon.js";
import {
  delayBetweenWcBookScrapes,
  WC_BOOK_SCRAPE_MAX_RETRIES,
} from "../shared/wcBookScrapePolicy.js";
import {
  isWcOutrightsAggregatorEnabled,
  listEnabledWcOutrightsAggregators,
  listWcOutrightsAggregatorUrls,
} from "../shared/wcOutrightsAggregatorRegistry.js";
import {
  isViableWcOutrightsMap,
  parseWcTournamentWinnerOutrightsFromHtml,
} from "../shared/wcOutrightsHtmlParse.js";

/**
 * @param {string} sourceKey
 * @param {number} [index]
 */
export async function scrapeWcOutrightsAggregator(sourceKey, index = 0) {
  if (!isWcOutrightsAggregatorEnabled(sourceKey)) {
    return { source: sourceKey, ok: false, outrights: {}, error: "aggregator_disabled" };
  }

  const urls = listWcOutrightsAggregatorUrls(sourceKey);
  if (!urls.length) {
    return { source: sourceKey, ok: false, outrights: {}, error: "missing_url" };
  }

  let lastError = "parse_empty";
  /** @type {Record<string, string>} */
  let best = {};

  for (let attempt = 0; attempt <= WC_BOOK_SCRAPE_MAX_RETRIES; attempt++) {
    for (const url of urls) {
      const fetched = await fetchBookPageHtmlForScrape(url, { bookKey: sourceKey });
      if (!fetched.ok || !fetched.html) {
        lastError = fetched.error || "fetch_failed";
        continue;
      }

      const parsed = parseWcTournamentWinnerOutrightsFromHtml(fetched.html, sourceKey);
      if (Object.keys(parsed).length > Object.keys(best).length) best = parsed;
      if (isViableWcOutrightsMap(parsed)) {
        console.log(
          JSON.stringify({
            event: "wc_outrights_agg_scrape",
            source: sourceKey,
            ok: true,
            rowCount: Object.keys(parsed).length,
            url: url.slice(0, 100),
          }),
        );
        return { source: sourceKey, ok: true, outrights: parsed, error: null };
      }
    }
    if (attempt < WC_BOOK_SCRAPE_MAX_RETRIES) {
      await delayBetweenWcBookScrapes(index, { hadError: true });
    }
  }

  if (isViableWcOutrightsMap(best)) {
    return { source: sourceKey, ok: true, outrights: best, error: null };
  }

  console.log(
    JSON.stringify({
      event: "wc_outrights_agg_scrape",
      source: sourceKey,
      ok: false,
      rowCount: Object.keys(best).length,
      error: lastError,
    }),
  );
  return { source: sourceKey, ok: false, outrights: best, error: lastError };
}

/**
 * Sequential aggregator scrape with pacing.
 */
export async function scrapeAllWcOutrightsAggregators() {
  const enabled = listEnabledWcOutrightsAggregators();
  /** @type {Array<{ source: string, ok: boolean, outrights: Record<string, string>, error: string | null }>} */
  const results = [];

  for (let i = 0; i < enabled.length; i++) {
    const key = enabled[i];
    const result = await scrapeWcOutrightsAggregator(key, i);
    results.push(result);
    await delayBetweenWcBookScrapes(i, { hadError: !result.ok });
  }

  return results;
}
