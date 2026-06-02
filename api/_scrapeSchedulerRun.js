/**
 * Execute due scrapes for unified scheduler (KV last-run + ramp cadence).
 */

import { getDurableJson, setDurableJson } from "./_durableStore.js";
import { getEnv } from "./_env.js";
import { scrapeAndCacheNbaProps } from "./_nbaProps.js";
import { scrapeAndCachePgaChampionshipOdds } from "./_golfPgaChampionshipOdds.js";
import { scrapeAndCacheF1Odds } from "./_f1Odds.js";
import { resolveGameSpreadForSlateGame } from "./_gameOddsPipeline.js";
import {
  buildScrapeLastRunKvKey,
  getNextScrapeDelayMs,
  shouldRunScrapeForGame,
} from "../shared/scrapeCadencePolicy.js";
import {
  scrapeAndCacheWcMatchDetail,
  scrapeAndCacheWcMatchOdds,
  scrapeAndCacheWcOutrights,
  scrapeAndCacheWcStandingsAndFixtures,
} from "./_wcData.js";

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
  f1_odds: async (target) => {
    const eventId = target.meta?.eventId || target.gameId;
    const odds = await scrapeAndCacheF1Odds(eventId);
    return {
      posted: odds?.hasPostedLines,
      eventId: odds?.eventId,
      raceWinnerCount: odds?.markets?.raceWinner?.length ?? 0,
      fetchedAt: odds?.fetchedAt,
    };
  },
  wc_data: async () => {
    const result = await scrapeAndCacheWcStandingsAndFixtures();
    return {
      ok: result.ok,
      groups: result.groupsPayload ? Object.keys(result.groupsPayload.groups).length : 0,
      matches: result.matchesPayload?.matches?.length ?? 0,
      error: result.error,
    };
  },
  wc_match_odds: async (target) => {
    const meta = target.meta || {};
    const result = await scrapeAndCacheWcMatchOdds(target.gameId, {
      date: meta.date,
      homeTeam: meta.homeTeam,
      awayTeam: meta.awayTeam,
    });
    return {
      ok: result.ok,
      eventId: target.gameId,
      error: result.error,
    };
  },
  wc_match_detail: async (target) => {
    const meta = target.meta || {};
    const result = await scrapeAndCacheWcMatchDetail(target.gameId, {
      date: meta.date,
      homeTeam: meta.homeTeam,
      awayTeam: meta.awayTeam,
      commenceTs: meta.commenceTs,
      scrapeMode: meta.scrapeMode,
    });
    return {
      ok: result.ok,
      eventId: target.gameId,
      lineupConfirmed: result.lineupConfirmed,
      finalized: result.finalized,
      error: result.error,
    };
  },
  wc_outrights: async () => {
    const result = await scrapeAndCacheWcOutrights();
    return {
      ok: result.ok,
      count: Object.keys(result.outrights || {}).length,
      servedStale: Boolean(result.servedStale),
      error: result.error,
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
    const fixedIntervalMs = Number(target.meta?.fixedIntervalMs);
    const useFixedInterval = Number.isFinite(fixedIntervalMs) && fixedIntervalMs > 0;

    let intervalMs = useFixedInterval ? fixedIntervalMs : getNextScrapeDelayMs(gameStartMs, nowMs);

    if (!useFixedInterval && intervalMs == null) {
      const reason = nowMs >= gameStartMs ? "live_or_started" : "imminent";
      console.log(
        JSON.stringify({
          target_id: `${sport}/${gameId}`,
          action: "skipped",
          reason,
          gameStartMs,
          nowMs,
          msUntilStart: gameStartMs - nowMs,
        }),
      );
      results.push({
        sport,
        gameId,
        action: "skip",
        reason,
      });
      continue;
    }

    const lastRunMs = await readLastRunMs(sport, gameId);
    const due = useFixedInterval
      ? !Number.isFinite(lastRunMs) || lastRunMs <= 0 || nowMs - lastRunMs >= fixedIntervalMs
      : shouldRunScrapeForGame(gameStartMs, lastRunMs, nowMs);

    if (!due) {
      console.log(
        JSON.stringify({
          target_id: `${sport}/${gameId}`,
          action: "skipped",
          reason: "cadence_not_due",
          intervalMs,
          lastRunMs,
          timeSinceLastRun: lastRunMs ? nowMs - lastRunMs : null,
          msUntilStart: gameStartMs - nowMs,
        }),
      );
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
      console.log(
        JSON.stringify({
          target_id: `${sport}/${gameId}`,
          action: "skipped",
          reason: "no_handler",
        }),
      );
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
      console.log(
        JSON.stringify({
          target_id: `${sport}/${gameId}`,
          action: "ran",
          intervalMs,
          msUntilStart: gameStartMs - nowMs,
          result: payload,
        }),
      );
      results.push({
        sport,
        gameId,
        action: "scraped",
        intervalMs,
        ...payload,
      });
    } catch (err) {
      console.log(
        JSON.stringify({
          target_id: `${sport}/${gameId}`,
          action: "error",
          error: err?.message || "scrape_failed",
        }),
      );
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
