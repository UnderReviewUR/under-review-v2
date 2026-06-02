/**
 * World Cup 2026 — cron writes + KV reads (ESPN primary, self-healing stale serve).
 */

import { getDurableJson, setDurableJson } from "./_durableStore.js";
import {
  fetchEspnAllMatches,
  fetchEspnMatchOddsForEvent,
  fetchEspnOutrights,
  fetchEspnStandings,
} from "./_wcEspn.js";
import { fetchEspnMatchSummary, normalizeEspnMatchSummary } from "./_wcEspnMatchDetail.js";
import { fetchOddsApiWcOutrights } from "./_wcOutrightsFallback.js";
import { WC_2026_TEAMS } from "../src/data/wc2026Teams.js";
import {
  WC_GROUPS_KV_KEY,
  WC_GROUPS_TTL_SECONDS,
  WC_MATCHES_KV_KEY,
  WC_MATCHES_TTL_SECONDS,
  WC_OUTRIGHTS_KV_KEY,
  WC_OUTRIGHTS_TTL_SECONDS,
  WC_MATCH_DETAIL_FT_TTL_SECONDS,
  WC_MATCH_DETAIL_LIVE_TTL_SECONDS,
  WC_MATCH_DETAIL_PRE_TTL_SECONDS,
  isWcTournamentWindow,
  wcMatchDetailKvKey,
} from "../shared/wc2026Constants.js";
import { isWcMatchFtStatus } from "../shared/wcMatchDetailTargets.js";
import { isKvFresh } from "../shared/selfHealingKv.js";

const GROUP_LETTERS = "ABCDEFGHIJKL".split("");

/**
 * Static fallback rows — pre-tournament zeros so UI + UR Take never see empty groups.
 */
export function buildStaticGroupsFallback() {
  /** @type {Record<string, Array<Record<string, unknown>>>} */
  const groups = {};
  for (const letter of GROUP_LETTERS) {
    const teams = WC_2026_TEAMS.filter((t) => t.group === letter);
    if (!teams.length) continue;
    groups[letter] = teams.map((t) => ({
      team: t.abbreviation,
      played: 0,
      won: 0,
      drawn: 0,
      lost: 0,
      gf: 0,
      ga: 0,
      gd: 0,
      points: 0,
    }));
  }
  return groups;
}

/**
 * Cron: ESPN standings + full fixture slate → KV.
 */
export async function scrapeAndCacheWcStandingsAndFixtures() {
  const nowMs = Date.now();
  const [standingsRes, matchesRes] = await Promise.all([
    fetchEspnStandings(),
    fetchEspnAllMatches(),
  ]);

  let groupsPayload = null;
  let matchesPayload = null;

  if (standingsRes.ok && Object.keys(standingsRes.groups).length >= 12) {
    groupsPayload = {
      groups: standingsRes.groups,
      lastUpdated: nowMs,
      source: "espn",
    };
    await setDurableJson(WC_GROUPS_KV_KEY, groupsPayload, { ttlSeconds: WC_GROUPS_TTL_SECONDS });
  }

  if (matchesRes.ok && matchesRes.matches.length) {
    matchesPayload = {
      matches: matchesRes.matches,
      lastUpdated: nowMs,
      source: "espn",
    };
    await setDurableJson(WC_MATCHES_KV_KEY, matchesPayload, { ttlSeconds: WC_MATCHES_TTL_SECONDS });
  }

  console.log(
    JSON.stringify({
      event: "wc_data_cached",
      kind: "standings_fixtures",
      groups: groupsPayload ? Object.keys(groupsPayload.groups).length : 0,
      matches: matchesPayload?.matches?.length ?? 0,
      standingsOk: standingsRes.ok,
      matchesOk: matchesRes.ok,
      error: standingsRes.error || matchesRes.error || null,
    }),
  );

  return {
    ok: Boolean(groupsPayload || matchesPayload),
    groupsPayload,
    matchesPayload,
    error: standingsRes.error || matchesRes.error || null,
  };
}

/**
 * Cron: refresh embedded moneyline for one scheduled match (ramp-gated by scheduler).
 * @param {string | number} eventId
 * @param {{ date?: string, homeTeam?: string, awayTeam?: string }} [meta]
 */
export async function scrapeAndCacheWcMatchOdds(eventId, meta = {}) {
  const cached = await getDurableJson(WC_MATCHES_KV_KEY);
  const matches = Array.isArray(cached?.matches) ? [...cached.matches] : [];
  const id = String(eventId);
  const idx = matches.findIndex((m) => String(m?.id) === id);

  const dateYmd =
    meta.date ||
    (idx >= 0 ? matches[idx]?.date : null) ||
    null;

  const oddsRes = await fetchEspnMatchOddsForEvent(id, dateYmd);
  if (!oddsRes.ok || !oddsRes.odds) {
    console.log(
      JSON.stringify({
        event: "wc_match_odds_skip",
        eventId: id,
        error: oddsRes.error,
      }),
    );
    return { ok: false, eventId: id, error: oddsRes.error };
  }

  if (idx >= 0) {
    matches[idx] = { ...matches[idx], odds: oddsRes.odds };
  } else {
    matches.push({
      id,
      homeTeam: meta.homeTeam || "",
      awayTeam: meta.awayTeam || "",
      date: dateYmd,
      status: "NS",
      odds: oddsRes.odds,
      commenceTs: dateYmd ? Date.parse(`${dateYmd}T12:00:00Z`) : null,
    });
  }

  const payload = {
    matches,
    lastUpdated: Date.now(),
    source: cached?.source || "espn",
  };
  await setDurableJson(WC_MATCHES_KV_KEY, payload, { ttlSeconds: WC_MATCHES_TTL_SECONDS });

  console.log(
    JSON.stringify({
      event: "wc_match_odds_cached",
      eventId: id,
      home: meta.homeTeam,
      away: meta.awayTeam,
      provider: oddsRes.odds?.provider,
    }),
  );

  return { ok: true, eventId: id, odds: oddsRes.odds };
}

async function writeWcOutrightsKv(outrights, source, nowMs = Date.now()) {
  const payload = { outrights, lastUpdated: nowMs, source };
  await setDurableJson(WC_OUTRIGHTS_KV_KEY, payload, { ttlSeconds: WC_OUTRIGHTS_TTL_SECONDS });
  console.log(
    JSON.stringify({
      event: "wc_outrights_cached",
      count: Object.keys(outrights).length,
      source,
    }),
  );
  return payload;
}

/**
 * Cron: tournament winner outrights — ESPN futures, then Odds API, then stale KV.
 */
export async function scrapeAndCacheWcOutrights() {
  const nowMs = Date.now();
  const cached = await getDurableJson(WC_OUTRIGHTS_KV_KEY);

  const espn = await fetchEspnOutrights();
  if (espn.ok && Object.keys(espn.outrights).length) {
    await writeWcOutrightsKv(espn.outrights, "espn", nowMs);
    return { ok: true, outrights: espn.outrights, fetchedAt: nowMs, source: "espn" };
  }

  const oddsApi = await fetchOddsApiWcOutrights();
  if (oddsApi.ok && Object.keys(oddsApi.outrights).length) {
    await writeWcOutrightsKv(oddsApi.outrights, "odds_api", nowMs);
    return { ok: true, outrights: oddsApi.outrights, fetchedAt: nowMs, source: "odds_api" };
  }

  // Smarkets diagnostic (Jun 2026): no FIFA WC 2026 winner market — cricket "World Cup" only.

  const reasons = [espn.error, oddsApi.error].filter(Boolean).join("; ");
  console.log(
    JSON.stringify({
      event: "wc_outrights_skip",
      espnError: espn.error,
      oddsApiError: oddsApi.error,
      smarkets: "no_fifa_wc_winner_market",
      hadCache: Boolean(cached?.outrights && Object.keys(cached.outrights).length),
    }),
  );

  if (cached?.outrights && Object.keys(cached.outrights).length) {
    return {
      ok: false,
      outrights: cached.outrights,
      fetchedAt: cached.lastUpdated,
      source: cached.source,
      error: reasons || "all_sources_empty",
      servedStale: true,
    };
  }

  return { ok: false, outrights: {}, error: reasons || "all_sources_empty" };
}

/**
 * @param {number} maxAgeMs
 */
export async function readWcGroupsFromKv(maxAgeMs = WC_GROUPS_TTL_SECONDS * 1000) {
  const cached = await getDurableJson(WC_GROUPS_KV_KEY);
  if (!cached?.groups || !Object.keys(cached.groups).length) return null;
  return {
    ...cached,
    stale: !isKvFresh(cached.lastUpdated, maxAgeMs),
  };
}

/**
 * @param {number} maxAgeMs
 */
export async function readWcMatchesFromKv(maxAgeMs = WC_MATCHES_TTL_SECONDS * 1000) {
  const cached = await getDurableJson(WC_MATCHES_KV_KEY);
  if (!cached?.matches?.length) return null;
  return {
    ...cached,
    stale: !isKvFresh(cached.lastUpdated, maxAgeMs),
  };
}

export async function readWcOutrightsFromKv() {
  return getDurableJson(WC_OUTRIGHTS_KV_KEY);
}

/**
 * @param {string | number} eventId
 */
export async function readWcMatchDetailFromKv(eventId) {
  const key = wcMatchDetailKvKey(eventId);
  const row = await getDurableJson(key);
  if (!row || typeof row !== "object") return null;
  return row;
}

/**
 * @param {import("../shared/wcMatchDetailTargets.js").WcMatchDetailScrapeTarget} detail
 */
function ttlSecondsForMatchDetail(detail) {
  if (detail.phase === "post" || detail.finalized || detail.status === "FT") {
    return WC_MATCH_DETAIL_FT_TTL_SECONDS;
  }
  if (detail.phase === "live" || detail.status === "live" || detail.status === "HT") {
    return WC_MATCH_DETAIL_LIVE_TTL_SECONDS;
  }
  return WC_MATCH_DETAIL_PRE_TTL_SECONDS;
}

/**
 * Cron: ESPN match summary → wc_match_detail:{eventId} KV.
 * @param {string | number} eventId
 * @param {{ date?: string, homeTeam?: string, awayTeam?: string, scrapeMode?: string }} [meta]
 */
export async function scrapeAndCacheWcMatchDetail(eventId, meta = {}) {
  const id = String(eventId);
  const summaryRes = await fetchEspnMatchSummary(id);
  if (!summaryRes.ok || !summaryRes.json) {
    console.log(
      JSON.stringify({
        event: "wc_match_detail_skip",
        eventId: id,
        scrapeMode: meta.scrapeMode,
        error: summaryRes.error,
      }),
    );
    return { ok: false, eventId: id, error: summaryRes.error };
  }

  const cached = await readWcMatchDetailFromKv(id);
  const detail = normalizeEspnMatchSummary(summaryRes.json, {
    eventId: id,
    homeTeam: meta.homeTeam,
    awayTeam: meta.awayTeam,
    date: meta.date,
    commenceTs: meta.commenceTs,
  });

  if (!detail.homeTeam || !detail.awayTeam) {
    return { ok: false, eventId: id, error: "missing_teams" };
  }

  if (meta.scrapeMode === "finalize" || detail.status === "FT") {
    detail.finalized = true;
    detail.phase = "post";
  } else if (cached?.finalized) {
    detail.finalized = true;
  }

  const ttlSeconds = ttlSecondsForMatchDetail(detail);
  await setDurableJson(wcMatchDetailKvKey(id), detail, { ttlSeconds });

  console.log(
    JSON.stringify({
      event: "wc_match_detail_cached",
      eventId: id,
      scrapeMode: meta.scrapeMode,
      status: detail.status,
      phase: detail.phase,
      lineupConfirmed: detail.lineupConfirmed,
      injuryCount: detail.injuries?.length ?? 0,
      finalized: detail.finalized,
      ttlSeconds,
    }),
  );

  return {
    ok: true,
    eventId: id,
    status: detail.status,
    lineupConfirmed: detail.lineupConfirmed,
    finalized: detail.finalized,
  };
}

/**
 * Event IDs already written with finalized=true (for scheduler dedupe).
 * @param {Array<Record<string, unknown>>} matches
 */
export async function loadFinalizedWcMatchDetailIds(matches) {
  const ft = (matches || []).filter((m) => isWcMatchFtStatus(m?.status));
  /** @type {Set<string>} */
  const ids = new Set();
  await Promise.all(
    ft.map(async (m) => {
      const row = await readWcMatchDetailFromKv(m.id);
      if (row?.finalized) ids.add(String(m.id));
    }),
  );
  return ids;
}

/**
 * @param {number} [nowMs]
 */
export function shouldRunWcCron(nowMs = Date.now()) {
  return isWcTournamentWindow(nowMs);
}
