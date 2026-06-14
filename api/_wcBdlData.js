/**
 * BallDontLie GOAT — primary WC ingest (ESPN / scrapes as fallback).
 */

import { getDurableJson, setDurableJson } from "./_durableStore.js";
import {
  bdlFifaFetch,
  bdlFifaFetchPaginated,
  BDL_GOAT_RATE_LIMIT_MS,
  fetchAllMatchesBdl,
  normalizeBdlPlayerRow,
  normalizeBdlRosterRow,
} from "./_wcBdlFifa.js";
import {
  buildBdlPlayerIdLookup,
  linkBdlMatchesToEspn,
  normalizeBdlFifaMatchRow,
  normalizeBdlMatchDetailBundle,
  attachBdlMoneylinesToMatches,
  normalizeBdlPlayerPropsToMarkets,
  pickBdlMatchOddsForMatch,
} from "./_wcBdlNormalize.js";
import { readWcPlayersFromKv } from "./_wcPlayersData.js";
import { auditBdlPlayerPropsIngest } from "../shared/wcBdlIngestAudit.js";
import { normalizeBdlGroupStandings } from "./_wcBdlGoatMode.js";
import { buildBdlFuturesIndex } from "../shared/wcBdlFutures.js";
import { hasWcBdlApiKey, isWcGoatPrimaryEnabled } from "../shared/wcBdlPolicy.js";
import {
  WC_GROUPS_KV_KEY,
  WC_GROUPS_TTL_SECONDS,
  WC_MATCHES_KV_KEY,
  WC_MATCHES_TTL_SECONDS,
  WC_OUTRIGHTS_KV_KEY,
  WC_OUTRIGHTS_TTL_SECONDS,
  wcMatchDetailKvKey,
  WC_MATCH_DETAIL_FT_TTL_SECONDS,
  WC_MATCH_DETAIL_LIVE_TTL_SECONDS,
  WC_MATCH_DETAIL_PRE_TTL_SECONDS,
} from "../shared/wc2026Constants.js";
import { WC_MATCH_PLAYER_PROPS_KV_KEY, WC_MATCH_PLAYER_PROPS_TTL_SECONDS, WC_PLAYERS_KV_KEY, WC_PLAYERS_TTL_SECONDS } from "../shared/wc2026PlayerConstants.js";
import { WC_MATCH_PLAYER_PROP_MARKET_KEYS } from "../shared/wcMatchPlayerProps.js";
import { sanitizeWcTournamentWinnerOutrights } from "../shared/wc2026OutrightOdds.js";
import { fetchEspnAllMatches } from "./_wcEspn.js";

export const WC_BDL_MATCH_MAP_KV_KEY = "wc2026_bdl_match_map";
export const WC_BDL_REFERENCE_KV_KEY = "wc2026_bdl_reference";

function ttlSecondsForMatchDetail(detail) {
  const s = String(detail?.status || "").toUpperCase();
  if (s === "FT" || detail?.finalized) return WC_MATCH_DETAIL_FT_TTL_SECONDS;
  if (s === "NS" || s === "SCHEDULED") return WC_MATCH_DETAIL_PRE_TTL_SECONDS;
  return WC_MATCH_DETAIL_LIVE_TTL_SECONDS;
}

/**
 * @param {Array<Record<string, unknown>>} matches
 */
export function buildBdlMatchIdIndex(matches) {
  /** @type {Record<string, number>} */
  const byEventId = {};
  /** @type {Record<string, string>} */
  const byBdlId = {};
  for (const m of matches || []) {
    if (m.bdlMatchId == null || m.id == null) continue;
    byEventId[String(m.id)] = Number(m.bdlMatchId);
    byBdlId[String(m.bdlMatchId)] = String(m.id);
  }
  return { byEventId, byBdlId };
}

/**
 * @param {string | number} eventId
 * @param {{ bdlMatchId?: number, homeTeam?: string, awayTeam?: string, date?: string }} [meta]
 */
/** ESPN WC event ids are 6-digit; BDL match ids are small integers on the GOAT slate. */
export function looksLikeWcEspnEventId(eventId) {
  const idStr = String(eventId ?? "").trim();
  return /^\d{6,}$/.test(idStr);
}

export async function resolveBdlMatchIdForEvent(eventId, meta = {}) {
  if (meta.bdlMatchId != null && Number.isFinite(Number(meta.bdlMatchId))) {
    return Number(meta.bdlMatchId);
  }

  const idStr = String(eventId ?? "").trim();
  if (!idStr) return null;

  const map = await getDurableJson(WC_BDL_MATCH_MAP_KV_KEY);
  if (map?.byEventId?.[idStr]) return Number(map.byEventId[idStr]);

  const kv = await getDurableJson(WC_MATCHES_KV_KEY);
  const hit = (kv?.matches || []).find((m) => String(m?.id) === idStr);
  if (hit?.bdlMatchId != null) return Number(hit.bdlMatchId);

  // BDL-primary slate ids only — never treat ESPN event ids (e.g. 760418) as BDL match ids.
  if (!looksLikeWcEspnEventId(idStr) && /^\d+$/.test(idStr)) {
    const num = Number(idStr);
    if (Number.isFinite(num)) return num;
  }

  if (meta.homeTeam && meta.awayTeam && meta.date) {
    const key = `${meta.homeTeam}-${meta.awayTeam}-${meta.date}`;
    const alt = (kv?.matches || []).find(
      (m) => `${m.homeTeam}-${m.awayTeam}-${m.date}` === key && m.bdlMatchId != null,
    );
    if (alt?.bdlMatchId != null) return Number(alt.bdlMatchId);
  }

  if (meta.homeTeam && meta.awayTeam && isWcGoatPrimaryEnabled()) {
    try {
      const live = await fetchAllMatchesBdl();
      const home = String(meta.homeTeam).toUpperCase();
      const away = String(meta.awayTeam).toUpperCase();
      const hit = (live.matches || []).find(
        (m) =>
          (String(m.homeTeam).toUpperCase() === home &&
            String(m.awayTeam).toUpperCase() === away) ||
          (String(m.homeTeam).toUpperCase() === away &&
            String(m.awayTeam).toUpperCase() === home),
      );
      const bdlId = hit?.bdlMatchId ?? hit?.id;
      if (bdlId != null && Number.isFinite(Number(bdlId))) return Number(bdlId);
    } catch {
      /* fall through */
    }
  }

  return null;
}

/**
 * Cron: BDL standings + matches + futures + match odds index → KV.
 * ESPN used only to link espnEventId on slate rows.
 */
export async function scrapeAndCacheWcBdlStandingsAndFixtures() {
  if (!hasWcBdlApiKey()) {
    return { ok: false, error: "missing_api_key", source: "balldontlie" };
  }

  const nowMs = Date.now();
  /** @type {string[]} */
  const errors = [];

  const standingsRes = await bdlFifaFetch("/group_standings", { "seasons[]": 2026 });
  const groups = standingsRes.ok ? normalizeBdlGroupStandings(standingsRes.data) : {};
  if (!standingsRes.ok) errors.push(`standings: ${standingsRes.error}`);
  else if (!Object.keys(groups).length) errors.push("standings: empty");

  const matchesFetched = await fetchAllMatchesBdl();
  /** @type {Array<Record<string, unknown>>} */
  let bdlMatches = [];
  for (const row of matchesFetched.matches || []) {
    const norm = normalizeBdlFifaMatchRow(row, nowMs);
    if (norm) bdlMatches.push(norm);
  }
  if (!matchesFetched.ok && !bdlMatches.length) {
    errors.push(`matches: ${matchesFetched.error || "failed"}`);
  }

  let espnMatches = [];
  try {
    const espnRes = await fetchEspnAllMatches();
    if (espnRes.ok) espnMatches = espnRes.matches || [];
  } catch {
    /* linking optional */
  }

  if (bdlMatches.length && espnMatches.length) {
    bdlMatches = linkBdlMatchesToEspn(bdlMatches, espnMatches);
  }

  const oddsPaginated = await bdlFifaFetchPaginated("/odds", { "seasons[]": 2026, per_page: 100 }, {
    maxPages: 15,
    delayMs: BDL_GOAT_RATE_LIMIT_MS,
  });
  if (oddsPaginated.ok) {
    bdlMatches = attachBdlMoneylinesToMatches(bdlMatches, oddsPaginated.rows, nowMs);
  } else {
    errors.push(`odds: ${oddsPaginated.error || "failed"}`);
  }

  const futuresRes = await bdlFifaFetch("/odds/futures", { "seasons[]": 2026 });
  /** @type {Record<string, unknown> | null} */
  let futuresPayload = null;
  if (futuresRes.ok) {
    const rows = Array.isArray(futuresRes.data?.data) ? futuresRes.data.data : [];
    const index = buildBdlFuturesIndex(rows);
    futuresPayload = {
      lastUpdated: nowMs,
      source: "balldontlie_live",
      byMarketType: index.byMarketType,
      rowCount: rows.length,
    };
  } else {
    errors.push(`futures: ${futuresRes.error}`);
  }

  const groupsOk = Object.keys(groups).length >= 12;
  const matchesOk = bdlMatches.length >= 50;

  if (groupsOk) {
    await setDurableJson(
      WC_GROUPS_KV_KEY,
      { groups, lastUpdated: nowMs, source: "balldontlie" },
      { ttlSeconds: WC_GROUPS_TTL_SECONDS },
    );
  }

  if (matchesOk) {
    const matchPayload = {
      matches: bdlMatches,
      lastUpdated: nowMs,
      source: "balldontlie",
      bdlFuturesCached: Boolean(futuresPayload),
    };
    await setDurableJson(WC_MATCHES_KV_KEY, matchPayload, { ttlSeconds: WC_MATCHES_TTL_SECONDS });
    await setDurableJson(
      WC_BDL_MATCH_MAP_KV_KEY,
      { ...buildBdlMatchIdIndex(bdlMatches), lastUpdated: nowMs },
      { ttlSeconds: WC_MATCHES_TTL_SECONDS },
    );
  }

  if (futuresPayload) {
    const outrightRows = futuresPayload.byMarketType?.outright || {};
    /** @type {Record<string, string>} */
    const outrights = {};
    for (const [abbr, row] of Object.entries(outrightRows)) {
      if (row?.americanDisplay) outrights[abbr] = String(row.americanDisplay);
    }
    const sanitized = sanitizeWcTournamentWinnerOutrights(outrights);
    if (Object.keys(sanitized).length) {
      await setDurableJson(
        WC_OUTRIGHTS_KV_KEY,
        {
          outrights: sanitized,
          lastUpdated: nowMs,
          source: "balldontlie",
          sourceTier: "balldontlie_live",
          bdlFutures: futuresPayload,
        },
        { ttlSeconds: WC_OUTRIGHTS_TTL_SECONDS },
      );
    }
  }

  return {
    ok: groupsOk && matchesOk,
    partial: (groupsOk || matchesOk) && !(groupsOk && matchesOk),
    groupsCount: Object.keys(groups).length,
    matchesCount: bdlMatches.length,
    source: "balldontlie",
    errors,
    lastUpdated: nowMs,
  };
}

/**
 * @param {number} bdlMatchId
 * @param {{ eventId?: string, homeTeam?: string, awayTeam?: string, date?: string, scrapeMode?: string }} meta
 */
export async function fetchBdlMatchBundle(bdlMatchId, meta = {}) {
  const matchId = Number(bdlMatchId);
  const params = { "match_ids[]": matchId };

  const [matchRes, lineupsRes, eventsRes, playerStatsRes, teamStatsRes, oddsRes, shotsRes, momentumRes, bestPlayersRes, avgPosRes, teamFormRes] =
    await Promise.all([
      bdlFifaFetch("/matches", { "seasons[]": 2026, "match_ids[]": matchId }),
      bdlFifaFetchPaginated("/match_lineups", params, { maxPages: 5 }),
      bdlFifaFetchPaginated("/match_events", params, { maxPages: 10 }),
      bdlFifaFetchPaginated("/player_match_stats", params, { maxPages: 10 }),
      bdlFifaFetchPaginated("/team_match_stats", params, { maxPages: 3 }),
      bdlFifaFetch("/odds", { "seasons[]": 2026, "match_ids[]": matchId }),
      bdlFifaFetchPaginated("/match_shots", params, { maxPages: 20 }),
      bdlFifaFetchPaginated("/match_momentum", params, { maxPages: 10 }),
      bdlFifaFetchPaginated("/match_best_players", params, { maxPages: 5 }),
      bdlFifaFetchPaginated("/match_avg_positions", params, { maxPages: 10 }),
      bdlFifaFetchPaginated("/match_team_form", params, { maxPages: 3 }),
    ]);

  const matchRow = Array.isArray(matchRes.data?.data) ? matchRes.data.data[0] : null;

  return {
    ok: Boolean(matchRow),
    bdlMatchId: matchId,
    eventId: meta.eventId || String(matchId),
    match: matchRow,
    lineups: lineupsRes.rows || [],
    events: eventsRes.rows || [],
    playerStats: playerStatsRes.rows || [],
    teamStats: teamStatsRes.rows || [],
    shots: shotsRes.rows || [],
    momentum: momentumRes.rows || [],
    bestPlayers: bestPlayersRes.rows || [],
    avgPositions: avgPosRes.rows || [],
    teamForm: teamFormRes.rows || [],
    odds: pickBdlMatchOddsForMatch(
      Array.isArray(oddsRes.data?.data) ? oddsRes.data.data : [],
      matchId,
    ),
    errors: [
      !matchRow ? `match: ${matchRes.error || "missing"}` : null,
      !lineupsRes.ok ? `lineups: ${lineupsRes.error}` : null,
      !shotsRes.ok && !shotsRes.rows?.length ? `shots: ${shotsRes.error}` : null,
      !momentumRes.ok && !momentumRes.rows?.length ? `momentum: ${momentumRes.error}` : null,
    ].filter(Boolean),
    goatCoverage: {
      shots: (shotsRes.rows || []).length,
      momentum: (momentumRes.rows || []).length,
      bestPlayers: (bestPlayersRes.rows || []).length,
      avgPositions: (avgPosRes.rows || []).length,
      teamForm: (teamFormRes.rows || []).length,
    },
  };
}

/**
 * @param {string | number} eventId
 * @param {{ bdlMatchId?: number, homeTeam?: string, awayTeam?: string, date?: string, commenceTs?: number, scrapeMode?: string }} meta
 */
export async function scrapeAndCacheWcBdlMatchBundle(eventId, meta = {}) {
  const id = String(eventId);
  const bdlMatchId = await resolveBdlMatchIdForEvent(id, meta);
  if (bdlMatchId == null) {
    return { ok: false, eventId: id, error: "no_bdl_match_id", source: "balldontlie" };
  }

  const bundle = await fetchBdlMatchBundle(bdlMatchId, { ...meta, eventId: id });
  if (!bundle.ok || !bundle.match) {
    return {
      ok: false,
      eventId: id,
      bdlMatchId,
      error: bundle.errors?.join("; ") || "bdl_bundle_failed",
      source: "balldontlie",
    };
  }

  const detail = normalizeBdlMatchDetailBundle(bundle);
  if (meta.scrapeMode === "finalize" || detail.status === "FT") {
    detail.finalized = true;
    detail.phase = "post";
  }

  const ttlSeconds = ttlSecondsForMatchDetail(detail);
  await setDurableJson(wcMatchDetailKvKey(id), detail, { ttlSeconds });

  let oddsResult = { ok: false, error: "odds_unavailable" };
  if (bundle.odds && meta.scrapeMode !== "finalize") {
    const cached = await getDurableJson(WC_MATCHES_KV_KEY);
    const matches = Array.isArray(cached?.matches) ? [...cached.matches] : [];
    const idx = matches.findIndex((m) => String(m?.id) === id);
    if (idx >= 0) {
      matches[idx] = { ...matches[idx], odds: bundle.odds, oddsUpdatedAt: Date.now() };
      await setDurableJson(
        WC_MATCHES_KV_KEY,
        { ...cached, matches, lastUpdated: Date.now() },
        { ttlSeconds: WC_MATCHES_TTL_SECONDS },
      );
    }
    oddsResult = { ok: true, odds: bundle.odds };
  }

  try {
    const [{ upsertWcPlayersFromMatchDetail }, { upsertWcInjuriesFromMatchDetail }] =
      await Promise.all([import("./_wcPlayersData.js"), import("./_wcInjuriesData.js")]);
    await Promise.all([
      upsertWcPlayersFromMatchDetail(detail),
      upsertWcInjuriesFromMatchDetail(detail),
    ]);
  } catch {
    /* non-fatal */
  }

  if (meta.scrapeMode !== "finalize") {
    await scrapeAndCacheWcBdlMatchPlayerProps(bdlMatchId, id, meta).catch(() => null);
  }

  if (detail.finalized && detail.bdlGoat?.xgSummary) {
    try {
      await cacheWcBdlAdvancedStatsFromDetail(detail);
    } catch {
      /* non-fatal */
    }
  }

  return {
    ok: true,
    eventId: id,
    bdlMatchId,
    source: "balldontlie",
    goatCoverage: bundle.goatCoverage,
    detail: {
      ok: true,
      status: detail.status,
      lineupConfirmed: detail.lineupConfirmed,
      finalized: detail.finalized,
    },
    odds: oddsResult,
    lineupConfirmed: detail.lineupConfirmed,
    finalized: detail.finalized,
  };
}

/**
 * Resolve BDL player_id → name for prop rows (API returns ids only, not embedded players).
 * @param {Array<Record<string, unknown>>} rows
 * @param {{ homeTeam?: string, awayTeam?: string }} [meta]
 */
export async function resolveBdlPlayerLookupForPropRows(rows, meta = {}) {
  /** @type {Record<string, { name: string, nationAbbr?: string | null }>} */
  const lookup = {};

  const ref = await getDurableJson(WC_BDL_REFERENCE_KV_KEY);
  Object.assign(lookup, buildBdlPlayerIdLookup(ref?.players || []));

  try {
    const playersKv = await readWcPlayersFromKv();
    Object.assign(lookup, buildBdlPlayerIdLookup(playersKv?.bdlPlayers || []));
  } catch {
    /* non-fatal */
  }

  const needed = [
    ...new Set(
      (rows || [])
        .map((r) => r.player_id)
        .filter((id) => id != null)
        .map(String),
    ),
  ];
  const missing = needed.filter((id) => !lookup[id]);
  if (!missing.length) return lookup;

  const home = String(meta.homeTeam || "").trim().toUpperCase();
  const away = String(meta.awayTeam || "").trim().toUpperCase();
  if (!home && !away) return lookup;

  const teamsRes = await bdlFifaFetch("/teams", { "seasons[]": 2026 });
  const teams = Array.isArray(teamsRes.data?.data) ? teamsRes.data.data : [];
  const wanted = new Set([home, away].filter(Boolean));
  const teamIds = teams
    .filter((t) => {
      const abbr = String(t.abbreviation || t.fifa_code || t.code || t.name || "")
        .trim()
        .toUpperCase();
      return wanted.has(abbr);
    })
    .map((t) => t.id)
    .filter((id) => id != null);

  for (const teamId of teamIds) {
    const rosters = await bdlFifaFetchPaginated(
      "/rosters",
      { "seasons[]": 2026, "team_ids[]": teamId },
      { maxPages: 3, delayMs: 0 },
    );
    for (const row of rosters.rows || []) {
      const p = row.player && typeof row.player === "object" ? row.player : row;
      const normalized = normalizeBdlPlayerRow(p);
      if (!normalized) continue;
      lookup[String(normalized.id)] = {
        name: normalized.name,
        nationAbbr: normalized.countryCode || null,
      };
    }
  }

  return lookup;
}

/**
 * @param {number} bdlMatchId
 * @param {string} eventId
 * @param {{ homeTeam?: string, awayTeam?: string, scrapeMode?: string }} [meta]
 */
export async function scrapeAndCacheWcBdlMatchPlayerProps(bdlMatchId, eventId, meta = {}) {
  const res = await bdlFifaFetch("/odds/player_props", { match_id: bdlMatchId });
  if (!res.ok) {
    return { ok: false, eventId, error: res.error || "bdl_props_failed" };
  }

  const rows = Array.isArray(res.data?.data) ? res.data.data : [];
  const playerLookup = await resolveBdlPlayerLookupForPropRows(rows, meta);
  const markets = normalizeBdlPlayerPropsToMarkets(rows, playerLookup);
  const ingestAudit = auditBdlPlayerPropsIngest(rows, markets, playerLookup);
  if (!ingestAudit.healthy || ingestAudit.warnings.length) {
    console.warn(
      JSON.stringify({
        event: "wc_bdl_player_props_ingest_audit",
        eventId: String(eventId),
        bdlMatchId,
        homeTeam: meta.homeTeam || null,
        awayTeam: meta.awayTeam || null,
        ...ingestAudit,
      }),
    );
  }
  const anytimeCount = (markets.anytime_scorer || []).length;
  const shotsCount = (markets.player_shots_ou || []).length;
  const sotCount = (markets.player_sot_ou || []).length;
  const totalRows = WC_MATCH_PLAYER_PROP_MARKET_KEYS.reduce(
    (n, key) => n + (markets[key]?.length || 0),
    0,
  );
  const sufficient =
    anytimeCount >= 2 || shotsCount >= 1 || sotCount >= 1 || totalRows >= 3;
  if (!sufficient) {
    return {
      ok: false,
      eventId,
      error: "insufficient_bdl_props",
      anytimeCount,
      shotsCount,
      totalRows,
    };
  }

  const nowMs = Date.now();
  const cached = (await getDurableJson(WC_MATCH_PLAYER_PROPS_KV_KEY)) || {};
  const byEventId =
    cached.byEventId && typeof cached.byEventId === "object" ? { ...cached.byEventId } : {};

  byEventId[String(eventId)] = {
    eventId: String(eventId),
    bdlMatchId,
    homeTeam: meta.homeTeam || null,
    awayTeam: meta.awayTeam || null,
    lastUpdated: nowMs,
    source: "balldontlie",
    booksUsed: ["balldontlie"],
    markets,
  };

  await setDurableJson(
    WC_MATCH_PLAYER_PROPS_KV_KEY,
    { lastUpdated: nowMs, byEventId },
    { ttlSeconds: WC_MATCH_PLAYER_PROPS_TTL_SECONDS },
  );

  return {
    ok: true,
    eventId,
    source: "balldontlie",
    anytimeCount,
    ingestAudit,
  };
}

/** Live BDL futures → outrights KV refresh. */
export async function scrapeAndCacheWcBdlOutrights() {
  const res = await bdlFifaFetch("/odds/futures", { "seasons[]": 2026 });
  if (!res.ok) return { ok: false, error: res.error };

  const rows = Array.isArray(res.data?.data) ? res.data.data : [];
  const index = buildBdlFuturesIndex(rows);
  const outrightRows = index.byMarketType?.outright || {};
  /** @type {Record<string, string>} */
  const outrights = {};
  for (const [abbr, row] of Object.entries(outrightRows)) {
    if (row?.americanDisplay) outrights[abbr] = String(row.americanDisplay);
  }
  const sanitized = sanitizeWcTournamentWinnerOutrights(outrights);
  if (!Object.keys(sanitized).length) return { ok: false, error: "empty_outrights" };

  const nowMs = Date.now();
  await setDurableJson(
    WC_OUTRIGHTS_KV_KEY,
    {
      outrights: sanitized,
      lastUpdated: nowMs,
      source: "balldontlie",
      sourceTier: "balldontlie_live",
      bdlFutures: { byMarketType: index.byMarketType, rowCount: rows.length },
    },
    { ttlSeconds: WC_OUTRIGHTS_TTL_SECONDS },
  );

  return { ok: true, count: Object.keys(sanitized).length, source: "balldontlie" };
}

/**
 * @param {number} [nowMs]
 */
export async function readBdlLiveFuturesFromKv(nowMs = Date.now()) {
  const outrightsKv = await getDurableJson(WC_OUTRIGHTS_KV_KEY);
  if (outrightsKv?.bdlFutures?.byMarketType) {
    return {
      byMarketType: outrightsKv.bdlFutures.byMarketType,
      lastUpdated: outrightsKv.lastUpdated,
      source: "balldontlie_live",
      seededAt: outrightsKv.lastUpdated,
    };
  }
  void nowMs;
  return null;
}

/**
 * Cache BDL shot-map xG into advanced stats KV (post-FT).
 * @param {Record<string, unknown>} detail
 */
export async function cacheWcBdlAdvancedStatsFromDetail(detail) {
  const { buildBdlChanceQualityFromDetail } = await import("../shared/wcBdlMatchIntel.js");
  const { WC_MATCH_ADVANCED_STATS_KV_KEY, WC_MATCH_ADVANCED_STATS_TTL_SECONDS } = await import(
    "../shared/wc2026PlayerConstants.js"
  );

  const eventId = String(detail?.eventId || "").trim();
  if (!eventId) return { ok: false, error: "missing_event_id" };

  const chanceQuality = buildBdlChanceQualityFromDetail(detail);
  if (!chanceQuality) return { ok: false, eventId, error: "no_bdl_xg" };

  const nowMs = Date.now();
  const cached = (await getDurableJson(WC_MATCH_ADVANCED_STATS_KV_KEY)) || {};
  const byEventId =
    cached.byEventId && typeof cached.byEventId === "object" ? { ...cached.byEventId } : {};

  byEventId[eventId] = {
    ...chanceQuality,
    lastUpdated: nowMs,
    status: "FT",
  };

  await setDurableJson(
    WC_MATCH_ADVANCED_STATS_KV_KEY,
    { lastUpdated: nowMs, byEventId },
    { ttlSeconds: WC_MATCH_ADVANCED_STATS_TTL_SECONDS },
  );

  return { ok: true, eventId, payload: byEventId[eventId] };
}

/** Teams + stadiums + full player/roster catalog (GOAT). */
export async function scrapeAndCacheWcBdlReferenceCatalog() {
  if (!hasWcBdlApiKey()) return { ok: false, error: "missing_api_key" };

  const nowMs = Date.now();
  /** @type {string[]} */
  const errors = [];

  const [teamsRes, stadiumsRes] = await Promise.all([
    bdlFifaFetch("/teams", { "seasons[]": 2026 }),
    bdlFifaFetch("/stadiums", { "seasons[]": 2026 }),
  ]);

  const teams = Array.isArray(teamsRes.data?.data) ? teamsRes.data.data : [];
  const stadiums = Array.isArray(stadiumsRes.data?.data) ? stadiumsRes.data.data : [];
  if (!teamsRes.ok) errors.push(`teams: ${teamsRes.error}`);
  if (!stadiumsRes.ok) errors.push(`stadiums: ${stadiumsRes.error}`);

  const playersPaginated = await bdlFifaFetchPaginated(
    "/players",
    { "seasons[]": 2026, per_page: 100 },
    { maxPages: 40, delayMs: 0 },
  );
  const rostersPaginated = await bdlFifaFetchPaginated(
    "/rosters",
    { "seasons[]": 2026, per_page: 100 },
    { maxPages: 25, delayMs: 0 },
  );

  const players = [];
  for (const row of playersPaginated.rows || []) {
    const p = normalizeBdlPlayerRow(row);
    if (p) players.push(p);
  }
  const rosters = [];
  for (const row of rostersPaginated.rows || []) {
    const r = normalizeBdlRosterRow(row);
    if (r) rosters.push(r);
  }

  if (!playersPaginated.ok) errors.push(`players: ${playersPaginated.error}`);
  if (!rostersPaginated.ok) errors.push(`rosters: ${rostersPaginated.error}`);

  const payload = {
    lastUpdated: nowMs,
    source: "balldontlie",
    teams,
    stadiums,
    players,
    rosters,
    counts: {
      teams: teams.length,
      stadiums: stadiums.length,
      players: players.length,
      rosters: rosters.length,
    },
    errors,
  };

  await setDurableJson(WC_BDL_REFERENCE_KV_KEY, payload, { ttlSeconds: WC_PLAYERS_TTL_SECONDS });

  if (players.length) {
    await setDurableJson(
      WC_PLAYERS_KV_KEY,
      {
        lastUpdated: nowMs,
        source: "balldontlie_players_rosters",
        bdlPlayers: players,
        bdlRosters: rosters,
        byNation: groupBdlRostersByNation(rosters, players),
      },
      { ttlSeconds: WC_PLAYERS_TTL_SECONDS },
    );
  }

  return {
    ok: teams.length > 0 || players.length > 0,
    ...payload.counts,
    errors,
  };
}

/**
 * @param {Array<Record<string, unknown>>} rosters
 * @param {Array<Record<string, unknown>>} players
 */
function groupBdlRostersByNation(rosters, players) {
  /** @type {Record<string, string>} */
  const playerCountry = {};
  for (const p of players || []) {
    if (p.id != null && p.countryCode) playerCountry[String(p.id)] = String(p.countryCode);
  }
  /** @type {Record<string, number>} */
  const counts = {};
  for (const r of rosters || []) {
    const pid = r.player?.id;
    const nation = pid != null ? playerCountry[String(pid)] : null;
    if (!nation) continue;
    counts[nation] = (counts[nation] || 0) + 1;
  }
  return counts;
}
