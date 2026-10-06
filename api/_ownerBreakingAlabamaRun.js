/**
 * Poll Alabama football RSS → score → dedupe → owner Web Push.
 */

import { getDurableJson, setDurableJson } from "./_durableStore.js";
import { getEnv } from "./_env.js";
import { parseRssItems } from "../shared/transferAlerts/parseRss.js";
import { rankAlabamaAlerts } from "../shared/ownerBreaking/alabamaScore.js";
import {
  formatOwnerBreakingBody,
  loadOwnerAlertPrefs,
  alabamaAlertPassesPrefs,
  sendOwnerWebPush,
} from "./_ownerBreakingPush.js";

const SEEN_KEY = "owner_breaking:alabama_seen_v1";
const SEEN_TTL_SECONDS = 5 * 24 * 60 * 60;
const DEFAULT_MAX_SEND = 2;

const UA =
  "UnderReviewOwnerBreaking/1.0 (+https://under-review.app; alabama football owner alerts)";

/**
 * Public Google News RSS — same pattern as transfer alerts. No X scrape.
 * @type {{ id: string, label: string, url: string, weight: number }[]}
 */
export const ALABAMA_FEEDS = [
  {
    id: "gnews_alabama_signal",
    label: "Alabama football signal",
    url:
      "https://news.google.com/rss/search?hl=en-US&gl=US&ceid=US:en&q=" +
      encodeURIComponent(
        '("Alabama" OR "Crimson Tide") (football OR injury OR injured OR roster OR "transfer portal" OR coach OR coaching OR starter OR sidelined OR "depth chart")',
      ),
    weight: 1.2,
  },
  {
    id: "gnews_alabama_injury",
    label: "Alabama injury / availability",
    url:
      "https://news.google.com/rss/search?hl=en-US&gl=US&ceid=US:en&q=" +
      encodeURIComponent(
        '"Alabama" (injury OR injured OR "ruled out" OR questionable OR doubtful OR concussion OR surgery) football',
      ),
    weight: 1.35,
  },
];

/**
 * @param {{ fetchImpl?: typeof fetch }} [opts]
 */
export async function fetchAlabamaFeedItems(opts = {}) {
  const fetchImpl = opts.fetchImpl || fetch;
  /** @type {import("../shared/transferAlerts/parseRss.js").RawFeedItem[]} */
  const items = [];
  /** @type {object[]} */
  const feedResults = [];

  for (const feed of ALABAMA_FEEDS) {
    try {
      const res = await fetchImpl(feed.url, {
        headers: { "User-Agent": UA, Accept: "application/rss+xml, application/xml, text/xml, */*" },
        signal: AbortSignal.timeout(12_000),
      });
      if (!res.ok) {
        feedResults.push({ id: feed.id, ok: false, status: res.status });
        continue;
      }
      const xml = await res.text();
      const parsed = parseRssItems(xml, {
        id: feed.id,
        label: feed.label,
        weight: feed.weight,
      });
      items.push(...parsed);
      feedResults.push({ id: feed.id, ok: true, count: parsed.length });
    } catch (err) {
      feedResults.push({
        id: feed.id,
        ok: false,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return { items, feedResults };
}

async function loadSeen() {
  const raw = await getDurableJson(SEEN_KEY);
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  /** @type {Record<string, number>} */
  const out = {};
  for (const [k, v] of Object.entries(raw)) {
    const n = Number(v);
    if (Number.isFinite(n)) out[k] = n;
  }
  return out;
}

/**
 * @param {Record<string, number>} seen
 */
async function saveSeen(seen) {
  const now = Date.now();
  const cutoff = now - SEEN_TTL_SECONDS * 1000;
  /** @type {Record<string, number>} */
  const pruned = {};
  for (const [k, v] of Object.entries(seen)) {
    if (v >= cutoff) pruned[k] = v;
  }
  await setDurableJson(SEEN_KEY, pruned, { ttlSeconds: SEEN_TTL_SECONDS });
}

/**
 * @param {{ dryRun?: boolean, maxSend?: number, fetchImpl?: typeof fetch }} [opts]
 */
export async function runAlabamaBreakingTick(opts = {}) {
  const dryRun =
    opts.dryRun === true ||
    String(getEnv("OWNER_BREAKING_ALABAMA_DRY_RUN") || "").trim() === "1";
  const maxSend = Math.max(
    1,
    Number(opts.maxSend) ||
      Number(getEnv("OWNER_BREAKING_ALABAMA_MAX_SEND") || DEFAULT_MAX_SEND) ||
      DEFAULT_MAX_SEND,
  );

  const enabled = String(getEnv("OWNER_BREAKING_ALABAMA") || "1").trim() !== "0";
  if (!enabled) {
    return { ok: true, skipped: true, reason: "alabama_disabled" };
  }

  const prefs = await loadOwnerAlertPrefs();
  if (!prefs.teams?.alabama) {
    return { ok: true, skipped: true, reason: "alabama_pref_off" };
  }

  const { items, feedResults } = await fetchAlabamaFeedItems(
    opts.fetchImpl ? { fetchImpl: opts.fetchImpl } : {},
  );
  const ranked = rankAlabamaAlerts(items, { limit: maxSend * 4 }).filter((a) =>
    alabamaAlertPassesPrefs(a, prefs).ok,
  );
  const seen = await loadSeen();
  const now = Date.now();

  const fresh = ranked.filter((a) => !seen[a.id]).slice(0, maxSend);
  /** @type {object[]} */
  const sent = [];

  for (const alert of fresh) {
    const body = formatOwnerBreakingBody({
      sport: "cfb",
      source: "Other",
      text: alert.title,
    });
    if (dryRun) {
      seen[alert.id] = now;
      sent.push({ id: alert.id, title: alert.title, score: alert.score, dryRun: true });
      continue;
    }

    const push = await sendOwnerWebPush({
      body: `Alabama · ${alert.title}`,
      url: alert.link || "/",
      urgency: alert.priority >= 4 ? "high" : "normal",
    });
    const delivered = Boolean(push.ok);
    const onlyConfigSkip = push.skipped && !push.ok;
    if (delivered || onlyConfigSkip) seen[alert.id] = now;
    sent.push({
      id: alert.id,
      title: alert.title,
      score: alert.score,
      preview: body,
      push,
    });
  }

  await saveSeen(seen);

  const summary = {
    ok: true,
    dryRun,
    feedsOk: feedResults.filter((f) => f.ok).length,
    feedsFail: feedResults.filter((f) => !f.ok).length,
    items: items.length,
    ranked: ranked.length,
    fresh: fresh.length,
    sent: sent.length,
    feedResults,
    alerts: sent,
  };

  console.log(
    JSON.stringify({
      event: "owner_breaking_alabama_tick",
      dryRun,
      items: items.length,
      ranked: ranked.length,
      sent: sent.length,
    }),
  );

  return summary;
}
