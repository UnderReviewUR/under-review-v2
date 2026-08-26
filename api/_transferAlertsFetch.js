/**
 * Fetch transfer RSS feeds and parse items.
 */

import { parseRssItems } from "../shared/transferAlerts/parseRss.js";
import { TRANSFER_FEEDS, feedUrls } from "../shared/transferAlerts/sources.js";

const FETCH_TIMEOUT_MS = 12_000;
const UA =
  "UnderReviewTransferAlerts/1.0 (+https://under-review.app; soccer transfer bounce)";

/**
 * @param {string} url
 * @returns {Promise<string>}
 */
async function fetchText(url) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: {
        Accept: "application/rss+xml, application/xml, text/xml, */*",
        "User-Agent": UA,
      },
      redirect: "follow",
    });
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }
    return await res.text();
  } finally {
    clearTimeout(t);
  }
}

/**
 * @param {{ feeds?: typeof TRANSFER_FEEDS, fetchImpl?: typeof fetchText }} [opts]
 * @returns {Promise<{ items: import("../shared/transferAlerts/parseRss.js").RawFeedItem[], feedResults: object[] }>}
 */
export async function fetchTransferFeedItems(opts = {}) {
  const feeds = opts.feeds || TRANSFER_FEEDS;
  const doFetch = opts.fetchImpl || fetchText;
  const feedResults = [];
  /** @type {import("../shared/transferAlerts/parseRss.js").RawFeedItem[]} */
  const items = [];

  await Promise.all(
    feeds.map(async (feed) => {
      const urls = feedUrls(feed);
      if (!urls.length) {
        feedResults.push({ id: feed.id, ok: false, error: "no_url" });
        return;
      }
      /** @type {Error | null} */
      let lastErr = null;
      for (const url of urls) {
        try {
          const xml = await doFetch(url);
          const parsed = parseRssItems(xml, feed);
          items.push(...parsed);
          feedResults.push({
            id: feed.id,
            ok: true,
            count: parsed.length,
            via: url,
          });
          lastErr = null;
          break;
        } catch (err) {
          lastErr = err instanceof Error ? err : new Error(String(err));
        }
      }
      if (lastErr) {
        feedResults.push({
          id: feed.id,
          ok: false,
          error: lastErr.message,
        });
      }
    }),
  );

  return { items, feedResults };
}
