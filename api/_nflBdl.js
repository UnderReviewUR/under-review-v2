/**
 * BallDontLie NFL GOAT client.
 * Live hydrate flips on when NFL_BDL_PRIMARY=1 and BALLDONTLIE_API_KEY has GOAT access.
 * Until then, board stays on Action Network; this module is safe no-op / empty.
 */
import { getEnv } from "./_env.js";
import { bdlFetch } from "./_balldontlie.js";
import {
  createEmptyNflGoatBriefcase,
  auditNflGoatBriefcaseCoverage,
  auditBriefcasePropCatalogCoverage,
} from "../shared/nflGoatExtractionContract.js";
import {
  buildDefenseMapFromBdlTeamSeasonStats,
} from "../shared/nflBdlDefenseNormalize.js";
import { getDurableJson, setDurableJson } from "./_durableStore.js";

const NFL_BDL_PREFIX = "/nfl/v1";
const DEFENSE_KV_KEY = "nfl_bdl_team_defense";
const DEFENSE_TTL_SEC = 6 * 60 * 60;

/**
 * Feature flag — set NFL_BDL_PRIMARY=1 when GOAT odds/props are live on the key.
 */
export function isNflBdlPrimaryEnabled() {
  const flag = String(getEnv("NFL_BDL_PRIMARY") || "").trim().toLowerCase();
  if (flag === "1" || flag === "true" || flag === "yes") return true;
  return false;
}

/**
 * @returns {string}
 */
export function getNflBdlApiKey() {
  return String(getEnv("BALLDONTLIE_API_KEY") || "").trim();
}

/**
 * @param {string} path
 * @param {Record<string, unknown>} [params]
 * @param {{ apiKey?: string, timeoutMs?: number }} [opts]
 */
export async function nflBdlFetch(path, params = {}, opts = {}) {
  const apiKey = opts.apiKey || getNflBdlApiKey();
  if (!apiKey) return { ok: false, status: 0, data: null, error: "missing_bdl_key" };
  const p = path.startsWith("/") ? path : `/${path}`;
  const full = p.startsWith("/nfl/") ? p : `${NFL_BDL_PREFIX}${p.startsWith("/") ? p : `/${p}`}`;
  return bdlFetch(full, params, { apiKey, timeoutMs: opts.timeoutMs ?? 15000 });
}

/**
 * Paginate BDL list endpoints (cursor). Caps pages to stay under cron budgets.
 * @param {string} path
 * @param {Record<string, unknown>} [params]
 * @param {{ apiKey?: string, timeoutMs?: number, maxPages?: number, perPage?: number }} [opts]
 */
export async function nflBdlFetchAllPages(path, params = {}, opts = {}) {
  const maxPages = Math.max(1, Math.min(Number(opts.maxPages) || 8, 20));
  const perPage = Math.max(1, Math.min(Number(opts.perPage) || 100, 100));
  /** @type {unknown[]} */
  const rows = [];
  let cursor = null;
  for (let page = 0; page < maxPages; page++) {
    const res = await nflBdlFetch(
      path,
      { ...params, per_page: perPage, ...(cursor != null ? { cursor } : {}) },
      opts,
    );
    if (!res.ok) {
      return { ok: false, status: res.status, data: rows, error: res.error || "fetch_failed" };
    }
    const batch = Array.isArray(res.data?.data) ? res.data.data : [];
    rows.push(...batch);
    cursor = res.data?.meta?.next_cursor ?? null;
    if (cursor == null || !batch.length) break;
  }
  return { ok: true, status: 200, data: rows, error: null };
}

/**
 * Normalize BDL player_props rows → board-ish propLines.
 * @param {Array<Record<string, unknown>>} rows
 * @param {{ gameLabel?: string, eventId?: string|number }} [ctx]
 */
export function normalizeNflBdlPlayerPropRows(rows, ctx = {}) {
  const allowedVendors = new Set([
    "draftkings",
    "fanduel",
    "betmgm",
    "caesars",
    "fanatics",
    "betrivers",
  ]);
  /** @type {Array<Record<string, unknown>>} */
  const out = [];
  for (const row of rows || []) {
    const vendor = String(row.vendor || "").toLowerCase();
    if (vendor && !allowedVendors.has(vendor)) continue;
    const player = String(
      row.player?.full_name ||
        [row.player?.first_name, row.player?.last_name].filter(Boolean).join(" ") ||
        "",
    ).trim();
    if (!player && row.player_id == null) continue;
    const propRaw = String(row.prop_type || "prop").trim();
    const prop = propRaw.replace(/_/g, " ");
    const market = row.market && typeof row.market === "object" ? row.market : {};
    const lineVal = row.line_value != null ? Number.parseFloat(String(row.line_value)) : NaN;
    const eventId = ctx.eventId ?? row.game_id ?? null;
    const game = ctx.gameLabel || "NFL";

    if (market.type === "over_under" && Number.isFinite(lineVal)) {
      out.push({
        game,
        player: player || `player_${row.player_id}`,
        playerId: row.player_id ?? null,
        prop,
        propRaw,
        line: lineVal,
        overOdds: market.over_odds ?? null,
        underOdds: market.under_odds ?? null,
        book: vendor || "unknown",
        eventId: eventId != null ? String(eventId) : null,
        source: "balldontlie_nfl",
      });
    } else if (market.type === "milestone" && market.odds != null) {
      out.push({
        game,
        player: player || `player_${row.player_id}`,
        playerId: row.player_id ?? null,
        prop,
        propRaw,
        line: Number.isFinite(lineVal) ? lineVal : 0.5,
        overOdds: market.odds,
        underOdds: null,
        book: vendor || "unknown",
        eventId: eventId != null ? String(eventId) : null,
        source: "balldontlie_nfl",
        marketType: "milestone",
      });
    }
  }
  return out;
}

/**
 * @param {Array<Record<string, unknown>>} rows
 */
export function normalizeNflBdlGames(rows) {
  return (Array.isArray(rows) ? rows : [])
    .map((g) => {
      const homeAbbr = String(g?.home_team?.abbreviation || "").toUpperCase();
      const awayAbbr = String(
        g?.visitor_team?.abbreviation || g?.away_team?.abbreviation || "",
      ).toUpperCase();
      if (!homeAbbr || !awayAbbr) return null;
      return {
        providerGameId: g.id ?? null,
        homeAbbr,
        awayAbbr,
        homeName: g?.home_team?.full_name || g?.home_team?.name || homeAbbr,
        awayName:
          g?.visitor_team?.full_name ||
          g?.away_team?.full_name ||
          g?.visitor_team?.name ||
          awayAbbr,
        week: g.week ?? null,
        season: g.season ?? null,
        status: g.status || null,
        startTime: g.date || null,
        seasonType: g.postseason ? "post" : "regular",
        homeScore: g.home_team_score ?? null,
        awayScore: g.visitor_team_score ?? g.away_team_score ?? null,
        source: "balldontlie_nfl",
      };
    })
    .filter(Boolean);
}

/**
 * @param {Array<Record<string, unknown>>} rows
 */
export function normalizeNflBdlInjuries(rows) {
  return (Array.isArray(rows) ? rows : []).map((row) => ({
    player: String(
      row?.player?.full_name ||
        [row?.player?.first_name, row?.player?.last_name].filter(Boolean).join(" ") ||
        row?.player_name ||
        "",
    ).trim(),
    playerId: row?.player?.id ?? row?.player_id ?? null,
    team: String(row?.team?.abbreviation || row?.player?.team?.abbreviation || "").toUpperCase() || null,
    position: row?.player?.position || row?.position || null,
    status: row?.status || row?.injury_status || null,
    comment: row?.comment || null,
    source: "balldontlie_nfl",
  }));
}

/**
 * @param {Array<Record<string, unknown>>} rows
 */
export function normalizeNflBdlSeasonStatRows(rows) {
  return (Array.isArray(rows) ? rows : []).map((row) => ({
    player: String(
      row?.player?.full_name ||
        [row?.player?.first_name, row?.player?.last_name].filter(Boolean).join(" ") ||
        "",
    ).trim(),
    playerId: row?.player?.id ?? row?.player_id ?? null,
    team: String(row?.team?.abbreviation || row?.player?.team?.abbreviation || "").toUpperCase() || null,
    position: row?.player?.position || null,
    season: row?.season ?? null,
    games: row?.games_played ?? row?.games ?? null,
    passYds: row?.passing_yards ?? null,
    passTd: row?.passing_touchdowns ?? null,
    rushYds: row?.rushing_yards ?? null,
    rushTd: row?.rushing_touchdowns ?? null,
    recYds: row?.receiving_yards ?? null,
    recTd: row?.receiving_touchdowns ?? null,
    receptions: row?.receptions ?? row?.receiving_receptions ?? null,
    targets: row?.receiving_targets ?? row?.targets ?? null,
    source: "balldontlie_season_stats",
  }));
}

/**
 * Recent game logs → recentStats pocket (+ opponent when present).
 * @param {Array<Record<string, unknown>>} rows
 */
export function normalizeNflBdlGameStatRows(rows) {
  return (Array.isArray(rows) ? rows : []).map((row) => {
    const home = String(row?.game?.home_team?.abbreviation || "").toUpperCase();
    const away = String(
      row?.game?.visitor_team?.abbreviation || row?.game?.away_team?.abbreviation || "",
    ).toUpperCase();
    const team = String(row?.team?.abbreviation || "").toUpperCase();
    const opponent = team && home && away ? (team === home ? away : home) : null;
    return {
      player: String(
        row?.player?.full_name ||
          [row?.player?.first_name, row?.player?.last_name].filter(Boolean).join(" ") ||
          "",
      ).trim(),
      playerId: row?.player?.id ?? row?.player_id ?? null,
      team: team || null,
      opponent,
      week: row?.game?.week ?? row?.week ?? null,
      season: row?.game?.season ?? row?.season ?? null,
      passYds: row?.passing_yards ?? null,
      rushYds: row?.rushing_yards ?? null,
      recYds: row?.receiving_yards ?? null,
      receptions: row?.receptions ?? row?.receiving_receptions ?? null,
      passTd: row?.passing_touchdowns ?? null,
      rushTd: row?.rushing_touchdowns ?? null,
      recTd: row?.receiving_touchdowns ?? null,
      source: "balldontlie_stats",
    };
  });
}

export async function fetchNflBdlPlayerPropsForGame(gameId, opts = {}) {
  const gid = Number(gameId);
  if (!Number.isFinite(gid)) return [];
  const res = await nflBdlFetch(
    "/odds/player_props",
    { game_id: gid },
    { apiKey: opts.apiKey, timeoutMs: 20000 },
  );
  if (!res.ok || !Array.isArray(res.data?.data)) return [];
  return normalizeNflBdlPlayerPropRows(res.data.data, {
    gameLabel: opts.gameLabel,
    eventId: gid,
  });
}

export async function fetchNflBdlWeekOdds(opts) {
  const res = await nflBdlFetch(
    "/odds",
    { season: opts.season, week: opts.week },
    { apiKey: opts.apiKey, timeoutMs: 20000 },
  );
  if (!res.ok || !Array.isArray(res.data?.data)) return [];
  return res.data.data;
}

export async function fetchNflBdlWeekGames(opts) {
  const res = await nflBdlFetchAllPages(
    "/games",
    {
      seasons: [opts.season],
      weeks: [opts.week],
      ...(opts.postseason != null ? { postseason: opts.postseason } : {}),
    },
    { apiKey: opts.apiKey, timeoutMs: 20000, maxPages: 3 },
  );
  if (!res.ok) return [];
  return normalizeNflBdlGames(/** @type {Array<Record<string, unknown>>} */ (res.data));
}

export async function fetchNflBdlTeams(opts = {}) {
  const res = await nflBdlFetchAllPages("/teams", {}, { apiKey: opts.apiKey, maxPages: 2 });
  if (!res.ok) return [];
  return /** @type {Array<Record<string, unknown>>} */ (res.data);
}

export async function fetchNflBdlPlayerInjuries(opts = {}) {
  const res = await nflBdlFetchAllPages(
    "/player_injuries",
    {},
    { apiKey: opts.apiKey, timeoutMs: 20000, maxPages: 6 },
  );
  if (!res.ok) return [];
  return normalizeNflBdlInjuries(/** @type {Array<Record<string, unknown>>} */ (res.data));
}

/**
 * Fetch all-32 team season stats and normalize to defense map.
 * @param {{ season: number, apiKey?: string, useCache?: boolean }} opts
 */
export async function fetchNflBdlDefenseMap(opts) {
  const season = Number(opts.season);
  if (!Number.isFinite(season)) return { defenseByTeam: {}, source: "none" };

  if (opts.useCache !== false) {
    try {
      const cached = await getDurableJson(DEFENSE_KV_KEY);
      if (
        cached &&
        typeof cached === "object" &&
        cached.season === season &&
        cached.defenseByTeam &&
        Object.keys(cached.defenseByTeam).length >= 20
      ) {
        const age = cached.fetchedAt ? Date.now() - Number(cached.fetchedAt) : Infinity;
        if (age < DEFENSE_TTL_SEC * 1000) {
          return {
            defenseByTeam: cached.defenseByTeam,
            source: "kv_cache",
            fetchedAt: cached.fetchedAt,
          };
        }
      }
    } catch {
      /* ignore */
    }
  }

  const teams = await fetchNflBdlTeams({ apiKey: opts.apiKey });
  const ids = teams.map((t) => t.id).filter((id) => id != null);
  if (!ids.length) return { defenseByTeam: {}, source: "empty_teams" };

  /** @type {unknown[]} */
  const rows = [];
  // Batch team_ids to keep URLs reasonable
  for (let i = 0; i < ids.length; i += 16) {
    const slice = ids.slice(i, i + 16);
    const res = await nflBdlFetchAllPages(
      "/team_season_stats",
      { season, team_ids: slice, season_type: 2 },
      { apiKey: opts.apiKey, timeoutMs: 25000, maxPages: 2 },
    );
    if (res.ok && Array.isArray(res.data)) rows.push(...res.data);
  }

  const defenseByTeam = buildDefenseMapFromBdlTeamSeasonStats(
    /** @type {Array<Record<string, unknown>>} */ (rows),
    { season },
  );
  const fetchedAt = Date.now();
  try {
    await setDurableJson(
      DEFENSE_KV_KEY,
      { season, fetchedAt, defenseByTeam },
      { ttlSeconds: DEFENSE_TTL_SEC },
    );
  } catch {
    /* ignore */
  }
  return { defenseByTeam, source: "live", fetchedAt };
}

/**
 * @param {{ season: number, playerIds?: Array<number|string>, apiKey?: string }} opts
 */
export async function fetchNflBdlSeasonStats(opts) {
  const params = {
    season: opts.season,
    ...(opts.playerIds?.length ? { player_ids: opts.playerIds } : {}),
  };
  const res = await nflBdlFetchAllPages("/season_stats", params, {
    apiKey: opts.apiKey,
    timeoutMs: 25000,
    maxPages: opts.playerIds?.length ? 4 : 2,
  });
  if (!res.ok) return [];
  return normalizeNflBdlSeasonStatRows(/** @type {Array<Record<string, unknown>>} */ (res.data));
}

/**
 * Recent game logs for named player ids (or empty).
 * @param {{ seasons?: number[], playerIds?: Array<number|string>, apiKey?: string }} opts
 */
export async function fetchNflBdlRecentPlayerStats(opts) {
  if (!opts.playerIds?.length) return [];
  const res = await nflBdlFetchAllPages(
    "/stats",
    {
      player_ids: opts.playerIds,
      ...(opts.seasons?.length ? { seasons: opts.seasons } : {}),
      season_type: 2,
    },
    { apiKey: opts.apiKey, timeoutMs: 25000, maxPages: 4 },
  );
  if (!res.ok) return [];
  return normalizeNflBdlGameStatRows(/** @type {Array<Record<string, unknown>>} */ (res.data));
}

/**
 * Build a GOAT briefcase. Expands when NFL_BDL_PRIMARY=1 + key works.
 * @param {{
 *   week?: number|null,
 *   season?: number|null,
 *   gameIds?: Array<number|string>,
 *   playerIds?: Array<number|string>,
 *   hydrateDefense?: boolean,
 *   hydrateInjuries?: boolean,
 *   hydrateStats?: boolean,
 * }} [opts]
 */
export async function buildNflGoatBriefcase(opts = {}) {
  const briefcase = createEmptyNflGoatBriefcase({
    week: opts.week ?? null,
    season: opts.season ?? null,
    asOf: new Date().toISOString(),
    primarySource: isNflBdlPrimaryEnabled() ? "balldontlie_nfl" : "action_network",
  });
  briefcase.league.teamDefense = {};
  briefcase.league.defenseSource = null;

  if (!isNflBdlPrimaryEnabled() || !getNflBdlApiKey()) {
    briefcase.coverage = {
      ...briefcase.coverage,
      ...auditNflGoatBriefcaseCoverage(briefcase),
      note: "BDL NFL primary off or key missing — AN board remains live path",
    };
    return briefcase;
  }

  const season = opts.season != null ? Number(opts.season) : inferDefaultNflSeason();
  const week = opts.week != null ? Number(opts.week) : null;
  briefcase.season = season;
  briefcase.week = week;

  try {
    if (week != null && Number.isFinite(week)) {
      const games = await fetchNflBdlWeekGames({ season, week });
      if (games.length) briefcase.slate.games = games;
      briefcase.slate.odds = await fetchNflBdlWeekOdds({ season, week });
      const gids =
        opts.gameIds?.length > 0
          ? opts.gameIds
          : games.map((g) => g.providerGameId).filter((id) => id != null).slice(0, 16);
      for (const gid of gids) {
        const game = games.find((g) => String(g.providerGameId) === String(gid));
        const label = game ? `${game.awayAbbr} @ ${game.homeAbbr}` : "NFL";
        const props = await fetchNflBdlPlayerPropsForGame(gid, { gameLabel: label });
        briefcase.slate.playerProps.push(...props);
      }
    } else if (opts.gameIds?.length) {
      for (const gid of opts.gameIds) {
        const props = await fetchNflBdlPlayerPropsForGame(gid);
        briefcase.slate.playerProps.push(...props);
      }
    }
  } catch (err) {
    console.warn(
      JSON.stringify({ event: "nfl_goat_slate_failed", error: err?.message || String(err) }),
    );
  }

  if (opts.hydrateDefense !== false && Number.isFinite(season)) {
    try {
      const def = await fetchNflBdlDefenseMap({ season, useCache: true });
      briefcase.league.teamDefense = def.defenseByTeam || {};
      briefcase.league.defenseSource = def.source || "live";
    } catch (err) {
      console.warn(
        JSON.stringify({ event: "nfl_goat_defense_failed", error: err?.message || String(err) }),
      );
    }
  }

  if (opts.hydrateInjuries !== false) {
    try {
      briefcase.league.injuries = await fetchNflBdlPlayerInjuries();
    } catch (err) {
      console.warn(
        JSON.stringify({ event: "nfl_goat_injuries_failed", error: err?.message || String(err) }),
      );
    }
  }

  if (opts.hydrateStats !== false) {
    try {
      const fromProps = (briefcase.slate.playerProps || [])
        .map((r) => r.playerId)
        .filter((id) => id != null && id !== "");
      const playerIds = [
        ...new Set([...(opts.playerIds || []), ...fromProps].map(String)),
      ].slice(0, 40);
      if (playerIds.length) {
        briefcase.players.seasonStats = await fetchNflBdlSeasonStats({
          season,
          playerIds,
        });
        briefcase.players.recentStats = await fetchNflBdlRecentPlayerStats({
          seasons: [season, season - 1],
          playerIds,
        });
      }
    } catch (err) {
      console.warn(
        JSON.stringify({ event: "nfl_goat_stats_failed", error: err?.message || String(err) }),
      );
    }
  }

  const audit = auditNflGoatBriefcaseCoverage(briefcase);
  const propCatalog = auditBriefcasePropCatalogCoverage(briefcase);
  briefcase.coverage = {
    ...briefcase.coverage,
    ...audit,
    propCatalog,
    defenseTeams: Object.keys(briefcase.league.teamDefense || {}).length,
  };
  return briefcase;
}

function inferDefaultNflSeason() {
  const now = new Date();
  const y = now.getUTCFullYear();
  const m = now.getUTCMonth() + 1;
  // NFL season year labels the fall start (Sep 2026 → 2026). Jan–Feb still prior year.
  return m >= 3 ? y : y - 1;
}
