/**
 * World Cup 2026 — cron writes + KV reads (ESPN primary, self-healing stale serve).
 */

import { getDurableJson, setDurableJson } from "./_durableStore.js";
import {
  fetchEspnAllMatches,
  fetchEspnMatchOddsForEvent,
  fetchEspnOutrights,
  fetchEspnScoreboardForDate,
  fetchEspnStandings,
  normalizeEspnScoreboardEvent,
} from "./_wcEspn.js";
import { fetchEspnMatchSummary, normalizeEspnMatchSummary } from "./_wcEspnMatchDetail.js";
import { fetchOddsApiWcOutrights } from "./_wcOutrightsFallback.js";
import { buildStaticGroupsFallback } from "../shared/wcStaticGroupsFallback.js";
import {
  WC_GROUPS_KV_KEY,
  WC_GROUPS_TTL_SECONDS,
  WC_MATCHES_KV_KEY,
  WC_MATCHES_TTL_SECONDS,
  WC_LIVE_SCORE_CHECK_INTERVAL_MS,
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
import { buildWcOutrightsSeedPayload } from "../shared/wcOutrightsSeed.js";
import { resolveWcOutrightsSourceChain } from "../shared/wcOutrightsSourceChain.js";
import { sanitizeWcTournamentWinnerOutrights } from "../shared/wc2026OutrightOdds.js";
import { scrapeAllWcOutrightsAggregators } from "./_wcScrapeOutrightsAggregators.js";
import { WC_OUTRIGHTS_AGGREGATOR_COUNT } from "../shared/wcOutrightsAggregatorRegistry.js";
import { deriveWcDataConfidence } from "../shared/wcDataConfidence.js";
import { resolveWcMatchEtDate, wcTodayEtYmd } from "../shared/wcKickoffDisplay.js";
import {
  fetchOpenFootballWc2026Schedule,
  validateEspnScheduleAgainstOpenFootball,
} from "../shared/wcOpenFootballSchedule.js";
import { isWcGoatPrimaryEnabled, isWcBdlSource } from "../shared/wcBdlPolicy.js";
import { scrapeAndCacheWcBdlStandingsAndFixtures, looksLikeWcEspnEventId } from "./_wcBdlData.js";
import { bdlFifaFetch } from "./_wcBdlFifa.js";
import { normalizeBdlFifaMatchRow } from "./_wcBdlNormalize.js";
import {
  loadFinalizedWcMatchDetailIds as loadFinalizedWcMatchDetailIdsFromCache,
  markWcMatchFinalizedInCache,
} from "./_wcFinalizedMatchIds.js";

/** Max parallel KV reads when enriching match lists for /api/world-cup. */
export const WC_MATCH_DETAIL_ENRICH_CONCURRENCY = 12;

/** @typedef {"confirmed" | "pending" | "unavailable"} WcXiStatus */

export { buildStaticGroupsFallback } from "../shared/wcStaticGroupsFallback.js";

function isWcLiveMatchStatus(status) {
  return ["live", "in_progress", "1h", "2h", "ht"].includes(String(status || "").toLowerCase());
}

/**
 * Patch today's ESPN scoreboard rows onto the cached match list (scores + status only).
 * @param {Array<Record<string, unknown>>} matches
 * @param {Array<Record<string, unknown>>} patches
 */
export function mergeWcLiveScorePatches(matches, patches) {
  const patchById = new Map();
  const patchByBdlId = new Map();
  const patchByFixtureKey = new Map();
  for (const p of patches || []) {
    if (!p) continue;
    if (p.id != null) patchById.set(String(p.id), p);
    if (p.bdlMatchId != null) patchByBdlId.set(String(p.bdlMatchId), p);
    if (p.homeTeam && p.awayTeam && p.date) {
      patchByFixtureKey.set(`${p.homeTeam}-${p.awayTeam}-${p.date}`, p);
    }
  }
  let changed = false;
  const out = (matches || []).map((m) => {
    const id = m?.id != null ? String(m.id) : "";
    const patch =
      (id ? patchById.get(id) : null) ||
      (m?.bdlMatchId != null ? patchByBdlId.get(String(m.bdlMatchId)) : null) ||
      (m?.homeTeam && m?.awayTeam && m?.date
        ? patchByFixtureKey.get(`${m.homeTeam}-${m.awayTeam}-${m.date}`)
        : null);
    if (!patch) return m;
    const next = {
      ...m,
      homeScore: patch.homeScore ?? m.homeScore,
      awayScore: patch.awayScore ?? m.awayScore,
      status: patch.status ?? m.status,
    };
    if (
      next.homeScore !== m.homeScore ||
      next.awayScore !== m.awayScore ||
      next.status !== m.status
    ) {
      changed = true;
    }
    return next;
  });
  return { matches: out, changed };
}

/**
 * Lightweight live refresh — BDL match rows for in-progress fixtures (GOAT-primary).
 * @param {Record<string, unknown> | null | undefined} kv
 * @param {number} [nowMs]
 */
export async function refreshWcLiveScoresFromBdl(kv, nowMs = Date.now()) {
  if (!kv?.matches?.length || !isWcTournamentWindow(nowMs)) {
    return { kv, refreshed: false, checked: false, source: "balldontlie" };
  }
  const hasLive = kv.matches.some((m) => isWcLiveMatchStatus(m.status));
  if (!hasLive) return { kv, refreshed: false, checked: false, source: "balldontlie" };

  const lastCheck = Number(kv.liveCheckedAt || kv.lastUpdated || 0);
  if (nowMs - lastCheck < WC_LIVE_SCORE_CHECK_INTERVAL_MS) {
    return { kv, refreshed: false, checked: false, source: "balldontlie" };
  }

  const nextCheckedAt = nowMs;
  const todayEt = wcTodayEtYmd(nowMs);
  const res = await bdlFifaFetch("/matches", { "seasons[]": 2026, per_page: 100 });
  if (!res.ok) {
    const throttled = { ...kv, liveCheckedAt: nextCheckedAt };
    await setDurableJson(WC_MATCHES_KV_KEY, throttled, { ttlSeconds: WC_MATCHES_TTL_SECONDS });
    return { kv: throttled, refreshed: false, checked: true, source: "balldontlie", error: res.error };
  }

  const rows = Array.isArray(res.data?.data) ? res.data.data : [];
  const patches = rows
    .map((row) => normalizeBdlFifaMatchRow(row, nowMs))
    .filter((norm) => norm && (norm.date === todayEt || isWcLiveMatchStatus(norm.status)))
    .map((norm) => ({
      id: norm.id,
      bdlMatchId: norm.bdlMatchId,
      homeTeam: norm.homeTeam,
      awayTeam: norm.awayTeam,
      date: norm.date,
      homeScore: norm.homeScore,
      awayScore: norm.awayScore,
      status: norm.status,
    }));

  const { matches, changed } = mergeWcLiveScorePatches(kv.matches, patches);
  const nextKv = {
    ...kv,
    matches,
    liveCheckedAt: nextCheckedAt,
    ...(changed ? { lastUpdated: nowMs } : {}),
  };
  await setDurableJson(WC_MATCHES_KV_KEY, nextKv, { ttlSeconds: WC_MATCHES_TTL_SECONDS });
  if (changed) {
    console.log(
      JSON.stringify({
        event: "wc_live_scores_refreshed",
        source: "balldontlie",
        liveCount: matches.filter((m) => isWcLiveMatchStatus(m.status)).length,
        checkedAt: nextCheckedAt,
      }),
    );
  }
  return { kv: nextKv, refreshed: changed, checked: true, source: "balldontlie" };
}

/**
 * Live score refresh — BDL when GOAT-primary, ESPN fallback.
 * @param {Record<string, unknown> | null | undefined} kv
 * @param {number} [nowMs]
 */
export async function refreshWcLiveScores(kv, nowMs = Date.now()) {
  if (!kv?.matches?.length || !isWcTournamentWindow(nowMs)) {
    return { kv, refreshed: false, checked: false };
  }
  const hasLive = kv.matches.some((m) => isWcLiveMatchStatus(m.status));
  if (!hasLive) return { kv, refreshed: false, checked: false };

  if (isWcGoatPrimaryEnabled() && isWcBdlSource(kv?.source)) {
    const bdl = await refreshWcLiveScoresFromBdl(kv, nowMs);
    if (bdl.refreshed) return bdl;
    const espn = await refreshWcLiveScoresFromEspn(bdl.kv, nowMs, { force: true });
    if (espn.refreshed) return espn;
    return bdl.checked ? bdl : espn;
  }
  return refreshWcLiveScoresFromEspn(kv, nowMs);
}

/**
 * Lightweight live refresh — one ESPN scoreboard call for today (not full tournament crawl).
 * @param {Record<string, unknown> | null | undefined} kv
 * @param {number} [nowMs]
 */
export async function refreshWcLiveScoresFromEspn(kv, nowMs = Date.now(), opts = {}) {
  if (!kv?.matches?.length || !isWcTournamentWindow(nowMs)) {
    return { kv, refreshed: false, checked: false };
  }
  const hasLive = kv.matches.some((m) => isWcLiveMatchStatus(m.status));
  if (!hasLive) return { kv, refreshed: false, checked: false };

  const lastCheck = Number(kv.liveCheckedAt || kv.lastUpdated || 0);
  if (!opts.force && nowMs - lastCheck < WC_LIVE_SCORE_CHECK_INTERVAL_MS) {
    return { kv, refreshed: false, checked: false };
  }

  const ymd = wcTodayEtYmd(nowMs).replace(/-/g, "");
  const board = await fetchEspnScoreboardForDate(ymd);
  const nextCheckedAt = nowMs;
  if (!board.ok) {
    const throttled = { ...kv, liveCheckedAt: nextCheckedAt };
    await setDurableJson(WC_MATCHES_KV_KEY, throttled, { ttlSeconds: WC_MATCHES_TTL_SECONDS });
    return { kv: throttled, refreshed: false, checked: true };
  }

  const patches = board.events
    .map((ev) => normalizeEspnScoreboardEvent(ev, nowMs))
    .filter(Boolean);
  const { matches, changed } = mergeWcLiveScorePatches(kv.matches, patches);
  const nextKv = {
    ...kv,
    matches,
    liveCheckedAt: nextCheckedAt,
    ...(changed ? { lastUpdated: nowMs } : {}),
  };
  await setDurableJson(WC_MATCHES_KV_KEY, nextKv, { ttlSeconds: WC_MATCHES_TTL_SECONDS });
  if (changed) {
    console.log(
      JSON.stringify({
        event: "wc_live_scores_refreshed",
        liveCount: matches.filter((m) => isWcLiveMatchStatus(m.status)).length,
        checkedAt: nextCheckedAt,
      }),
    );
  }
  return { kv: nextKv, refreshed: changed, checked: true };
}

/**
 * Cron: ESPN standings + full fixture slate → KV.
 */
export async function scrapeAndCacheWcStandingsAndFixtures() {
  if (isWcGoatPrimaryEnabled()) {
    const bdl = await scrapeAndCacheWcBdlStandingsAndFixtures();
    if (bdl.ok) {
      console.log(
        JSON.stringify({
          event: "wc_standings_bdl_primary",
          groupsCount: bdl.groupsCount,
          matchesCount: bdl.matchesCount,
        }),
      );
      return {
        ok: true,
        groupsPayload: {
          groups: (await getDurableJson(WC_GROUPS_KV_KEY))?.groups,
          lastUpdated: bdl.lastUpdated,
          source: "balldontlie",
        },
        matchesPayload: {
          matches: (await getDurableJson(WC_MATCHES_KV_KEY))?.matches,
          lastUpdated: bdl.lastUpdated,
          source: "balldontlie",
        },
        source: "balldontlie",
      };
    }
    console.warn("[wc-data] BDL primary failed, falling back to ESPN:", bdl.errors?.join("; "));
  }

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

    const ofRes = await fetchOpenFootballWc2026Schedule();
    if (ofRes.ok) {
      const validation = validateEspnScheduleAgainstOpenFootball(
        matchesRes.matches,
        ofRes.matches,
      );
      matchesPayload.scheduleValidation = {
        ok: validation.ok,
        matched: validation.matched,
        mismatchCount: validation.mismatchCount,
        espnGroupCount: validation.espnGroupCount,
        openFootballGroupCount: validation.openFootballGroupCount,
        checkedAt: nowMs,
      };
      console.log(
        JSON.stringify({
          event: validation.ok ? "wc_schedule_validation_ok" : "wc_schedule_validation_mismatch",
          matched: validation.matched,
          mismatchCount: validation.mismatchCount,
          espnGroupCount: validation.espnGroupCount,
          openFootballGroupCount: validation.openFootballGroupCount,
          sample: validation.mismatches.slice(0, 3),
        }),
      );
    } else {
      console.log(
        JSON.stringify({
          event: "wc_schedule_validation_skipped",
          error: ofRes.error,
        }),
      );
    }

    await setDurableJson(WC_MATCHES_KV_KEY, matchesPayload, { ttlSeconds: WC_MATCHES_TTL_SECONDS });
  } else {
    const ofRes = await fetchOpenFootballWc2026Schedule();
    if (ofRes.ok && ofRes.matches.length >= 50) {
      matchesPayload = {
        matches: ofRes.matches,
        lastUpdated: nowMs,
        source: "openfootball",
        scheduleValidation: {
          ok: null,
          fallback: true,
          openFootballCount: ofRes.matches.length,
          checkedAt: nowMs,
        },
      };
      await setDurableJson(WC_MATCHES_KV_KEY, matchesPayload, {
        ttlSeconds: WC_MATCHES_TTL_SECONDS,
      });
      console.log(
        JSON.stringify({
          event: "wc_schedule_openfootball_fallback",
          matches: ofRes.matches.length,
          espnError: matchesRes.error || "espn_schedule_empty",
        }),
      );
    }
  }

  console.log(
    JSON.stringify({
      event: "wc_data_cached",
      kind: "standings_fixtures",
      groups: groupsPayload ? Object.keys(groupsPayload.groups).length : 0,
      matches: matchesPayload?.matches?.length ?? 0,
      matchSource: matchesPayload?.source || null,
      standingsOk: standingsRes.ok,
      matchesOk: Boolean(matchesPayload?.matches?.length),
      scheduleValidationOk: matchesPayload?.scheduleValidation?.ok ?? null,
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

  if (realCount >= 50 && isWcGoatPrimaryEnabled() && !isWcBdlSource(kv?.source)) {
    const bdl = await scrapeAndCacheWcBdlStandingsAndFixtures();
    if (bdl?.ok) {
      const refreshed = await readWcMatchesFromKv(Number.MAX_SAFE_INTEGER);
      return {
        ok: true,
        matches: refreshed?.matches || existing,
        lastUpdated: refreshed?.lastUpdated ?? nowMs,
        source: refreshed?.source || "balldontlie",
        cached: false,
      };
    }
  }

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

    const ofRes = await fetchOpenFootballWc2026Schedule();
    if (ofRes.ok) {
      const validation = validateEspnScheduleAgainstOpenFootball(espn.matches, ofRes.matches);
      payload.scheduleValidation = {
        ok: validation.ok,
        matched: validation.matched,
        mismatchCount: validation.mismatchCount,
        espnGroupCount: validation.espnGroupCount,
        openFootballGroupCount: validation.openFootballGroupCount,
        checkedAt: nowMs,
      };
    }

    await setDurableJson(WC_MATCHES_KV_KEY, payload, { ttlSeconds: WC_MATCHES_TTL_SECONDS });
    return { ok: true, ...payload, cached: false };
  }

  const ofRes = await fetchOpenFootballWc2026Schedule();
  if (ofRes.ok && ofRes.matches.length >= 50) {
    const payload = {
      matches: ofRes.matches,
      lastUpdated: nowMs,
      source: "openfootball",
      scheduleValidation: {
        ok: null,
        fallback: true,
        openFootballCount: ofRes.matches.length,
        checkedAt: nowMs,
      },
    };
    await setDurableJson(WC_MATCHES_KV_KEY, payload, { ttlSeconds: WC_MATCHES_TTL_SECONDS });
    return { ok: true, ...payload, cached: false };
  }

  return {
    ok: false,
    matches: existing,
    lastUpdated: kv?.lastUpdated ?? null,
    source: kv?.source || "none",
    error: espn.error || ofRes.error || "espn_schedule_empty",
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

  if (isWcGoatPrimaryEnabled()) {
    try {
      const { scrapeAndCacheWcBdlMatchBundle } = await import("./_wcBdlData.js");
      const bdl = await scrapeAndCacheWcBdlMatchBundle(id, meta);
      if (bdl.ok) {
        if (bdl.finalized) {
          try {
            await markWcMatchFinalizedInCache(id);
          } catch {
            /* non-fatal */
          }
          try {
            const { refreshWcTournamentSimAfterFt } = await import("./_wcTournamentSimData.js");
            await refreshWcTournamentSimAfterFt();
          } catch {
            /* non-fatal */
          }
          try {
            const detail = await readWcMatchDetailFromKv(id);
            if (detail) {
              const { cacheWcMatchAdvancedStatsFromDetail } = await import("./_wcMatchAdvancedStats.js");
              await cacheWcMatchAdvancedStatsFromDetail(detail);
            }
          } catch {
            /* non-fatal */
          }
        }
        return bdl;
      }
      const bdlErrMsg = String(bdl.error || "bdl_bundle_failed");
      const expectedEspnOnly =
        bdlErrMsg === "no_bdl_match_id" ||
        (looksLikeWcEspnEventId(id) && bdlErrMsg.includes("match:"));
      if (!expectedEspnOnly) {
        console.warn(`[wc-match-bundle] BDL failed for ${id}, ESPN fallback:`, bdl.error);
      }
    } catch (bdlErr) {
      console.warn(`[wc-match-bundle] BDL error for ${id}:`, bdlErr?.message);
    }
  }

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
      await markWcMatchFinalizedInCache(id);
    } catch {
      /* non-fatal */
    }
    try {
      const { refreshWcTournamentSimAfterFt } = await import("./_wcTournamentSimData.js");
      await refreshWcTournamentSimAfterFt();
    } catch (simErr) {
      console.warn("[wc-match-bundle] sim refresh after FT failed:", simErr?.message || simErr);
    }
    try {
      const detail = await readWcMatchDetailFromKv(id);
      if (detail) {
        const { cacheWcMatchAdvancedStatsFromDetail } = await import("./_wcMatchAdvancedStats.js");
        await cacheWcMatchAdvancedStatsFromDetail(detail);
      }
    } catch (advErr) {
      console.log(
        JSON.stringify({
          event: "wc_match_advanced_stats_fail",
          eventId: id,
          error: advErr?.message || "advanced_stats_failed",
        }),
      );
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

async function writeWcOutrightsKv(outrights, source, nowMs = Date.now(), meta = {}) {
  const cleaned = sanitizeWcTournamentWinnerOutrights(outrights);
  const payload = {
    outrights: cleaned,
    lastUpdated: nowMs,
    source,
    sourceTier: meta.sourceTier || null,
    provenance: meta.provenance || null,
    attempts: meta.attempts || null,
    aggregatorsRegistered: meta.aggregatorsRegistered ?? WC_OUTRIGHTS_AGGREGATOR_COUNT,
    aggregatorsAttempted: meta.aggregatorsAttempted ?? null,
    aggregatorsOk: meta.aggregatorsOk ?? null,
  };
  await setDurableJson(WC_OUTRIGHTS_KV_KEY, payload, { ttlSeconds: WC_OUTRIGHTS_TTL_SECONDS });
  console.log(
    JSON.stringify({
      event: "wc_outrights_cached",
      count: Object.keys(cleaned).length,
      source,
      sourceTier: payload.sourceTier,
    }),
  );
  return payload;
}

/**
 * Cron: tournament winner outrights — multi-source chain (ESPN + Odds API merge → stale KV → seed).
 */
export async function scrapeAndCacheWcOutrights() {
  const nowMs = Date.now();

  if (isWcGoatPrimaryEnabled()) {
    try {
      const { scrapeAndCacheWcBdlOutrights } = await import("./_wcBdlData.js");
      const bdl = await scrapeAndCacheWcBdlOutrights();
      if (bdl.ok) {
        return { ok: true, ...bdl, sourceTier: "balldontlie_live" };
      }
      console.warn("[wc-outrights] BDL primary failed, ESPN/scrape fallback:", bdl.error);
    } catch (bdlErr) {
      console.warn("[wc-outrights] BDL error:", bdlErr?.message);
    }
  }

  const cached = await getDurableJson(WC_OUTRIGHTS_KV_KEY);

  const [espn, oddsApi, aggregators] = await Promise.all([
    fetchEspnOutrights(),
    fetchOddsApiWcOutrights(),
    scrapeAllWcOutrightsAggregators(),
  ]);
  const chain = resolveWcOutrightsSourceChain({
    espn,
    oddsApi,
    aggregators,
    cached,
    nowMs,
  });

  const aggregatorsOk = aggregators.filter((a) => a.ok).map((a) => a.source);

  if (chain.sourceTier === "live_merge" || chain.seeded) {
    await writeWcOutrightsKv(chain.outrights, chain.source, nowMs, {
      sourceTier: chain.sourceTier,
      provenance: chain.provenance,
      attempts: chain.attempts,
      aggregatorsAttempted: aggregators.length,
      aggregatorsOk,
    });
  }

  if (chain.sourceTier !== "live_merge" && !chain.seeded) {
    console.log(
      JSON.stringify({
        event: "wc_outrights_skip",
        sourceTier: chain.sourceTier,
        espnError: espn.error,
        oddsApiError: oddsApi.error,
        hadCache: Boolean(cached?.outrights && Object.keys(cached.outrights).length),
        error: chain.error,
      }),
    );
  }

  return {
    ok: chain.ok,
    outrights: chain.outrights,
    fetchedAt: chain.fetchedAt,
    source: chain.source,
    sourceTier: chain.sourceTier,
    seeded: chain.seeded,
    servedStale: chain.servedStale,
    error: chain.error || null,
  };
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
  const withFreshness = attachOutrightsFreshness(cached, nowMs);
  if (withFreshness?.outrights && Object.keys(withFreshness.outrights).length) {
    return withFreshness;
  }
  return attachOutrightsFreshness(buildWcOutrightsSeedPayload(nowMs), nowMs);
}

/**
 * On-demand outrights refresh when KV empty/stale/seed-only during tournament window.
 * @param {number} [nowMs]
 */
export async function ensureWcOutrightsInKv(nowMs = Date.now()) {
  const cached = await readWcOutrightsFromKv(nowMs);
  const tier = String(cached?.sourceTier || "").toLowerCase();
  const needsRefresh =
    !cached?.outrights ||
    !Object.keys(cached.outrights).length ||
    cached.stale ||
    tier === "static_seed" ||
    tier === "stale_kv_aged";

  if (!needsRefresh) {
    return { ok: true, cached: true, outrights: cached.outrights, ...cached };
  }
  if (!shouldRunWcCron(nowMs)) {
    return { ok: false, cached: true, outrights: cached?.outrights || {}, error: "off_season" };
  }

  const scraped = await scrapeAndCacheWcOutrights();
  const fresh = await readWcOutrightsFromKv(nowMs);
  return {
    ok: Boolean(scraped.ok || fresh?.outrights),
    cached: false,
    refreshed: true,
    outrights: fresh?.outrights || scraped.outrights,
    source: fresh?.source || scraped.source,
    sourceTier: fresh?.sourceTier || scraped.sourceTier,
    error: scraped.error || null,
  };
}

/**
 * On-demand ESPN standings + fixtures when KV thin.
 * @param {number} [nowMs]
 */
export async function ensureWcDataInKv(nowMs = Date.now()) {
  const groupsKv = await readWcGroupsFromKv(Number.MAX_SAFE_INTEGER);
  const matchesKv = await readWcMatchesFromKv(Number.MAX_SAFE_INTEGER);
  const groupOk = groupsKv?.groups && Object.keys(groupsKv.groups).length >= 12;
  const realMatches = (matchesKv?.matches || []).filter(
    (m) => m?.id != null && !String(m.id).startsWith("wc-promo-"),
  ).length;
  const matchesOk = realMatches >= 50;

  if (groupOk && matchesOk && !groupsKv?.stale && !matchesKv?.stale) {
    return {
      ok: true,
      cached: true,
      groupsPayload: groupsKv,
      matchesPayload: matchesKv,
    };
  }
  if (!shouldRunWcCron(nowMs)) {
    return { ok: false, cached: true, error: "off_season" };
  }
  return scrapeAndCacheWcStandingsAndFixtures();
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

function isWcScheduledStatus(status) {
  const s = String(status || "").toLowerCase();
  return s === "ns" || s === "scheduled" || s === "not started" || s === "upcoming";
}

function isWcLiveListStatus(status) {
  return ["live", "in_progress", "1h", "2h", "ht"].includes(String(status || "").toLowerCase());
}

/**
 * List views only need XI/detail meta for live, today, and near-term fixtures — not all 104 KV reads.
 * @param {Array<Record<string, unknown>>} matches
 * @param {number} [nowMs]
 */
export function pickMatchesForDetailEnrichment(matches, nowMs = Date.now()) {
  const rows = Array.isArray(matches) ? matches : [];
  const todayEt = wcTodayEtYmd(nowMs);
  /** @type {Set<string>} */
  const seen = new Set();
  /** @type {Array<Record<string, unknown>>} */
  const out = [];

  const push = (m) => {
    const id = m?.id != null ? String(m.id).trim() : "";
    if (!id || seen.has(id)) return;
    seen.add(id);
    out.push(m);
  };

  for (const m of rows) {
    if (isWcLiveListStatus(m?.status)) push(m);
  }
  for (const m of rows) {
    if (resolveWcMatchEtDate(m) === todayEt) push(m);
  }

  const nearScheduled = rows
    .filter((m) => isWcScheduledStatus(m?.status))
    .filter((m) => {
      const et = resolveWcMatchEtDate(m);
      return et && et >= todayEt;
    })
    .sort((a, b) => (Number(a.commenceTs) || 0) - (Number(b.commenceTs) || 0));
  for (const m of nearScheduled.slice(0, 24)) push(m);

  const cap = 48;
  if (out.length >= cap) return out.slice(0, cap);
  for (const m of rows) {
    push(m);
    if (out.length >= cap) break;
  }
  return out;
}

/**
 * Attach lineupConfirmed / xiStatus / lastUpdated / dataConfidence from wc_match_detail KV.
 * @param {Array<Record<string, unknown>>} matches
 * @param {{ concurrency?: number, listView?: boolean, nowMs?: number }} [opts]
 */
export async function enrichMatchesWithDetailMeta(matches, opts = {}) {
  const rows = Array.isArray(matches) ? matches : [];
  const nowMs = Number(opts.nowMs) || Date.now();

  if (opts.listView === true && rows.length > 12) {
    const priority = pickMatchesForDetailEnrichment(rows, nowMs);
    const enrichedById = new Map(
      (await enrichMatchesWithDetailMeta(priority, { ...opts, listView: false })).map((m) => [
        String(m.id),
        m,
      ]),
    );
    return rows.map((m) => {
      const id = m?.id != null ? String(m.id).trim() : "";
      const hit = id ? enrichedById.get(id) : null;
      if (hit) return hit;
      return { ...m, ...buildMatchDetailMeta(null) };
    });
  }

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

  let detail = await readWcMatchDetailFromKv(id);
  if (!detail && isWcGoatPrimaryEnabled()) {
    try {
      const { scrapeAndCacheWcBdlMatchBundle } = await import("./_wcBdlData.js");
      const cached = await getDurableJson(WC_MATCHES_KV_KEY);
      const match = (cached?.matches || []).find((m) => String(m?.id) === id);
      await scrapeAndCacheWcBdlMatchBundle(id, {
        homeTeam: match?.homeTeam,
        awayTeam: match?.awayTeam,
        date: match?.date,
        bdlMatchId: match?.bdlMatchId,
      });
      detail = await readWcMatchDetailFromKv(id);
    } catch {
      /* ESPN fallback via scheduler */
    }
  }

  if (!detail) {
    return { ok: false, eventId: id, error: "no_detail", ...buildMatchDetailMeta(null) };
  }

  const meta = buildMatchDetailMeta(detail);
  const th = detail.teamStats?.home;
  const ta = detail.teamStats?.away;
  const bdlGoat = detail.bdlGoat
    ? {
        hasShots: Boolean(detail.bdlGoat.shots),
        hasMomentum: Boolean(detail.bdlGoat.momentum),
        hasBestPlayers: Boolean(detail.bdlGoat.bestPlayers),
        hasAvgPositions: Boolean(detail.bdlGoat.avgPositions),
        hasTeamForm: Boolean(detail.bdlGoat.teamForm),
        xgSummary: detail.bdlGoat.xgSummary || null,
      }
    : null;
  return {
    ok: true,
    eventId: id,
    source: detail.source || "espn",
    bdlGoat,
    homeTeam: detail.homeTeam,
    awayTeam: detail.awayTeam,
    status: detail.status,
    homeScore: detail.homeScore ?? null,
    awayScore: detail.awayScore ?? null,
    venue: detail.venue ?? null,
    phase: detail.phase ?? null,
    injuryCount: Array.isArray(detail.injuries) ? detail.injuries.length : 0,
    teamStats: {
      home: th
        ? {
            possessionPct: th.possessionPct ?? null,
            shots: th.shots ?? null,
            shotsOnTarget: th.shotsOnTarget ?? th.sot ?? null,
          }
        : null,
      away: ta
        ? {
            possessionPct: ta.possessionPct ?? null,
            shots: ta.shots ?? null,
            shotsOnTarget: ta.shotsOnTarget ?? ta.sot ?? null,
          }
        : null,
    },
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
  return loadFinalizedWcMatchDetailIdsFromCache(matches, readWcMatchDetailFromKv);
}

/**
 * @param {number} [nowMs]
 */
export function shouldRunWcCron(nowMs = Date.now()) {
  return isWcTournamentWindow(nowMs);
}
