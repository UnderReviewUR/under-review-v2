/**
 * Multi-book Golden Boot scrapers (US default + UK/AGG behind flags).
 */

import {
  fetchBookPageHtml,
  parseGoldenBootRowsForBook,
} from "./_wcBookScrapeCommon.js";
import {
  isWcGoldenBootBookEnabled,
  resolveWcGoldenBootBookUrl,
} from "../shared/wcBookScrapePolicy.js";
import {
  runWcBookScrapeWithBackoff,
  scrapeAllGoldenBootBooksPaced,
} from "../shared/wcBookScrapeRunner.js";

/**
 * @param {string} bookKey
 * @param {number} [bookIndex]
 */
export async function scrapeGoldenBootForBook(bookKey, bookIndex = 0) {
  if (!isWcGoldenBootBookEnabled(bookKey)) {
    return { book: bookKey, ok: false, rows: [], error: "book_disabled" };
  }

  const url = resolveWcGoldenBootBookUrl(bookKey);
  if (!url) {
    return { book: bookKey, ok: false, rows: [], error: "missing_url" };
  }

  return runWcBookScrapeWithBackoff({
    market: "golden_boot",
    bookKey,
    bookIndex,
    scrapeOnce: async () => {
      const fetched = await fetchBookPageHtml(url);
      if (!fetched.ok || !fetched.html) {
        return {
          book: bookKey,
          ok: false,
          rows: [],
          error: fetched.error || "fetch_failed",
        };
      }

      const rows = parseGoldenBootRowsForBook(fetched.html, bookKey);
      if (!rows.length) {
        return { book: bookKey, ok: false, rows: [], error: "parse_empty" };
      }

      return { book: bookKey, ok: true, rows, error: null };
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
