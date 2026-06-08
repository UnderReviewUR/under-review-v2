/**
 * NBA Finals outrights — KV read/write + scrape orchestration.
 */

import { getDurableJson, setDurableJson } from "./_durableStore.js";
import { fetchEspnNbaFutures } from "./_nbaEspnFutures.js";
import { fetchOddsApiNbaChampionshipOutrights } from "./_nbaOutrightsFallback.js";
import {
  NBA_FINALS_MVP_KV_KEY,
  NBA_FINALS_SERIES_KV_KEY,
  NBA_OUTRIGHTS_TTL_SECONDS,
} from "../shared/nba2026Constants.js";
import {
  attachNbaOutrightsFreshness,
  calculateOddsFreshness,
  NBA_OUTRIGHTS_MAX_AGE_MS,
} from "../shared/nbaOutrightsFreshness.js";

async function writeSeriesKv(outrights, source, nowMs = Date.now()) {
  const payload = { outrights, lastUpdated: nowMs, source, market: "finals_series" };
  await setDurableJson(NBA_FINALS_SERIES_KV_KEY, payload, {
    ttlSeconds: NBA_OUTRIGHTS_TTL_SECONDS,
  });
  console.log(
    JSON.stringify({
      event: "nba_finals_series_cached",
      count: Object.keys(outrights).length,
      source,
    }),
  );
  return payload;
}

async function writeMvpKv(candidates, source, nowMs = Date.now()) {
  /** @type {Record<string, string>} */
  const outrights = {};
  for (const row of candidates || []) {
    const name = String(row?.name || "").trim();
    const odds = String(row?.odds || "").trim();
    if (name && odds) outrights[name] = odds;
  }
  const payload = {
    candidates: (candidates || []).slice(0, 24),
    outrights,
    lastUpdated: nowMs,
    source,
    market: "finals_mvp",
  };
  await setDurableJson(NBA_FINALS_MVP_KV_KEY, payload, {
    ttlSeconds: NBA_OUTRIGHTS_TTL_SECONDS,
  });
  console.log(
    JSON.stringify({
      event: "nba_finals_mvp_cached",
      count: Object.keys(outrights).length,
      source,
    }),
  );
  return payload;
}

/**
 * Cron: series winner + Finals MVP outrights.
 */
export async function scrapeAndCacheNbaFinalsOutrights() {
  const nowMs = Date.now();
  const cachedSeries = await getDurableJson(NBA_FINALS_SERIES_KV_KEY);
  const cachedMvp = await getDurableJson(NBA_FINALS_MVP_KV_KEY);

  const espn = await fetchEspnNbaFutures();
  let seriesWritten = false;
  let mvpWritten = false;

  if (espn.ok && Object.keys(espn.series).length) {
    await writeSeriesKv(espn.series, "espn", nowMs);
    seriesWritten = true;
  }

  if (espn.ok && espn.mvpCandidates.length) {
    await writeMvpKv(espn.mvpCandidates, "espn", nowMs);
    mvpWritten = true;
  }

  if (!mvpWritten) {
    const espnRetry = await fetchEspnNbaFutures();
    if (espnRetry.ok && espnRetry.mvpCandidates.length) {
      await writeMvpKv(espnRetry.mvpCandidates, "espn_retry", nowMs);
      mvpWritten = true;
    }
  }

  if (!seriesWritten) {
    const oddsApi = await fetchOddsApiNbaChampionshipOutrights();
    if (oddsApi.ok && Object.keys(oddsApi.series).length) {
      await writeSeriesKv(oddsApi.series, "odds_api", nowMs);
      seriesWritten = true;
    }
  }

  const reasons = [espn.error].filter(Boolean).join("; ");
  if (!seriesWritten || !mvpWritten) {
    console.log(
      JSON.stringify({
        event: "nba_finals_outrights_partial",
        seriesWritten,
        mvpWritten,
        espnError: espn.error,
        hadSeriesCache: Boolean(cachedSeries?.outrights && Object.keys(cachedSeries.outrights).length),
        hadMvpCache: Boolean(cachedMvp?.outrights && Object.keys(cachedMvp.outrights).length),
      }),
    );
  }

  const series =
    seriesWritten
      ? (await getDurableJson(NBA_FINALS_SERIES_KV_KEY))?.outrights || espn.series
      : cachedSeries?.outrights || {};
  const mvpPayload = mvpWritten
    ? await getDurableJson(NBA_FINALS_MVP_KV_KEY)
    : cachedMvp;

  return {
    ok: seriesWritten || Boolean(Object.keys(series).length),
    series,
    mvp: mvpPayload,
    seriesSource: seriesWritten ? "fresh" : "cache",
    mvpSource: mvpWritten ? "fresh" : "cache",
    error: seriesWritten ? null : reasons || "series_empty",
    servedStale: !seriesWritten && Boolean(Object.keys(series).length),
  };
}

export async function readNbaFinalsSeriesFromKv(nowMs = Date.now()) {
  const cached = await getDurableJson(NBA_FINALS_SERIES_KV_KEY);
  return attachNbaOutrightsFreshness(cached, nowMs);
}

export async function readNbaFinalsMvpFromKv(nowMs = Date.now()) {
  const cached = await getDurableJson(NBA_FINALS_MVP_KV_KEY);
  return attachNbaOutrightsFreshness(cached, nowMs);
}

/**
 * API + UR Take payload.
 */
export async function getNbaOutrightsPayload(nowMs = Date.now()) {
  const [seriesKv, mvpKv] = await Promise.all([
    readNbaFinalsSeriesFromKv(nowMs),
    readNbaFinalsMvpFromKv(nowMs),
  ]);

  const seriesFreshness =
    seriesKv?.freshness || calculateOddsFreshness(seriesKv?.lastUpdated, NBA_OUTRIGHTS_MAX_AGE_MS, nowMs);
  const mvpFreshness =
    mvpKv?.freshness || calculateOddsFreshness(mvpKv?.lastUpdated, NBA_OUTRIGHTS_MAX_AGE_MS, nowMs);

  return {
    series: {
      outrights: seriesKv?.outrights || {},
      lastUpdated: seriesKv?.lastUpdated ?? null,
      source: seriesKv?.source || "none",
      stale: Boolean(seriesKv?.stale ?? seriesFreshness.isStale),
      ageMinutes: seriesFreshness.ageMinutes ?? null,
      freshness: seriesFreshness,
    },
    mvp: {
      candidates: Array.isArray(mvpKv?.candidates) ? mvpKv.candidates : [],
      outrights: mvpKv?.outrights || {},
      lastUpdated: mvpKv?.lastUpdated ?? null,
      source: mvpKv?.source || "none",
      stale: Boolean(mvpKv?.stale ?? mvpFreshness.isStale),
      ageMinutes: mvpFreshness.ageMinutes ?? null,
      freshness: mvpFreshness,
    },
    fallback:
      !Object.keys(seriesKv?.outrights || {}).length && !Object.keys(mvpKv?.outrights || {}).length,
  };
}
