import { getDurableJson, setDurableJson } from "./_durableStore.js";
import { getEnv } from "./_env.js";
import { PGA_CHAMPIONSHIP_ODDS_CACHE_KEY } from "../shared/pgaChampionshipOddsConstants.js";
import {
  buildGolfOddsFreshness,
  getEtHour24At,
  getEtYmdAt,
  isGolfTournamentEtDay,
  shouldRefreshGolfOddsCache,
} from "../shared/golfOddsCachePolicy.js";
import { extractGolfTournamentIntentFromQuestion } from "../shared/golfTournamentIntent.js";
import { scrapePgaChampionshipOddsGraphql } from "./_pgaChampionshipOddsGraphql.js";
import { scrapePgaChampionshipOddsViaPuppeteer } from "./_pgaChampionshipOddsPuppeteer.js";
import { decorateGolfOddsWithFreshness, mergeGolfOddsWithEspnField } from "./_golfOddsApi.js";

const memCache = new Map();

/**
 * @param {{ name?: string, shortName?: string } | null | undefined} currentEvent
 */
export function isPgaChampionshipEvent(currentEvent) {
  const intent = extractGolfTournamentIntentFromQuestion(
    `${currentEvent?.name || ""} ${currentEvent?.shortName || ""}`,
  );
  if (intent?.slug === "pga_championship") return true;
  const blob = `${currentEvent?.name || ""} ${currentEvent?.shortName || ""}`.toLowerCase();
  return blob.includes("pga championship");
}

async function readCacheEntry() {
  const mem = memCache.get(PGA_CHAMPIONSHIP_ODDS_CACHE_KEY);
  if (mem) return mem;
  return getDurableJson(PGA_CHAMPIONSHIP_ODDS_CACHE_KEY);
}

async function writeCacheEntry(entry) {
  memCache.set(PGA_CHAMPIONSHIP_ODDS_CACHE_KEY, entry);
  try {
    await setDurableJson(PGA_CHAMPIONSHIP_ODDS_CACHE_KEY, entry, { ttlSeconds: 6 * 60 * 60 });
  } catch {
    /* KV optional locally */
  }
}

/**
 * Cron / manual refresh — tries GraphQL first, Puppeteer on failure or when forced.
 * @param {{ forcePuppeteer?: boolean }} [opts]
 */
export async function scrapeAndCachePgaChampionshipOdds(opts = {}) {
  const forcePuppeteer =
    opts.forcePuppeteer || String(getEnv("GOLF_PGA_ODDS_FORCE_PUPPETEER") || "").trim() === "1";
  const nowMs = Date.now();
  let payload = null;
  let scrapeMethod = "graphql";

  if (!forcePuppeteer) {
    try {
      payload = await scrapePgaChampionshipOddsGraphql();
    } catch (err) {
      console.warn("[pgaChampionshipOdds] graphql scrape failed:", err?.message || err);
    }
  }

  if (!payload) {
    scrapeMethod = "puppeteer";
    payload = await scrapePgaChampionshipOddsViaPuppeteer();
  }

  const todayEt = getEtYmdAt(nowMs);
  const currentEvent = {
    name: "PGA Championship",
    startDate: "2026-05-14",
    endDate: "2026-05-18",
    state: "in",
  };
  const entry = {
    payload: { ...payload, scrapeMethod },
    fetchedAtMs: nowMs,
    openingRefreshEtYmd:
      getEtHour24At(nowMs) >= 8 && isGolfTournamentEtDay(currentEvent, todayEt) ? todayEt : null,
  };
  await writeCacheEntry(entry);

  console.log(
    JSON.stringify({
      event: "pga_championship_odds_cached",
      scrapeMethod,
      outrights: payload.outrights?.length || 0,
      posted: payload.outrights?.filter((o) => o.odds != null).length || 0,
      providerTimestamp: payload.providerTimestamp || null,
    }),
  );

  return decorateGolfOddsWithFreshness(payload, nowMs);
}

/**
 * Read path for UR Take / golf board — never launches Puppeteer.
 * @param {{ name?: string, shortName?: string, startDate?: string, endDate?: string, state?: string } | null | undefined} currentEvent
 */
export async function getPgaChampionshipOddsForBoard(currentEvent) {
  if (!isPgaChampionshipEvent(currentEvent)) return null;

  const nowMs = Date.now();
  const cached = await readCacheEntry();

  if (!cached?.payload) return null;

  if (shouldRefreshGolfOddsCache(cached, nowMs, currentEvent)) {
    console.log(
      JSON.stringify({
        event: "pga_championship_odds_stale_cache",
        ageMinutes: Math.round((nowMs - cached.fetchedAtMs) / 60000),
        note: "awaiting cron refresh",
      }),
    );
  }

  return decorateGolfOddsWithFreshness(cached.payload, cached.fetchedAtMs);
}

/**
 * @param {Record<string, unknown>} board
 */
export async function hydratePgaChampionshipBoardOdds(board) {
  if (!board || typeof board !== "object") return board;
  const currentEvent = board.currentEvent;
  if (!isPgaChampionshipEvent(currentEvent)) return board;

  const espnOdds =
    board.odds && typeof board.odds === "object"
      ? board.odds
      : { outrights: [], topFinish: {}, makeCut: {}, linesUnavailable: true };

  const siteOdds = await getPgaChampionshipOddsForBoard(currentEvent);
  if (!siteOdds) return board;

  return {
    ...board,
    odds: mergeGolfOddsWithEspnField(
      { ...siteOdds, source: "pga_championship_site" },
      espnOdds,
    ),
    sourceMeta: {
      ...(board.sourceMeta || {}),
      odds: siteOdds.hasPostedLines ? "pga_championship_site" : board.sourceMeta?.odds,
      oddsFetchedAt: siteOdds.fetchedAt,
      oddsStale: Boolean(siteOdds.freshness?.isStale),
      oddsScrapeMethod: siteOdds.scrapeMethod || null,
    },
  };
}
