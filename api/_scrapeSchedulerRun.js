/**
 * Execute due scrapes for unified scheduler (KV last-run + ramp cadence).
 */

import { getDurableJson, setDurableJson } from "./_durableStore.js";
import { getEnv } from "./_env.js";
import { scrapeAndCacheNbaProps } from "./_nbaProps.js";
import { scrapeAndCachePgaChampionshipOdds } from "./_golfPgaChampionshipOdds.js";
import { resolveGameSpreadForSlateGame } from "./_gameOddsPipeline.js";
import {
  buildScrapeLastRunKvKey,
  getNextScrapeDelayMs,
  shouldRunScrapeForGame,
} from "../shared/scrapeCadencePolicy.js";

const LAST_RUN_TTL_SECONDS = 14 * 24 * 60 * 60;
const MAX_SCRAPES_PER_TICK = 12;

/** @type {Record<string, (target: import("./_scrapeSchedule.js").ScrapeTarget) => Promise<Record<string, unknown>>>} */
const SCRAPE_HANDLERS = {
  nba_props: async (target) => {
    const meta = target.meta || {};
    const props = await scrapeAndCacheNbaProps(meta.gameId, {
      homeTeam: meta.homeAbbr,
      awayTeam: meta.awayAbbr,
      date: meta.dateYmd,
    });
    return {
      posted: props.hasPostedLines,
      playerCount: props.playerCount,
      fetchedAt: props.fetchedAt,
    };
  },
  nba_spreads: async (target) => {
    const game = target.meta?.game;
    if (!game) return { skipped: true, reason: "missing_game" };
    const oddsKey = getEnv("ODDS_API_KEY");
    const resolved = await resolveGameSpreadForSlateGame(game, oddsKey, { sport: "nba" });
    return {
      displayLine: resolved?.current?.displayLine || resolved?.displayLine || null,
      lineUnavailable: Boolean(resolved?.lineUnavailable),
    };
  },
  golf_odds: async () => {
    const odds = await scrapeAndCachePgaChampionshipOdds();
    return {
      posted: odds?.hasPostedLines,
      outrightCount: Array.isArray(odds?.outrights) ? odds.outrights.length : 0,
      fetchedAt: odds?.fetchedAt,
    };
  },
};

/**
 * @param {string} sport
 * @param {string} gameId
 */
async function readLastRunMs(sport, gameId) {
  const key = buildScrapeLastRunKvKey(sport, gameId);
  const row = await getDurableJson(key);
  const ms = Number(row?.lastRunMs);
  return Number.isFinite(ms) ? ms : null;
}

/**
 * @param {string} sport
 * @param {string} gameId
 * @param {number} lastRunMs
 */
async function writeLastRunMs(sport, gameId, lastRunMs) {
  const key = buildScrapeLastRunKvKey(sport, gameId);
  await setDurableJson(key, { lastRunMs }, LAST_RUN_TTL_SECONDS);
}

/**
 * @param {import("./_scrapeSchedule.js").ScrapeTarget[]} targets
 * @param {number} [nowMs]
 */
export async function runDueScrapes(targets, nowMs = Date.now()) {
  const results = [];
  let executed = 0;

  for (const target of targets) {
    if (executed >= MAX_SCRAPES_PER_TICK) break;

    const { sport, gameId, gameStartMs } = target;
    const intervalMs = getNextScrapeDelayMs(gameStartMs, nowMs);

    if (intervalMs == null) {
      results.push({
        sport,
        gameId,
        action: "skip",
        reason: nowMs >= gameStartMs ? "live_or_started" : "imminent",
      });
      continue;
    }

    const lastRunMs = await readLastRunMs(sport, gameId);
    if (!shouldRunScrapeForGame(gameStartMs, lastRunMs, nowMs)) {
      results.push({
        sport,
        gameId,
        action: "wait",
        intervalMs,
        lastRunMs,
        msUntilStart: gameStartMs - nowMs,
      });
      continue;
    }

    const handler = SCRAPE_HANDLERS[sport];
    if (!handler) {
      results.push({
        sport,
        gameId,
        action: "skip",
        reason: "no_handler",
      });
      continue;
    }

    try {
      const payload = await handler(target);
      await writeLastRunMs(sport, gameId, nowMs);
      executed += 1;
      results.push({
        sport,
        gameId,
        action: "scraped",
        intervalMs,
        ...payload,
      });
    } catch (err) {
      results.push({
        sport,
        gameId,
        action: "error",
        error: err?.message || "scrape_failed",
      });
    }
  }

  return {
    nowMs,
    targets: targets.length,
    executed,
    results,
  };
}
