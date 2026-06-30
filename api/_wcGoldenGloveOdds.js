/**
 * World Cup Golden Glove — Goal.com editorial scrape → KV (mirrors Golden Boot read path).
 */

import { getDurableJson, setDurableJson } from "./_durableStore.js";
import { scrapeGoalPage, isGoalScrapeEnabled } from "./_goalBettingData.js";
import { getGoalBettingPage } from "../shared/goalBettingRegistry.js";
import {
  WC_GOLDEN_GLOVE_KV_KEY,
  WC_GOLDEN_GLOVE_TTL_SECONDS,
} from "../shared/wc2026PlayerConstants.js";
import { enrichGoldenBootRowsWithNation } from "../shared/wcGoldenBootNationResolve.js";
import { sortGoldenBootRows } from "../shared/wcPlayerOddsFreshness.js";
import { WC_GOLDEN_GLOVE_SEED_ROWS } from "../src/data/wc2026GoldenGloveSeed.js";
import { attachGoldenGloveFreshness } from "../shared/wcGoldenGloveFreshness.js";
import { isWcGoatPrimaryEnabled } from "../shared/wcBdlPolicy.js";

/**
 * @param {Array<{ label?: string, odds?: string, team?: string }>} goalRows
 */
export function goalRowsToGoldenGloveRows(goalRows) {
  return (goalRows || [])
    .map((r, i) => ({
      name: String(r.label || "").trim(),
      americanOdds: String(r.odds || "").trim(),
      nationAbbr: r.team ? String(r.team).trim().toUpperCase().slice(0, 3) : undefined,
      impliedRank: i + 1,
    }))
    .filter((r) => r.name && r.americanOdds);
}

/**
 * @param {Record<string, unknown>} payload
 */
async function writeGoldenGloveKv(payload) {
  await setDurableJson(WC_GOLDEN_GLOVE_KV_KEY, payload, {
    ttlSeconds: WC_GOLDEN_GLOVE_TTL_SECONDS,
  });
  console.log(
    JSON.stringify({
      event: "wc_golden_glove_cached",
      rowCount: Array.isArray(payload.rows) ? payload.rows.length : 0,
      source: payload.source,
    }),
  );
}

/**
 * Cron: Goal.com Golden Glove page → KV. Serves stale KV on failure.
 */
export async function scrapeAndCacheWcGoldenGlove() {
  const nowMs = Date.now();
  const cached = await getDurableJson(WC_GOLDEN_GLOVE_KV_KEY);

  // GOAT primary: BallDontLie futures first. Goal.com / seed are backup only.
  if (isWcGoatPrimaryEnabled()) {
    try {
      const { scrapeAndCacheWcBdlGoldenGlove } = await import("./_wcBdlData.js");
      const bdl = await scrapeAndCacheWcBdlGoldenGlove();
      if (bdl?.ok && bdl?.rows?.length) {
        return { ok: true, rows: bdl.rows, source: "balldontlie", servedStale: false, error: null };
      }
      console.log(
        JSON.stringify({
          event: "wc_golden_glove_bdl_exhausted",
          error: bdl?.error || "bdl_no_rows",
        }),
      );
    } catch (err) {
      console.warn("[wc-golden-glove] BDL futures probe failed, falling back:", err?.message || err);
    }
  }

  const page = getGoalBettingPage("golden_glove");

  /** @type {Array<{ name: string, americanOdds: string, nationAbbr?: string, impliedRank?: number }>} */
  let rows = [];
  let source = "goal.com";
  let error = null;

  if (page && isGoalScrapeEnabled()) {
    try {
      const scraped = await scrapeGoalPage(page);
      if (scraped.ok && scraped.rows?.length) {
        rows = enrichGoldenBootRowsWithNation(goalRowsToGoldenGloveRows(scraped.rows));
      } else {
        error = scraped.error || "goal_parse_empty";
      }
    } catch (err) {
      error = err?.message || "goal_scrape_failed";
    }
  } else {
    error = "goal_disabled_or_missing_page";
  }

  rows = sortGoldenBootRows(rows, 24);

  if (rows.length < 4) {
    const seed = enrichGoldenBootRowsWithNation(WC_GOLDEN_GLOVE_SEED_ROWS);
    rows = sortGoldenBootRows(rows.length ? [...rows, ...seed] : seed, 24);
    source = rows.length && error ? "goal.com+seed" : "seed";
  }

  if (rows.length >= 4) {
    await writeGoldenGloveKv({
      lastUpdated: nowMs,
      market: "golden_glove",
      source,
      booksUsed: source.includes("goal") ? ["goal.com"] : ["seed"],
      rows,
      error: error || undefined,
    });
    return { ok: true, rows, source, servedStale: false, error: null };
  }

  if (cached?.rows?.length) {
    return {
      ok: false,
      rows: cached.rows,
      source: cached.source,
      servedStale: true,
      error: error || "all_sources_empty",
    };
  }

  const seedOnly = enrichGoldenBootRowsWithNation(WC_GOLDEN_GLOVE_SEED_ROWS);
  await writeGoldenGloveKv({
    lastUpdated: nowMs,
    market: "golden_glove",
    source: "seed",
    booksUsed: ["seed"],
    rows: seedOnly,
  });
  return { ok: true, rows: seedOnly, source: "seed", servedStale: false, error };
}

/**
 * @param {number} [nowMs]
 */
export async function readWcGoldenGloveFromKv(nowMs = Date.now()) {
  const cached = await getDurableJson(WC_GOLDEN_GLOVE_KV_KEY);
  return attachGoldenGloveFreshness(cached, nowMs);
}

/**
 * @param {number} [nowMs]
 */
export async function getWcGoldenGlovePayload(nowMs = Date.now()) {
  const kv = await readWcGoldenGloveFromKv(nowMs);
  return {
    ok: Boolean(kv?.rows?.length),
    goldenGlove: kv,
    rowCount: Array.isArray(kv?.rows) ? kv.rows.length : 0,
    source: kv?.source || null,
    stale: Boolean(kv?.stale),
  };
}
