/**
 * API-Football WC backup — fixture map, tournament leaders, live player stats (Phase 3).
 */

import { getDurableJson, setDurableJson } from "./_durableStore.js";
import { fetchWcApiFootball } from "./_wcApiFootball.js";
import { readWcMatchesFromKv } from "./_wcData.js";
import {
  WC_API_FOOTBALL_FIXTURE_MAP_INTERVAL_MS,
  WC_API_FOOTBALL_LEADERS_INTERVAL_MS,
  WC_API_FOOTBALL_LEAGUE_ID,
  WC_API_FOOTBALL_LIVE_STATS_INTERVAL_MS,
  WC_API_FOOTBALL_MAX_LIVE_FIXTURE_CALLS_PER_TICK,
  WC_API_FOOTBALL_SEASON,
  isWcApiFootballEnabled,
} from "../shared/wcApiFootballPolicy.js";
import {
  canSpendWcApiFootballQuota,
  recordWcApiFootballQuota,
  wcApiFootballQuotaState,
} from "../shared/wcApiFootballQuota.js";
import {
  linkEspnMatchesToApiFootball,
  parseApiFootballFixturePlayers,
  parseApiFootballFixtures,
  parseApiFootballTopPlayers,
} from "../shared/wcApiFootballParse.js";
import {
  WC_API_FOOTBALL_KV_KEY,
  WC_API_FOOTBALL_TTL_SECONDS,
} from "../shared/wc2026PlayerConstants.js";
import { WC_MATCHES_KV_KEY, WC_MATCHES_TTL_SECONDS } from "../shared/wc2026Constants.js";

function isLiveStatus(status) {
  return ["live", "in_progress", "1h", "2h", "ht"].includes(String(status || "").toLowerCase());
}

/**
 * @param {Record<string, unknown> | null | undefined} kv
 */
async function writeKv(kv) {
  await setDurableJson(WC_API_FOOTBALL_KV_KEY, kv, { ttlSeconds: WC_API_FOOTBALL_TTL_SECONDS });
}

/**
 * @param {Record<string, unknown>} kv
 * @param {{ ok: boolean, apiRemaining?: number | null }} res
 * @param {number} cost
 * @param {number} nowMs
 */
function spendQuota(kv, res, cost, nowMs) {
  kv.quota = recordWcApiFootballQuota(kv, cost, nowMs, { apiRemaining: res.apiRemaining });
}

/**
 * @param {number | null | undefined} lastUpdated
 * @param {number} maxAgeMs
 * @param {number} nowMs
 */
function isStale(lastUpdated, maxAgeMs, nowMs) {
  const ts = Number(lastUpdated);
  if (!Number.isFinite(ts) || ts <= 0) return true;
  return nowMs - ts >= maxAgeMs;
}

/**
 * @param {Record<string, unknown>} kv
 * @param {number} nowMs
 */
async function refreshFixtureMap(kv, nowMs) {
  if (!canSpendWcApiFootballQuota(kv, 1, nowMs)) {
    return { ok: false, error: "quota_exhausted", mapped: 0 };
  }

  const res = await fetchWcApiFootball("/fixtures", {
    league: WC_API_FOOTBALL_LEAGUE_ID,
    season: WC_API_FOOTBALL_SEASON,
  });
  spendQuota(kv, res, 1, nowMs);
  if (!res.ok) return { ok: false, error: res.error, mapped: 0 };

  const parsed = parseApiFootballFixtures(res.json);
  const matchesKv = await readWcMatchesFromKv(Number.MAX_SAFE_INTEGER);
  const espnMatches = Array.isArray(matchesKv?.matches) ? matchesKv.matches : [];
  const byEspnEventId = linkEspnMatchesToApiFootball(espnMatches, parsed.byMapKey);

  kv.fixtureMap = {
    lastUpdated: nowMs,
    byMapKey: parsed.byMapKey,
    byEspnEventId,
    fixtureCount: parsed.count,
    linkedCount: Object.keys(byEspnEventId).length,
  };

  if (espnMatches.length && Object.keys(byEspnEventId).length) {
    const updated = espnMatches.map((m) => {
      const id = m?.id != null ? String(m.id) : "";
      const link = byEspnEventId[id];
      if (!link) return m;
      return { ...m, apiFootballFixtureId: link.apiFixtureId };
    });
    await setDurableJson(
      WC_MATCHES_KV_KEY,
      {
        matches: updated,
        lastUpdated: matchesKv?.lastUpdated || nowMs,
        source: matchesKv?.source || "espn",
      },
      { ttlSeconds: WC_MATCHES_TTL_SECONDS },
    );
  }

  return {
    ok: true,
    mapped: parsed.count,
    linked: Object.keys(byEspnEventId).length,
    error: null,
  };
}

/**
 * @param {Record<string, unknown>} kv
 * @param {number} nowMs
 */
async function refreshLeaders(kv, nowMs) {
  const kinds = [
    { key: "assists", endpoint: "/players/topassists", kind: "assists" },
    { key: "yellowCards", endpoint: "/players/topyellowcards", kind: "yellow" },
    { key: "redCards", endpoint: "/players/topredcards", kind: "red" },
  ];

  /** @type {Record<string, Array<Record<string, unknown>>>} */
  const leaders = {
    assists: kv.leaders?.assists || [],
    yellowCards: kv.leaders?.yellowCards || [],
    redCards: kv.leaders?.redCards || [],
  };

  let fetched = 0;
  let lastError = null;

  for (const row of kinds) {
    if (!canSpendWcApiFootballQuota(kv, 1, nowMs)) break;
    const res = await fetchWcApiFootball(row.endpoint, {
      league: WC_API_FOOTBALL_LEAGUE_ID,
      season: WC_API_FOOTBALL_SEASON,
    });
    spendQuota(kv, res, 1, nowMs);
    if (!res.ok) {
      lastError = res.error;
      continue;
    }
    leaders[row.key] = parseApiFootballTopPlayers(res.json, row.kind);
    fetched += 1;
  }

  if (!fetched) {
    return { ok: false, error: lastError || "leaders_fetch_failed", fetched: 0 };
  }

  kv.leaders = {
    ...leaders,
    lastUpdated: nowMs,
  };

  return { ok: true, fetched, error: null };
}

/**
 * @param {Record<string, unknown>} kv
 * @param {number} nowMs
 */
async function refreshLiveFixturePlayers(kv, nowMs) {
  const byEspn = kv.fixtureMap?.byEspnEventId;
  if (!byEspn || typeof byEspn !== "object") {
    return { ok: false, error: "no_fixture_map", refreshed: 0 };
  }

  const matchesKv = await readWcMatchesFromKv(Number.MAX_SAFE_INTEGER);
  const liveMatches = (matchesKv?.matches || []).filter((m) => isLiveStatus(m?.status));
  if (!liveMatches.length) return { ok: true, refreshed: 0, error: null };

  const liveStats =
    kv.liveStats && typeof kv.liveStats === "object" ? { ...kv.liveStats } : { byEspnEventId: {} };
  const byEvent = { ...(liveStats.byEspnEventId || {}) };

  let refreshed = 0;
  for (const m of liveMatches) {
    if (refreshed >= WC_API_FOOTBALL_MAX_LIVE_FIXTURE_CALLS_PER_TICK) break;
    const eventId = m?.id != null ? String(m.id) : "";
    if (!eventId) continue;
    const link = byEspn[eventId];
    const fixtureId = link?.apiFixtureId || m.apiFootballFixtureId;
    if (!fixtureId) continue;

    const prev = byEvent[eventId];
    if (prev?.lastUpdated && !isStale(prev.lastUpdated, WC_API_FOOTBALL_LIVE_STATS_INTERVAL_MS, nowMs)) {
      continue;
    }
    if (!canSpendWcApiFootballQuota(kv, 1, nowMs)) break;

    const res = await fetchWcApiFootball("/fixtures/players", { fixture: fixtureId });
    spendQuota(kv, res, 1, nowMs);
    if (!res.ok) continue;

    byEvent[eventId] = {
      eventId,
      apiFixtureId: fixtureId,
      homeTeam: m.homeTeam,
      awayTeam: m.awayTeam,
      lastUpdated: nowMs,
      players: parseApiFootballFixturePlayers(res.json),
    };
    refreshed += 1;
  }

  kv.liveStats = { lastUpdated: nowMs, byEspnEventId: byEvent };
  return { ok: true, refreshed, error: null };
}

/**
 * Cron entry — respects daily quota and stale gates.
 */
export async function scrapeAndCacheWcApiFootball(nowMs = Date.now()) {
  if (!isWcApiFootballEnabled()) {
    return { ok: false, error: "disabled_or_missing_key", skipped: true };
  }

  const cached = (await getDurableJson(WC_API_FOOTBALL_KV_KEY)) || {};
  const kv = { ...cached };

  const quota = wcApiFootballQuotaState(kv, nowMs);
  if (quota.remainingBudget <= 0) {
    console.log(
      JSON.stringify({
        event: "wc_api_football_skip",
        reason: "daily_quota_exhausted",
        usedToday: quota.usedToday,
      }),
    );
    return { ok: false, error: "daily_quota_exhausted", quota };
  }

  const results = {
    fixtureMap: null,
    leaders: null,
    liveStats: null,
  };

  if (isStale(kv.fixtureMap?.lastUpdated, WC_API_FOOTBALL_FIXTURE_MAP_INTERVAL_MS, nowMs)) {
    results.fixtureMap = await refreshFixtureMap(kv, nowMs);
  }

  if (isStale(kv.leaders?.lastUpdated, WC_API_FOOTBALL_LEADERS_INTERVAL_MS, nowMs)) {
    results.leaders = await refreshLeaders(kv, nowMs);
  }

  results.liveStats = await refreshLiveFixturePlayers(kv, nowMs);

  kv.lastUpdated = nowMs;
  await writeKv(kv);

  console.log(
    JSON.stringify({
      event: "wc_api_football_cached",
      fixtureMap: results.fixtureMap,
      leaders: results.leaders,
      liveStats: results.liveStats,
      quota: wcApiFootballQuotaState(kv, nowMs),
    }),
  );

  return {
    ok: true,
    ...results,
    quota: wcApiFootballQuotaState(kv, nowMs),
  };
}

/**
 * @param {number} [nowMs]
 */
export async function readWcApiFootballFromKv(nowMs = Date.now()) {
  const raw = await getDurableJson(WC_API_FOOTBALL_KV_KEY);
  if (!raw) return null;
  return {
    ...raw,
    quota: wcApiFootballQuotaState(raw, nowMs),
  };
}

/**
 * @param {string} eventId
 * @param {number} [nowMs]
 */
export async function readWcApiFootballLiveStatsForEvent(eventId, nowMs = Date.now()) {
  const kv = await readWcApiFootballFromKv(nowMs);
  const id = String(eventId || "").trim();
  if (!kv?.liveStats?.byEspnEventId || !id) return null;
  return kv.liveStats.byEspnEventId[id] || null;
}
