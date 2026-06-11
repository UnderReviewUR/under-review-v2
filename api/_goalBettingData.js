/**
 * Goal.com US betting editorial — fetch, parse, KV cache.
 */

import { getDurableJson, setDurableJson } from "./_durableStore.js";
import { getEnv } from "./_env.js";
import { fetchBookPageHtmlForScrape } from "./_wcBookScrapeCommon.js";
import {
  GOAL_EDITORIAL_SCRAPE_INTERVAL_MS,
  GOAL_EDITORIAL_TTL_SECONDS,
  NBA_GOAL_EDITORIAL_KV_KEY,
  WC_GOAL_EDITORIAL_KV_KEY,
} from "../shared/goalBettingConstants.js";
import { listGoalBettingPagesForSport } from "../shared/goalBettingRegistry.js";
import { parseGoalBettingPage } from "../shared/goalBettingParse.js";

export function isGoalScrapeEnabled() {
  const raw = getEnv("WC_SCRAPE_GOAL", { treatEmptyAsMissing: false });
  if (raw !== undefined) {
    const v = String(raw).trim().toLowerCase();
    if (v === "0" || v === "false" || v === "no") return false;
    return v === "1" || v === "true" || v === "yes";
  }
  if (process.env.VERCEL_ENV === "production") return true;
  return String(getEnv("WC_SCRAPE_MEDIA", { treatEmptyAsMissing: false }) || "")
    .trim()
    .toLowerCase() === "1";
}

/**
 * @param {import("../shared/goalBettingRegistry.js").GoalBettingPageConfig} page
 */
export async function scrapeGoalPage(page) {
  const fetched = await fetchBookPageHtmlForScrape(page.url, { bookKey: "goal" });
  if (!fetched.ok || !fetched.html) {
    return { ...page, ok: false, rows: [], error: fetched.error || "fetch_failed" };
  }
  const parsed = parseGoalBettingPage(fetched.html, page);
  return { ...parsed, error: parsed.ok ? null : "parse_empty" };
}

/**
 * @param {"wc"|"nba"} sport
 */
export async function scrapeAndCacheGoalEditorial(sport) {
  if (!isGoalScrapeEnabled()) {
    return { ok: false, skipped: true, reason: "goal_disabled" };
  }

  const kvKey = sport === "nba" ? NBA_GOAL_EDITORIAL_KV_KEY : WC_GOAL_EDITORIAL_KV_KEY;
  const nowMs = Date.now();
  const pages = listGoalBettingPagesForSport(sport);
  /** @type {Record<string, object>} */
  const markets = {};
  const errors = [];

  for (const page of pages) {
    try {
      const result = await scrapeGoalPage(page);
      if (result.ok) {
        markets[page.id] = {
          label: result.label,
          url: result.url,
          publishedAt: result.publishedAt,
          rows: result.rows,
        };
      } else {
        errors.push(`${page.id}:${result.error}`);
      }
    } catch (err) {
      errors.push(`${page.id}:${err?.message || err}`);
    }
  }

  const cached = await getDurableJson(kvKey);
  if (!Object.keys(markets).length) {
    if (cached?.markets) {
      return {
        ok: false,
        servedStale: true,
        markets: cached.markets,
        errors: errors.join("; "),
      };
    }
    return { ok: false, servedStale: false, markets: {}, errors: errors.join("; ") };
  }

  const payload = {
    lastUpdated: nowMs,
    source: "goal.com",
    markets,
    pagesOk: Object.keys(markets).length,
    pagesAttempted: pages.length,
    errors: errors.length ? errors : undefined,
  };

  await setDurableJson(kvKey, payload, { ttlSeconds: GOAL_EDITORIAL_TTL_SECONDS });
  console.log(
    JSON.stringify({
      event: "goal_editorial_cached",
      sport,
      pagesOk: payload.pagesOk,
      markets: Object.keys(markets),
    }),
  );

  return { ok: true, markets, servedStale: false, errors: errors.join("; ") || null };
}

/**
 * @param {"wc"|"nba"} [sport]
 */
export async function readGoalEditorialFromKv(sport = "wc") {
  const kvKey = sport === "nba" ? NBA_GOAL_EDITORIAL_KV_KEY : WC_GOAL_EDITORIAL_KV_KEY;
  return getDurableJson(kvKey);
}

export { GOAL_EDITORIAL_SCRAPE_INTERVAL_MS };
