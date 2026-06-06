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
import { attachOutrightsFreshness } from "../shared/wcOddsFreshness.js";
import { deriveWcDataConfidence } from "../shared/wcDataConfidence.js";

/** Max parallel KV reads when enriching match lists for /api/world-cup. */
export const WC_MATCH_DETAIL_ENRICH_CONCURRENCY = 12;

/** @typedef {"confirmed" | "pending" | "unavailable"} WcXiStatus */

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

  if (groupsPayload || matchesPayload) {
    try {
      const { scrapeAndCacheWcTournamentSim } = await import("./_wcTournamentSimData.js");
      await scrapeAndCacheWcTournamentSim({
        groups: groupsPayload?.groups,
        matches: matchesPayload?.matches,
        nowMs,
      });
    } catch (simErr) {
      console.warn("[wc-data] tournament sim refresh failed:", simErr?.message || simErr);
    }
  }

  return {
    ok: Boolean(groupsPayload || matchesPayload),
    groupsPayload,
    matchesPayload,
    error: standingsRes.error || matchesRes.error || null,
  };
}

/**
 * Pull full ESPN fixture list into KV when missing or promo-only.
 * @param {number} [nowMs]
 */
export async function ensureWcScheduleInKv(nowMs = Date.now()) {
  const kv = await readWcMatchesFromKv(Number.MAX_SAFE_INTEGER);
  const existing = Array.isArray(kv?.matches) ? kv.matches : [];
  const realCount = existing.filter((m) => m?.id != null && !String(m.id).startsWith("wc-promo-")).length;
  if (realCount >= 50) {
    return {
      ok: true,
      matches: existing,
      lastUpdated: kv?.lastUpdated ?? nowMs,
      source: kv?.source || "espn",
      cached: true,
    };
  }

  const espn = await fetchEspnAllMatches();
  if (espn.ok && espn.matches.length) {
    const payload = {
      matches: espn.matches,
      lastUpdated: nowMs,
      source: "espn",
    };
    await setDurableJson(WC_MATCHES_KV_KEY, payload, { ttlSeconds: WC_MATCHES_TTL_SECONDS });
    return { ok: true, ...payload, cached: false };
  }

  return {
    ok: false,
    matches: existing,
    lastUpdated: kv?.lastUpdated ?? null,
    source: kv?.source || "none",
    error: espn.error || "espn_schedule_empty",
    cached: Boolean(existing.length),
  };
}

/**
 * Cron: ESPN match summary + embedded moneylines in one bundled pass.
 * @param {string | number} eventId
 * @param {{ date?: string, homeTeam?: string, awayTeam?: string, commenceTs?: number, scrapeMode?: string }} [meta]
 */
export async function scrapeAndCacheWcMatchBundle(eventId, meta = {}) {
  const id = String(eventId);
  const nowMs = Date.now();
  const cached = await getDurableJson(WC_MATCHES_KV_KEY);
  const matches = Array.isArray(cached?.matches) ? [...cached.matches] : [];
  const idx = matches.findIndex((m) => String(m?.id) === id);

  const dateYmd =
    meta.date ||
    (idx >= 0 ? matches[idx]?.date : null) ||
    null;

  const fetchOdds = meta.scrapeMode !== "finalize";

  const [summaryRes, oddsRes] = await Promise.all([
    fetchEspnMatchSummary(id),
    fetchOdds && dateYmd
      ? fetchEspnMatchOddsForEvent(id, dateYmd)
      : Promise.resolve({ ok: false, odds: null, error: "odds_skipped" }),
  ]);

  /** @type {{ ok: boolean, error?: string, lineupConfirmed?: boolean, finalized?: boolean, status?: string }} */
  let detailResult = { ok: false, error: "summary_failed" };
  /** @type {{ ok: boolean, error?: string, odds?: Record<string, unknown> }} */
  let oddsResult = { ok: false, error: oddsRes.error || "odds_unavailable" };

  if (summaryRes.ok && summaryRes.json) {
    const cachedDetail = await readWcMatchDetailFromKv(id);
    const detail = normalizeEspnMatchSummary(summaryRes.json, {
      eventId: id,
      homeTeam: meta.homeTeam,
      awayTeam: meta.awayTeam,
      date: meta.date,
      commenceTs: meta.commenceTs,
    });

    if (!detail.homeTeam || !detail.awayTeam) {
      detailResult = { ok: false, error: "missing_teams" };
    } else {
      if (meta.scrapeMode === "finalize" || detail.status === "FT") {
        detail.finalized = true;
        detail.phase = "post";
      } else if (cachedDetail?.finalized) {
        detail.finalized = true;
      }

      const ttlSeconds = ttlSecondsForMatchDetail(detail);
      await setDurableJson(wcMatchDetailKvKey(id), detail, { ttlSeconds });

      detailResult = {
        ok: true,
        status: detail.status,
        lineupConfirmed: detail.lineupConfirmed,
        finalized: detail.finalized,
      };

      try {
        const [{ upsertWcPlayersFromMatchDetail }, { upsertWcInjuriesFromMatchDetail }] =
          await Promise.all([import("./_wcPlayersData.js"), import("./_wcInjuriesData.js")]);
        await Promise.all([
          upsertWcPlayersFromMatchDetail(detail),
          upsertWcInjuriesFromMatchDetail(detail),
        ]);
      } catch (upsertErr) {
        console.log(
          JSON.stringify({
            event: "wc_match_bundle_player_upsert_fail",
            eventId: id,
            error: upsertErr?.message || "upsert_failed",
          }),
        );
      }

      if (fetchOdds) {
        try {
          const { scrapeAndCacheWcMatchPlayerProps } = await import("./_wcMatchPlayerProps.js");
          await scrapeAndCacheWcMatchPlayerProps(id, {
            homeTeam: meta.homeTeam || detail.homeTeam,
            awayTeam: meta.awayTeam || detail.awayTeam,
            scrapeMode: meta.scrapeMode,
          });
        } catch (propsErr) {
          console.log(
            JSON.stringify({
              event: "wc_match_bundle_props_fail",
              eventId: id,
              error: propsErr?.message || "props_failed",
            }),
          );
        }
      }
    }
  } else {
    detailResult = { ok: false, error: summaryRes.error || "summary_failed" };
  }

  if (oddsRes.ok && oddsRes.odds) {
    if (idx >= 0) {
      matches[idx] = { ...matches[idx], odds: oddsRes.odds, oddsUpdatedAt: nowMs };
    } else {
      matches.push({
        id,
        homeTeam: meta.homeTeam || "",
        awayTeam: meta.awayTeam || "",
        date: dateYmd,
        status: "NS",
        odds: oddsRes.odds,
        oddsUpdatedAt: nowMs,
        commenceTs: meta.commenceTs || (dateYmd ? Date.parse(`${dateYmd}T12:00:00Z`) : null),
      });
    }

    await setDurableJson(
      WC_MATCHES_KV_KEY,
      {
        matches,
        lastUpdated: nowMs,
        source: cached?.source || "espn",
      },
      { ttlSeconds: WC_MATCHES_TTL_SECONDS },
    );

    oddsResult = { ok: true, odds: oddsRes.odds };
  }

  if (!detailResult.ok && !oddsResult.ok) {
    console.log(
      JSON.stringify({
        event: "wc_match_bundle_skip",
        eventId: id,
        scrapeMode: meta.scrapeMode,
        detailError: detailResult.error,
        oddsError: oddsResult.error,
      }),
    );
    return {
      ok: false,
      eventId: id,
      error: [detailResult.error, oddsResult.error].filter(Boolean).join("; "),
    };
  }

  console.log(
    JSON.stringify({
      event: "wc_match_bundle_cached",
      eventId: id,
      scrapeMode: meta.scrapeMode,
      detailOk: detailResult.ok,
      oddsOk: oddsResult.ok,
      lineupConfirmed: detailResult.lineupConfirmed,
      finalized: detailResult.finalized,
      provider: oddsResult.odds?.provider,
    }),
  );

  if (detailResult.finalized) {
    try {
      const { refreshWcTournamentSimAfterFt } = await import("./_wcTournamentSimData.js");
      await refreshWcTournamentSimAfterFt();
    } catch (simErr) {
      console.warn("[wc-match-bundle] sim refresh after FT failed:", simErr?.message || simErr);
    }
  }

  return {
    ok: true,
    eventId: id,
    detail: detailResult,
    odds: oddsResult,
    lineupConfirmed: detailResult.lineupConfirmed,
    finalized: detailResult.finalized,
  };
}

/**
 * Back-compat wrapper — delegates to scrapeAndCacheWcMatchBundle.
 */
export async function scrapeAndCacheWcMatchOdds(eventId, meta = {}) {
  const result = await scrapeAndCacheWcMatchBundle(eventId, meta);
  if (result.ok && result.odds?.ok) {
    return { ok: true, eventId: result.eventId, odds: result.odds.odds };
  }
  return { ok: false, eventId: String(eventId), error: result.error || result.odds?.error };
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

export async function readWcOutrightsFromKv(nowMs = Date.now()) {
  const cached = await getDurableJson(WC_OUTRIGHTS_KV_KEY);
  return attachOutrightsFreshness(cached, nowMs);
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
 * Per-match trust fields for WC UI (no full lineups).
 * @param {Record<string, unknown> | null | undefined} detail
 */
export function buildMatchDetailMeta(detail) {
  if (!detail || typeof detail !== "object") {
    return {
      lineupConfirmed: false,
      xiStatus: /** @type {WcXiStatus} */ ("unavailable"),
      lastUpdated: null,
      dataConfidence: /** @type {import("../shared/wcDataConfidence.js").WcDataConfidence} */ (
        "pre_match_estimate"
      ),
    };
  }

  const lineupConfirmed = detail.lineupConfirmed === true;
  const lastUpdated = Number(detail.lastUpdated);
  return {
    lineupConfirmed,
    xiStatus: lineupConfirmed
      ? /** @type {WcXiStatus} */ ("confirmed")
      : /** @type {WcXiStatus} */ ("pending"),
    lastUpdated: Number.isFinite(lastUpdated) && lastUpdated > 0 ? lastUpdated : null,
    dataConfidence: deriveWcDataConfidence([detail]),
  };
}

/**
 * Attach lineupConfirmed / xiStatus / lastUpdated / dataConfidence from wc_match_detail KV.
 * @param {Array<Record<string, unknown>>} matches
 * @param {{ concurrency?: number }} [opts]
 */
export async function enrichMatchesWithDetailMeta(matches, opts = {}) {
  const rows = Array.isArray(matches) ? matches : [];
  const concurrency = Math.max(
    1,
    Math.min(Number(opts.concurrency) || WC_MATCH_DETAIL_ENRICH_CONCURRENCY, 24),
  );
  /** @type {Array<Record<string, unknown>>} */
  const out = [];

  for (let i = 0; i < rows.length; i += concurrency) {
    const chunk = rows.slice(i, i + concurrency);
    const batch = await Promise.all(
      chunk.map(async (m) => {
        const eventId = m?.id != null ? String(m.id).trim() : "";
        if (!eventId) {
          return { ...m, ...buildMatchDetailMeta(null) };
        }
        const detail = await readWcMatchDetailFromKv(eventId);
        return { ...m, ...buildMatchDetailMeta(detail) };
      }),
    );
    out.push(...batch);
  }

  return out;
}

/**
 * Lightweight single-match detail for view=detail (no starter names in response).
 * @param {string | number} eventId
 */
export async function getWcMatchDetailPayload(eventId) {
  const id = String(eventId || "").trim();
  if (!id) {
    return { ok: false, error: "missing_event_id" };
  }

  const detail = await readWcMatchDetailFromKv(id);
  if (!detail) {
    return { ok: false, eventId: id, error: "no_detail", ...buildMatchDetailMeta(null) };
  }

  const meta = buildMatchDetailMeta(detail);
  return {
    ok: true,
    eventId: id,
    homeTeam: detail.homeTeam,
    awayTeam: detail.awayTeam,
    status: detail.status,
    homeScore: detail.homeScore ?? null,
    awayScore: detail.awayScore ?? null,
    venue: detail.venue ?? null,
    phase: detail.phase ?? null,
    injuryCount: Array.isArray(detail.injuries) ? detail.injuries.length : 0,
    ...meta,
  };
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
 * Back-compat wrapper — delegates to scrapeAndCacheWcMatchBundle.
 */
export async function scrapeAndCacheWcMatchDetail(eventId, meta = {}) {
  const result = await scrapeAndCacheWcMatchBundle(eventId, meta);
  if (result.ok && result.detail?.ok) {
    return {
      ok: true,
      eventId: result.eventId,
      status: result.detail.status,
      lineupConfirmed: result.detail.lineupConfirmed,
      finalized: result.detail.finalized,
    };
  }
  return { ok: false, eventId: String(eventId), error: result.error || result.detail?.error };
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
