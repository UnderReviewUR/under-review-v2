/**
 * Multi-book Golden Boot scrapers (DK / FD / BetMGM + UK + aggregators behind flags).
 */

import {
  fetchBookPageHtml,
  parseGoldenBootRowsFromHtml,
  parseGoldenBootRowsFromJson,
} from "./_wcBookScrapeCommon.js";
import {
  isWcGoldenBootBookEnabled,
  listEnabledWcGoldenBootBooks,
  resolveWcGoldenBootBookUrl,
} from "../shared/wcBookScrapePolicy.js";

/**
 * @param {string} bookKey
 */
export async function scrapeGoldenBootForBook(bookKey) {
  if (!isWcGoldenBootBookEnabled(bookKey)) {
    return { book: bookKey, ok: false, rows: [], error: "book_disabled" };
  }

  const url = resolveWcGoldenBootBookUrl(bookKey);
  if (!url) {
    return { book: bookKey, ok: false, rows: [], error: "missing_url" };
  }

  const fetched = await fetchBookPageHtml(url);
  if (!fetched.ok || !fetched.html) {
    console.log(
      JSON.stringify({
        event: "wc_book_scrape_fail",
        book: bookKey,
        url,
        error: fetched.error,
        status: fetched.status,
      }),
    );
    return { book: bookKey, ok: false, rows: [], error: fetched.error || "fetch_failed" };
  }

  let rows = parseGoldenBootRowsFromHtml(fetched.html);
  if (rows.length < 5 && fetched.html.trim().startsWith("{")) {
    try {
      rows = parseGoldenBootRowsFromJson(JSON.parse(fetched.html));
    } catch {
      /* ignore */
    }
  }

  if (!rows.length) {
    return { book: bookKey, ok: false, rows: [], error: "parse_empty" };
  }

  console.log(
    JSON.stringify({
      event: "wc_book_scrape_ok",
      book: bookKey,
      rowCount: rows.length,
    }),
  );

  return { book: bookKey, ok: true, rows, error: null };
}

/**
 * Scrape all enabled books sequentially (rate-friendly).
 */
export async function scrapeAllEnabledGoldenBootBooks() {
  const books = listEnabledWcGoldenBootBooks();
  /** @type {import("../shared/wcGoldenBootConsensus.js").BookGoldenBootResult[]} */
  const results = [];

  for (const book of books) {
    const res = await scrapeGoldenBootForBook(book);
    results.push(res);
  }

  return results;
}
