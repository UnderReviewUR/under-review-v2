/**
 * Public X timelines via FxTwitter — full tweet text, no official X API key.
 * Docs: GET https://api.fxtwitter.com/2/profile/{handle}/statuses
 */

import { cleanWireText } from "../shared/transferAlerts/formatSpoiler.js";
import { TRANSFER_X_ACCOUNTS } from "../shared/transferAlerts/sources.js";

const FETCH_TIMEOUT_MS = 12_000;
const UA =
  "UnderReviewTransferAlerts/1.0 (+https://under-review.app; soccer transfer bounce)";
const FX_BASE = "https://api.fxtwitter.com/2/profile";

/**
 * Split Ornstein-style posts: first sentence = spoiler, rest = body.
 * @param {string} text
 * @returns {{ title: string, description: string }}
 */
export function splitTweetCopy(text) {
  const cleaned = cleanWireText(text);
  const parts = cleaned.split(/(?<=[.!?])\s+/).filter(Boolean);
  if (parts.length < 2) return { title: cleaned, description: "" };
  return {
    title: parts[0],
    description: parts.slice(1).join(" "),
  };
}

/**
 * @param {object} status
 * @param {{ handle: string, reporterId: string, barcaHeavy?: boolean }} account
 * @returns {import("../shared/transferAlerts/parseRss.js").RawFeedItem | null}
 */
export function xStatusToFeedItem(status, account) {
  if (!status || status.type !== "status") return null;
  if (status.replying_to) return null;
  const text = String(status.text || status.raw_text?.text || "").trim();
  if (text.length < 24) return null;
  const { title, description } = splitTweetCopy(text);
  const created = status.created_at ? new Date(status.created_at) : null;
  const pubDate =
    created && Number.isFinite(created.getTime()) ? created.toUTCString() : null;

  return {
    guid: String(status.id || status.url || title).slice(0, 500),
    title,
    link: String(status.url || `https://x.com/${account.handle}`).trim(),
    pubDate,
    source: `@${account.handle}`,
    description: description.slice(0, 1200),
    feedId: `x_${account.reporterId}`,
    feedLabel: `${account.handle} on X`,
    feedWeight: 1.9,
    barcaHeavyFeed: Boolean(account.barcaHeavy),
    reporterId: account.reporterId,
    native: true,
  };
}

/**
 * @param {object} payload
 * @param {{ handle: string, reporterId: string, barcaHeavy?: boolean }} account
 */
export function parseFxTimeline(payload, account) {
  const rows = Array.isArray(payload?.results) ? payload.results : [];
  /** @type {import("../shared/transferAlerts/parseRss.js").RawFeedItem[]} */
  const items = [];
  for (const row of rows) {
    const item = xStatusToFeedItem(row, account);
    if (item) items.push(item);
  }
  return items;
}

/**
 * @param {string} url
 */
async function fetchJson(url) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: {
        Accept: "application/json",
        "User-Agent": UA,
      },
      redirect: "follow",
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(t);
  }
}

/**
 * @param {{ accounts?: typeof TRANSFER_X_ACCOUNTS, fetchJsonImpl?: typeof fetchJson }} [opts]
 * @returns {Promise<{ items: import("../shared/transferAlerts/parseRss.js").RawFeedItem[], feedResults: object[] }>}
 */
export async function fetchTransferXTimelines(opts = {}) {
  const accounts = opts.accounts || TRANSFER_X_ACCOUNTS;
  const doFetch = opts.fetchJsonImpl || fetchJson;
  const feedResults = [];
  /** @type {import("../shared/transferAlerts/parseRss.js").RawFeedItem[]} */
  const items = [];

  await Promise.all(
    accounts.map(async (account) => {
      const url = `${FX_BASE}/${encodeURIComponent(account.handle)}/statuses?count=10`;
      try {
        const payload = await doFetch(url);
        const parsed = parseFxTimeline(payload, account);
        items.push(...parsed);
        feedResults.push({
          id: `x_${account.reporterId}`,
          ok: true,
          count: parsed.length,
          via: url,
        });
      } catch (err) {
        feedResults.push({
          id: `x_${account.reporterId}`,
          ok: false,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }),
  );

  return { items, feedResults };
}
