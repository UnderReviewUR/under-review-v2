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
import { WC_2026_TEAMS } from "../src/data/wc2026Teams.js";
import {
  WC_GROUPS_KV_KEY,
  WC_GROUPS_TTL_SECONDS,
  WC_MATCHES_KV_KEY,
  WC_MATCHES_TTL_SECONDS,
  WC_OUTRIGHTS_KV_KEY,
  WC_OUTRIGHTS_TTL_SECONDS,
  isWcTournamentWindow,
} from "../shared/wc2026Constants.js";
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

/**
 * Cron: tournament winner futures from ESPN core API (free, no key).
 */
export async function scrapeAndCacheWcOutrights() {
  const res = await fetchEspnOutrights();
  const nowMs = Date.now();

  if (res.ok && Object.keys(res.outrights).length) {
    const payload = {
      outrights: res.outrights,
      lastUpdated: nowMs,
      source: "espn",
    };
    await setDurableJson(WC_OUTRIGHTS_KV_KEY, payload, { ttlSeconds: WC_OUTRIGHTS_TTL_SECONDS });
    console.log(
      JSON.stringify({
        event: "wc_outrights_cached",
        count: Object.keys(res.outrights).length,
        source: "espn",
      }),
    );
    return { ok: true, outrights: res.outrights, fetchedAt: nowMs };
  }

  const cached = await getDurableJson(WC_OUTRIGHTS_KV_KEY);
  console.log(
    JSON.stringify({
      event: "wc_outrights_skip",
      error: res.error,
      hadCache: Boolean(cached?.outrights && Object.keys(cached.outrights).length),
    }),
  );

  if (cached?.outrights) {
    return {
      ok: false,
      outrights: cached.outrights,
      fetchedAt: cached.lastUpdated,
      error: res.error,
      servedStale: true,
    };
  }

  return { ok: false, outrights: {}, error: res.error };
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
 * @param {number} [nowMs]
 */
export function shouldRunWcCron(nowMs = Date.now()) {
  return isWcTournamentWindow(nowMs);
}
