/**
 * Multi-book Golden Boot scrapers (US default + UK/AGG behind flags).
 */

import {
  fetchBookPageHtmlForScrape,
  parseGoldenBootRowsForBook,
} from "./_wcBookScrapeCommon.js";
import {
  isWcGoldenBootBookEnabled,
  listWcGoldenBootScrapeUrls,
} from "../shared/wcBookScrapePolicy.js";
import {
  runWcBookScrapeWithBackoff,
  scrapeAllGoldenBootBooksPaced,
} from "../shared/wcBookScrapeRunner.js";
import { enrichGoldenBootRowsWithNation } from "../shared/wcGoldenBootNationResolve.js";
import { filterGoldenBootScrapeRows } from "../shared/wcGoldenBootRowGuard.js";

const MIN_GOLDEN_BOOT_ROWS_PER_BOOK = 3;

/**
 * @param {string} bookKey
 * @param {number} [bookIndex]
 */
export async function scrapeGoldenBootForBook(bookKey, bookIndex = 0) {
  if (!isWcGoldenBootBookEnabled(bookKey)) {
    return { book: bookKey, ok: false, rows: [], error: "book_disabled" };
  }

  const urls = listWcGoldenBootScrapeUrls(bookKey);
  if (!urls.length) {
    return { book: bookKey, ok: false, rows: [], error: "missing_url" };
  }

  return runWcBookScrapeWithBackoff({
    market: "golden_boot",
    bookKey,
    bookIndex,
    scrapeOnce: async () => {
      let lastError = "parse_empty";
      /** @type {Array<{ name: string, americanOdds: string, nationAbbr?: string }>} */
      let bestRows = [];

      for (const url of urls) {
        const fetched = await fetchBookPageHtmlForScrape(url, { bookKey });
        if (!fetched.ok || !fetched.html) {
          lastError = fetched.error || "fetch_failed";
          continue;
        }

        let rows = filterGoldenBootScrapeRows(parseGoldenBootRowsForBook(fetched.html, bookKey));
        rows = enrichGoldenBootRowsWithNation(rows);
        if (rows.length > bestRows.length) bestRows = rows;
        if (rows.length >= MIN_GOLDEN_BOOT_ROWS_PER_BOOK) {
          return { book: bookKey, ok: true, rows, error: null };
        }
      }

      if (bestRows.length >= MIN_GOLDEN_BOOT_ROWS_PER_BOOK) {
        return { book: bookKey, ok: true, rows: bestRows, error: null };
      }

      return { book: bookKey, ok: false, rows: bestRows, error: lastError };
    },
  });
}

/**
 * Scrape all enabled books sequentially with rate pacing + structured logs.
 */
export async function scrapeAllEnabledGoldenBootBooks() {
  return scrapeAllGoldenBootBooksPaced((bookKey, bookIndex) =>
    scrapeGoldenBootForBook(bookKey, bookIndex),
  );
}
