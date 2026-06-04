/**
 * Sequential book scrape runner with backoff + structured observability logs.
 */

import {
  WC_BOOK_SCRAPE_MAX_RETRIES,
  delayBetweenWcBookScrapes,
  listEnabledWcGoldenBootBooks,
  wcBookRegion,
} from "./wcBookScrapePolicy.js";

/**
 * @param {string} market
 * @param {string} bookKey
 */
function scrapeLogEvent(market) {
  return market === "match_props" ? "wc_match_props_scrape_book" : "wc_golden_boot_scrape_book";
}

/**
 * @template T
 * @param {object} opts
 * @param {string} opts.market
 * @param {string} opts.bookKey
 * @param {number} opts.bookIndex
 * @param {() => Promise<T & { ok: boolean, rows?: unknown[], markets?: Record<string, unknown[]>, error?: string | null }>} opts.scrapeOnce
 */
export async function runWcBookScrapeWithBackoff(opts) {
  const { market, bookKey, bookIndex, scrapeOnce } = opts;
  const event = scrapeLogEvent(market);
  const started = Date.now();
  let lastError = "unknown";
  let attempts = 0;

  for (let attempt = 0; attempt <= WC_BOOK_SCRAPE_MAX_RETRIES; attempt++) {
    attempts = attempt + 1;
    try {
      const result = await scrapeOnce();
      const latencyMs = Date.now() - started;
      const rowCount = Array.isArray(result.rows)
        ? result.rows.length
        : result.markets?.anytime_scorer?.length ?? 0;

      console.log(
        JSON.stringify({
          event,
          market,
          book: bookKey,
          region: wcBookRegion(bookKey),
          ok: Boolean(result.ok),
          rowCount,
          latencyMs,
          attempts,
          error: result.ok ? null : result.error || "scrape_failed",
        }),
      );

      return { ...result, latencyMs, attempts };
    } catch (err) {
      lastError = err?.message || "exception";
      if (attempt < WC_BOOK_SCRAPE_MAX_RETRIES) {
        await delayBetweenWcBookScrapes(bookIndex, { hadError: true });
      }
    }
  }

  const latencyMs = Date.now() - started;
  console.log(
    JSON.stringify({
      event,
      market,
      book: bookKey,
      region: wcBookRegion(bookKey),
      ok: false,
      rowCount: 0,
      latencyMs,
      attempts,
      error: lastError,
    }),
  );

  return {
    book: bookKey,
    ok: false,
    rows: [],
    markets: {},
    error: lastError,
    latencyMs,
    attempts,
  };
}

/**
 * Scrape all Golden Boot books with pacing between requests.
 * @param {(bookKey: string, bookIndex: number) => Promise<import("./wcGoldenBootConsensus.js").BookGoldenBootResult>} scrapeFn
 */
export async function scrapeAllGoldenBootBooksPaced(scrapeFn) {
  const books = listEnabledWcGoldenBootBooks();
  /** @type {import("./wcGoldenBootConsensus.js").BookGoldenBootResult[]} */
  const results = [];

  for (let i = 0; i < books.length; i++) {
    if (i > 0) await delayBetweenWcBookScrapes(i - 1);
    results.push(await scrapeFn(books[i], i));
  }

  return results;
}
