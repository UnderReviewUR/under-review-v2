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
import { inferNflSeasonYear } from "../shared/bdlSeasonDefaults.js";

const NFL_BDL_PREFIX = "/nfl/v1";
const DEFENSE_KV_KEY = "nfl_bdl_team_defense";
const DEFENSE_TTL_SEC = 6 * 60 * 60;
const ROSTERS_KV_PREFIX = "nfl_bdl_all_rosters";
const ROSTERS_TTL_SEC = 6 * 60 * 60;
const PREFERRED_ODDS_VENDORS = ["draftkings", "fanduel", "betmgm", "caesars", "fanatics", "betrivers"];
const LIVE_GAME_STATUS_STATES = new Set(["in_progress", "delayed", "suspended"]);

/**
 * BDL NFL expects bracket array params (`team_ids[]=1`), not bare repeats.
 * @param {Record<string, unknown>} params
 */
export function nflBdlQueryParams(params = {}) {
  /** @type {Record<string, unknown>} */
  const out = {};
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === "") continue;
    if (Array.isArray(value)) out[`${key}[]`] = value;
    else out[key] = value;
  }
  return out;
}

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
  return bdlFetch(full, nflBdlQueryParams(params), { apiKey, timeoutMs: opts.timeoutMs ?? 15000 });
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
        statusState: g.status_state || null,
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

/**
 * @param {Record<string, unknown>} row
 * @param {{ opening?: boolean }} [opts]
 */
export function normalizeNflBdlOddsRow(row, opts = {}) {
  if (!row || typeof row !== "object") return null;
  const vendor = String(row.vendor || "").toLowerCase();
  const spreadHome = row.spread_home_value ?? null;
  const spreadAway = row.spread_away_value ?? null;
  const totalLine = row.total_value ?? null;
  return {
    game_id: row.game_id ?? null,
    vendor,
    book: vendor || "unknown",
    spread:
      spreadHome != null || spreadAway != null
        ? {
            home: spreadHome,
            homeOdds: row.spread_home_odds ?? null,
            away: spreadAway,
            awayOdds: row.spread_away_odds ?? null,
          }
        : null,
    total:
      totalLine != null
        ? {
            line: totalLine,
            overOdds: row.total_over_odds ?? null,
            underOdds: row.total_under_odds ?? null,
          }
        : null,
    moneyline:
      row.moneyline_home_odds != null || row.moneyline_away_odds != null
        ? {
            home: row.moneyline_home_odds ?? null,
            away: row.moneyline_away_odds ?? null,
          }
        : null,
    openedAt: opts.opening ? row.opened_at ?? null : null,
    updatedAt: row.updated_at ?? null,
    source: "balldontlie_nfl",
  };
}

/**
 * @param {Array<Record<string, unknown>>} rows
 * @param {{ opening?: boolean, preferVendor?: boolean }} [opts]
 */
export function normalizeNflBdlOddsRows(rows, opts = {}) {
  const normalized = (Array.isArray(rows) ? rows : [])
    .map((row) => normalizeNflBdlOddsRow(row, opts))
    .filter(Boolean);
  if (!opts.preferVendor) return normalized;

  /** @type {Map<string|number, Record<string, unknown>>} */
  const byGame = new Map();
  for (const row of normalized) {
    const gid = row.game_id;
    if (gid == null) continue;
    const existing = byGame.get(gid);
    if (!existing) {
      byGame.set(gid, row);
      continue;
    }
    const curRank = PREFERRED_ODDS_VENDORS.indexOf(String(existing.vendor || ""));
    const nextRank = PREFERRED_ODDS_VENDORS.indexOf(String(row.vendor || ""));
    if (nextRank >= 0 && (curRank < 0 || nextRank < curRank)) {
      byGame.set(gid, row);
    }
  }
  return [...byGame.values(), ...normalized.filter((r) => r.game_id == null || !byGame.has(r.game_id))];
}

/**
 * @param {Array<Record<string, unknown>>} rows
 * @param {string} teamAbbr
 */
export function normalizeNflBdlRosterRows(rows, teamAbbr) {
  return (Array.isArray(rows) ? rows : []).map((row) => {
    const player = row?.player && typeof row.player === "object" ? row.player : {};
    const name = String(
      row?.player_name ||
        player.full_name ||
        [player.first_name, player.last_name].filter(Boolean).join(" ") ||
        "",
    ).trim();
    const position = String(row?.position || player.position || "").trim() || null;
    const depth = row?.depth != null ? Number(row.depth) : null;
    return {
      role: depth != null && position ? `${position}${depth}` : position,
      name,
      position,
      depth,
      playerId: player.id ?? row?.player_id ?? null,
      jersey: player.jersey_number ?? row?.jersey_number ?? null,
      injuryStatus: row?.injury_status ?? null,
      team: String(teamAbbr || "").toUpperCase() || null,
      source: "balldontlie_nfl",
    };
  });
}

/**
 * @param {Array<Record<string, unknown>>} rows
 */
export function normalizeNflBdlStandingsRows(rows) {
  return (Array.isArray(rows) ? rows : []).map((row) => ({
    team: String(row?.team?.abbreviation || row?.abbreviation || "").toUpperCase() || null,
    teamName: row?.team?.full_name || row?.team?.name || null,
    conference: row?.team?.conference || row?.conference || null,
    division: row?.team?.division || row?.division || null,
    wins: row?.wins ?? null,
    losses: row?.losses ?? null,
    ties: row?.ties ?? null,
    winPct: row?.win_percentage ?? row?.win_pct ?? null,
    season: row?.season ?? null,
    source: "balldontlie_nfl",
  }));
}

/**
 * @param {Array<Record<string, unknown>>} rows
 * @param {"passing"|"rushing"|"receiving"} kind
 */
export function normalizeNflBdlAdvancedStatRows(rows, kind) {
  return (Array.isArray(rows) ? rows : []).map((row) => ({
    kind,
    player: String(
      row?.player?.full_name ||
        [row?.player?.first_name, row?.player?.last_name].filter(Boolean).join(" ") ||
        "",
    ).trim(),
    playerId: row?.player?.id ?? row?.player_id ?? null,
    team: String(row?.team?.abbreviation || row?.player?.team?.abbreviation || "").toUpperCase() || null,
    season: row?.season ?? null,
    week: row?.week ?? null,
    metrics: row,
    source: `balldontlie_advanced_${kind}`,
  }));
}

/**
 * @param {Array<Record<string, unknown>>} rows
 */
export function normalizeNflBdlPlayRows(rows) {
  return (Array.isArray(rows) ? rows : []).map((row) => ({
    id: row?.id ?? null,
    gameId: row?.game_id ?? null,
    quarter: row?.quarter ?? null,
    clock: row?.clock ?? null,
    description: row?.description ?? row?.text ?? null,
    type: row?.type ?? row?.play_type ?? null,
    homeScore: row?.home_score ?? null,
    awayScore: row?.away_score ?? null,
    wallclock: row?.wallclock ?? row?.created_at ?? null,
    source: "balldontlie_nfl",
  }));
}

export function isNflBdlLiveGameStatus(statusState, status) {
  const state = String(statusState || "").toLowerCase();
  if (LIVE_GAME_STATUS_STATES.has(state)) return true;
  const s = String(status || "").toLowerCase();
  return /\b(in progress|live|halftime|delayed|overtime)\b/.test(s);
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
  if (!res.ok || !Array.isArray(res.data?.data)) return { rows: [], ok: false, status: res.status, error: res.error };
  const rows = normalizeNflBdlOddsRows(res.data.data, { preferVendor: true });
  return { rows, ok: true, status: res.status, error: null };
}

export async function fetchNflBdlOpeningOdds(opts) {
  const res = await nflBdlFetch(
    "/odds/opening",
    { season: opts.season, week: opts.week },
    { apiKey: opts.apiKey, timeoutMs: 20000 },
  );
  if (!res.ok || !Array.isArray(res.data?.data)) return { rows: [], ok: false, status: res.status, error: res.error };
  const rows = normalizeNflBdlOddsRows(res.data.data, { opening: true, preferVendor: true });
  return { rows, ok: true, status: res.status, error: null };
}

export async function fetchNflBdlWeekGames(opts) {
  const res = await nflBdlFetchAllPages(
    "/games",
    {
      season: opts.season,
      week: opts.week,
      ...(opts.seasonType != null ? { season_type: opts.seasonType } : {}),
      ...(opts.postseason != null ? { postseason: opts.postseason } : {}),
    },
    { apiKey: opts.apiKey, timeoutMs: 20000, maxPages: 3 },
  );
  if (!res.ok) return { games: [], ok: false, status: res.status, error: res.error };
  const games = normalizeNflBdlGames(/** @type {Array<Record<string, unknown>>} */ (res.data));
  return { games, ok: true, status: res.status, error: null };
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

export async function fetchNflBdlStandings(opts) {
  const season = Number(opts.season);
  if (!Number.isFinite(season)) return { rows: [], ok: false, status: 0, error: "missing_season" };
  const res = await nflBdlFetch("/standings", { season }, { apiKey: opts.apiKey, timeoutMs: 20000 });
  if (!res.ok || !Array.isArray(res.data?.data)) {
    return { rows: [], ok: false, status: res.status, error: res.error };
  }
  return {
    rows: normalizeNflBdlStandingsRows(res.data.data),
    ok: true,
    status: res.status,
    error: null,
  };
}

/**
 * @param {Array<{ homeAbbr?: string, awayAbbr?: string }>} games
 * @param {{ season: number, apiKey?: string, teams?: Array<Record<string, unknown>> }} opts
 */
export async function fetchNflBdlSlateRosters(games, opts) {
  const season = Number(opts.season);
  if (!Number.isFinite(season)) return { rostersByTeam: {}, ok: false, status: 0, error: "missing_season" };

  const teams =
    opts.teams?.length > 0 ? opts.teams : await fetchNflBdlTeams({ apiKey: opts.apiKey });
  /** @type {Map<string, number>} */
  const abbrToId = new Map(
    teams
      .map((t) => [String(t?.abbreviation || "").toUpperCase(), Number(t?.id)])
      .filter(([abbr, id]) => abbr && Number.isFinite(id)),
  );

  /** @type {Set<string>} */
  const abbrs = new Set();
  for (const g of games || []) {
    if (g?.homeAbbr) abbrs.add(String(g.homeAbbr).toUpperCase());
    if (g?.awayAbbr) abbrs.add(String(g.awayAbbr).toUpperCase());
  }

  /** @type {Record<string, Array<Record<string, unknown>>>} */
  const rostersByTeam = {};
  let ok = true;
  let lastStatus = 200;
  let lastError = null;

  for (const abbr of abbrs) {
    const teamId = abbrToId.get(abbr);
    if (!teamId) continue;
    const res = await nflBdlFetch(
      `/teams/${teamId}/roster`,
      { season },
      { apiKey: opts.apiKey, timeoutMs: 20000 },
    );
    lastStatus = res.status;
    if (!res.ok) {
      ok = false;
      lastError = res.error;
      continue;
    }
    const rows = Array.isArray(res.data?.data) ? res.data.data : [];
    if (rows.length) rostersByTeam[abbr] = normalizeNflBdlRosterRows(rows, abbr);
  }

  return {
    rostersByTeam,
    ok: ok && Object.keys(rostersByTeam).length > 0,
    status: lastStatus,
    error: lastError,
    teamCount: Object.keys(rostersByTeam).length,
  };
}

function rostersKvKey(season) {
  return `${ROSTERS_KV_PREFIX}_${season}`;
}

/**
 * All 32 NFL team rosters for a season (cached 6h).
 * @param {{ season: number, apiKey?: string, useCache?: boolean, forceRefresh?: boolean }} opts
 */
export async function fetchNflBdlAllTeamRosters(opts) {
  const season = Number(opts.season);
  if (!Number.isFinite(season)) {
    return { rostersByTeam: {}, ok: false, teamCount: 0, error: "missing_season", source: "none" };
  }

  const cacheKey = rostersKvKey(season);
  if (opts.useCache !== false && !opts.forceRefresh) {
    try {
      const cached = await getDurableJson(cacheKey);
      if (
        cached?.season === season &&
        cached?.rostersByTeam &&
        Object.keys(cached.rostersByTeam).length >= 28 &&
        Date.now() - (cached.fetchedAt || 0) < ROSTERS_TTL_SEC * 1000
      ) {
        return {
          rostersByTeam: cached.rostersByTeam,
          ok: true,
          teamCount: Object.keys(cached.rostersByTeam).length,
          source: "cache",
          fetchedAt: cached.fetchedAt,
        };
      }
    } catch {
      /* ignore */
    }
  }

  const apiKey = opts.apiKey;
  const teams = await fetchNflBdlTeams({ apiKey });
  /** @type {Record<string, Array<Record<string, unknown>>>} */
  const rostersByTeam = {};
  let ok = true;
  let lastError = null;

  for (const team of teams) {
    const abbr = String(team?.abbreviation || "").toUpperCase();
    const teamId = Number(team?.id);
    if (!abbr || !Number.isFinite(teamId)) continue;
    const res = await nflBdlFetch(
      `/teams/${teamId}/roster`,
      { season },
      { apiKey, timeoutMs: 20000 },
    );
    if (!res.ok) {
      ok = false;
      lastError = res.error;
      continue;
    }
    const rows = Array.isArray(res.data?.data) ? res.data.data : [];
    if (rows.length) rostersByTeam[abbr] = normalizeNflBdlRosterRows(rows, abbr);
  }

  const teamCount = Object.keys(rostersByTeam).length;
  const result = {
    rostersByTeam,
    ok: teamCount >= 28,
    teamCount,
    error: teamCount >= 28 ? null : lastError || "incomplete_roster_fetch",
    source: "live",
    fetchedAt: Date.now(),
  };

  if (teamCount >= 28) {
    try {
      await setDurableJson(
        cacheKey,
        { season, rostersByTeam, fetchedAt: result.fetchedAt },
        { ttlSeconds: ROSTERS_TTL_SEC },
      );
    } catch {
      /* ignore */
    }
  }

  return result;
}

/**
 * @param {{ season: number, playerIds?: Array<number|string>, apiKey?: string, maxPlayers?: number }} opts
 */
export async function fetchNflBdlAdvancedStats(opts) {
  const season = Number(opts.season);
  if (!Number.isFinite(season)) {
    return {
      passing: [],
      rushing: [],
      receiving: [],
      ok: false,
      status: 0,
      error: "missing_season",
    };
  }

  const playerIds = [...new Set((opts.playerIds || []).map(String))].slice(
    0,
    Math.max(1, Math.min(Number(opts.maxPlayers) || 12, 20)),
  );
  /** @type {{ passing: unknown[], rushing: unknown[], receiving: unknown[] }} */
  const out = { passing: [], rushing: [], receiving: [] };
  /** @type {Array<["passing"|"rushing"|"receiving", string]>} */
  const kinds = ["passing", "rushing", "receiving"];
  let ok = true;
  let lastStatus = 200;
  let lastError = null;

  if (!playerIds.length) {
    for (const kind of kinds) {
      const res = await nflBdlFetch(
        `/advanced_stats/${kind}`,
        { season, per_page: 25, season_type: 2 },
        { apiKey: opts.apiKey, timeoutMs: 20000 },
      );
      lastStatus = res.status;
      if (!res.ok) {
        ok = false;
        lastError = res.error;
        continue;
      }
      out[kind] = normalizeNflBdlAdvancedStatRows(
        Array.isArray(res.data?.data) ? res.data.data : [],
        kind,
      );
    }
    return { ...out, ok, status: lastStatus, error: lastError };
  }

  for (const pid of playerIds) {
    for (const kind of kinds) {
      const res = await nflBdlFetch(
        `/advanced_stats/${kind}`,
        { season, player_id: Number(pid), season_type: 2 },
        { apiKey: opts.apiKey, timeoutMs: 20000 },
      );
      lastStatus = res.status;
      if (!res.ok) {
        ok = false;
        lastError = res.error;
        continue;
      }
      const rows = normalizeNflBdlAdvancedStatRows(
        Array.isArray(res.data?.data) ? res.data.data : [],
        kind,
      );
      out[kind].push(...rows);
    }
  }

  return { ...out, ok, status: lastStatus, error: lastError };
}

/**
 * @param {number|string} gameId
 * @param {{ apiKey?: string, maxPages?: number }} [opts]
 */
export async function fetchNflBdlPlaysForGame(gameId, opts = {}) {
  const gid = Number(gameId);
  if (!Number.isFinite(gid)) return { rows: [], ok: false, status: 0, error: "missing_game_id" };
  const res = await nflBdlFetchAllPages(
    "/plays",
    { game_id: gid },
    { apiKey: opts.apiKey, timeoutMs: 20000, maxPages: Math.min(Number(opts.maxPages) || 4, 8) },
  );
  if (!res.ok) return { rows: [], ok: false, status: res.status, error: res.error };
  return {
    rows: normalizeNflBdlPlayRows(/** @type {Array<Record<string, unknown>>} */ (res.data)),
    ok: true,
    status: res.status,
    error: null,
  };
}

export async function fetchNflBdlActivePlayers(opts = {}) {
  const res = await nflBdlFetchAllPages(
    "/active_players",
    { per_page: 100 },
    { apiKey: opts.apiKey, timeoutMs: 20000, maxPages: 4 },
  );
  if (!res.ok) return { rows: [], ok: false, status: res.status, error: res.error };
  return {
    rows: /** @type {Array<Record<string, unknown>>} */ (res.data),
    ok: true,
    status: res.status,
    error: null,
  };
}

/**
 * Per-game team box stats (ALL-STAR+).
 * @param {{ season?: number, gameIds?: Array<number|string>, apiKey?: string, maxPages?: number }} opts
 */
export async function fetchNflBdlTeamStats(opts = {}) {
  const params = {
    season_type: 2,
    ...(opts.season != null ? { seasons: [opts.season] } : {}),
    ...(opts.gameIds?.length ? { game_ids: opts.gameIds.map(Number).filter(Number.isFinite) } : {}),
  };
  const res = await nflBdlFetchAllPages("/team_stats", params, {
    apiKey: opts.apiKey,
    timeoutMs: 20000,
    maxPages: Math.min(Number(opts.maxPages) || 3, 6),
  });
  if (!res.ok) return { rows: [], ok: false, status: res.status, error: res.error };
  return {
    rows: /** @type {Array<Record<string, unknown>>} */ (res.data),
    ok: true,
    status: res.status,
    error: null,
  };
}

/** @param {{ season?: number, week?: number, providers?: string[], apiKey?: string }} opts */
export async function fetchNflBdlDfsSlates(opts = {}) {
  const params = {
    active: opts.active ?? true,
    per_page: 25,
    ...(opts.providers?.length ? { providers: opts.providers } : { providers: ["draftkings"] }),
    ...(opts.season != null ? { seasons: [opts.season] } : {}),
    ...(opts.week != null ? { weeks: [opts.week] } : {}),
  };
  const res = await nflBdlFetchAllPages("/dfs/slates", params, {
    apiKey: opts.apiKey,
    timeoutMs: 20000,
    maxPages: 2,
  });
  if (!res.ok) return { slates: [], ok: false, status: res.status, error: res.error };
  return {
    slates: /** @type {Array<Record<string, unknown>>} */ (res.data),
    ok: true,
    status: res.status,
    error: null,
  };
}

/** @param {{ slateId: number|string, positions?: string[], apiKey?: string }} opts */
export async function fetchNflBdlDfsDraftables(opts = {}) {
  const sid = Number(opts.slateId);
  if (!Number.isFinite(sid)) return { rows: [], ok: false, status: 0, error: "missing_slate_id" };
  const params = {
    slate_ids: [sid],
    per_page: 100,
    ...(opts.positions?.length ? { positions: opts.positions } : {}),
  };
  const res = await nflBdlFetchAllPages("/dfs/draftables", params, {
    apiKey: opts.apiKey,
    timeoutMs: 20000,
    maxPages: 3,
  });
  if (!res.ok) return { rows: [], ok: false, status: res.status, error: res.error };
  return {
    rows: /** @type {Array<Record<string, unknown>>} */ (res.data),
    ok: true,
    status: res.status,
    error: null,
  };
}

/** @param {{ season: number, scoringFormat?: string, apiKey?: string }} opts */
export async function fetchNflBdlFantasyScoringFormats(opts = {}) {
  const res = await nflBdlFetch(
    "/fantasy/scoring_formats",
    {
      season: opts.season,
      ...(opts.scoringFormat ? { scoring_format: opts.scoringFormat } : { scoring_format: "ppr" }),
      per_page: 5,
    },
    { apiKey: opts.apiKey, timeoutMs: 20000 },
  );
  const rows = Array.isArray(res.data?.data) ? res.data.data : [];
  return { rows, ok: res.ok, status: res.status, error: res.error };
}

/** @param {{ season: number, week?: number|null, playerIds?: Array<number|string>, scoringFormat?: string, apiKey?: string }} opts */
export async function fetchNflBdlFantasyProjections(opts = {}) {
  const params = {
    season: opts.season,
    scoring_format: opts.scoringFormat || "ppr",
    per_page: 50,
    ...(opts.week != null ? { week: opts.week } : {}),
    ...(opts.playerIds?.length ? { player_ids: opts.playerIds.map(Number).filter(Number.isFinite) } : {}),
  };
  const res = await nflBdlFetchAllPages("/fantasy/projections", params, {
    apiKey: opts.apiKey,
    timeoutMs: 20000,
    maxPages: opts.playerIds?.length ? 2 : 1,
  });
  if (!res.ok) return { rows: [], ok: false, status: res.status, error: res.error };
  return {
    rows: /** @type {Array<Record<string, unknown>>} */ (res.data),
    ok: true,
    status: res.status,
    error: null,
  };
}

/** @param {{ season: number, week: number, playerIds?: Array<number|string>, scoringFormat?: string, apiKey?: string }} opts */
export async function fetchNflBdlFantasyWeeklyStats(opts = {}) {
  const params = {
    season: opts.season,
    week: opts.week,
    scoring_format: opts.scoringFormat || "ppr",
    per_page: 50,
    ...(opts.playerIds?.length ? { player_ids: opts.playerIds.map(Number).filter(Number.isFinite) } : {}),
  };
  const res = await nflBdlFetchAllPages("/fantasy/weekly_stats", params, {
    apiKey: opts.apiKey,
    timeoutMs: 20000,
    maxPages: 1,
  });
  if (!res.ok) return { rows: [], ok: false, status: res.status, error: res.error };
  return {
    rows: /** @type {Array<Record<string, unknown>>} */ (res.data),
    ok: true,
    status: res.status,
    error: null,
  };
}

/** @param {{ season: number, playerIds?: Array<number|string>, rankingType?: string, apiKey?: string }} opts */
export async function fetchNflBdlFantasyRankings(opts = {}) {
  const params = {
    season: opts.season,
    ranking_type: opts.rankingType || "ppr",
    per_page: 50,
    ...(opts.playerIds?.length ? { player_ids: opts.playerIds.map(Number).filter(Number.isFinite) } : {}),
  };
  const res = await nflBdlFetchAllPages("/fantasy/rankings", params, {
    apiKey: opts.apiKey,
    timeoutMs: 20000,
    maxPages: 1,
  });
  if (!res.ok) return { rows: [], ok: false, status: res.status, error: res.error };
  return {
    rows: /** @type {Array<Record<string, unknown>>} */ (res.data),
    ok: true,
    status: res.status,
    error: null,
  };
}

/** @param {{ season: number, playerIds?: Array<number|string>, apiKey?: string }} opts */
export async function fetchNflBdlFantasyAdp(opts = {}) {
  const params = {
    season: opts.season,
    per_page: 50,
    ...(opts.playerIds?.length ? { player_ids: opts.playerIds.map(Number).filter(Number.isFinite) } : {}),
  };
  const res = await nflBdlFetchAllPages("/fantasy/adp", params, {
    apiKey: opts.apiKey,
    timeoutMs: 20000,
    maxPages: 1,
  });
  if (!res.ok) return { rows: [], ok: false, status: res.status, error: res.error };
  return {
    rows: /** @type {Array<Record<string, unknown>>} */ (res.data),
    ok: true,
    status: res.status,
    error: null,
  };
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
 *   hydrateDfs?: boolean,
 *   hydrateFantasy?: boolean,
 *   hydrateRosters?: boolean,
 *   hydrateAllRosters?: boolean,
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

  const season = opts.season != null ? Number(opts.season) : inferNflSeasonYear();
  const week = opts.week != null ? Number(opts.week) : null;
  briefcase.season = season;
  briefcase.week = week;

  /** @type {Record<string, { ok: boolean, status?: number, count?: number, error?: string|null, note?: string }>} */
  const endpoints = {};

  try {
    if (week != null && Number.isFinite(week)) {
      const gamesRes = await fetchNflBdlWeekGames({ season, week, apiKey: getNflBdlApiKey() });
      endpoints.games = {
        ok: gamesRes.ok,
        status: gamesRes.status,
        count: gamesRes.games.length,
        error: gamesRes.error,
      };
      if (gamesRes.games.length) briefcase.slate.games = gamesRes.games;

      const oddsRes = await fetchNflBdlWeekOdds({ season, week, apiKey: getNflBdlApiKey() });
      endpoints.odds = {
        ok: oddsRes.ok,
        status: oddsRes.status,
        count: oddsRes.rows.length,
        error: oddsRes.error,
      };
      if (oddsRes.rows.length) briefcase.slate.odds = oddsRes.rows;

      const openingRes = await fetchNflBdlOpeningOdds({ season, week, apiKey: getNflBdlApiKey() });
      endpoints["odds/opening"] = {
        ok: openingRes.ok,
        status: openingRes.status,
        count: openingRes.rows.length,
        error: openingRes.error,
        note: openingRes.rows.length ? null : "endpoint live — no opening rows yet for this week",
      };
      if (openingRes.rows.length) briefcase.slate.openingOdds = openingRes.rows;

      const gids =
        opts.gameIds?.length > 0
          ? opts.gameIds
          : gamesRes.games.map((g) => g.providerGameId).filter((id) => id != null).slice(0, 16);
      let propCount = 0;
      let propsOk = true;
      for (const gid of gids) {
        const game = gamesRes.games.find((g) => String(g.providerGameId) === String(gid));
        const label = game ? `${game.awayAbbr} @ ${game.homeAbbr}` : "NFL";
        const props = await fetchNflBdlPlayerPropsForGame(gid, { gameLabel: label });
        propCount += props.length;
        if (!props.length) propsOk = false;
        briefcase.slate.playerProps.push(...props);
      }
      endpoints["odds/player_props"] = {
        ok: propsOk || briefcase.slate.playerProps.length > 0,
        count: briefcase.slate.playerProps.length,
        error: briefcase.slate.playerProps.length ? null : "no props returned for sampled games",
        note: `sampled ${gids.length} game(s)`,
      };

      if (gamesRes.games.length) {
        const rosterRes = await fetchNflBdlSlateRosters(gamesRes.games, {
          season,
          apiKey: getNflBdlApiKey(),
        });
        endpoints["teams/{id}/roster"] = {
          ok: rosterRes.ok,
          status: rosterRes.status,
          count: rosterRes.teamCount,
          error: rosterRes.error,
        };
        if (Object.keys(rosterRes.rostersByTeam).length) {
          briefcase.league.rostersByTeam = rosterRes.rostersByTeam;
        }
      }

      /** @type {Array<number|string>} */
      const liveGameIds = gamesRes.games
        .filter((g) => isNflBdlLiveGameStatus(g.statusState, g.status))
        .map((g) => g.providerGameId)
        .filter((id) => id != null)
        .slice(0, 4);
      let playCount = 0;
      for (const gid of liveGameIds) {
        const playsRes = await fetchNflBdlPlaysForGame(gid, { apiKey: getNflBdlApiKey(), maxPages: 3 });
        if (playsRes.rows.length) {
          briefcase.live.playsByGameId[String(gid)] = playsRes.rows;
          playCount += playsRes.rows.length;
        }
      }
      endpoints.plays = {
        ok: true,
        count: playCount,
        note: liveGameIds.length
          ? `live games sampled: ${liveGameIds.length}`
          : "no in-progress games — plays pocket skipped until kickoff",
      };
    } else if (opts.gameIds?.length) {
      for (const gid of opts.gameIds) {
        const props = await fetchNflBdlPlayerPropsForGame(gid);
        briefcase.slate.playerProps.push(...props);
      }
      endpoints["odds/player_props"] = {
        ok: briefcase.slate.playerProps.length > 0,
        count: briefcase.slate.playerProps.length,
      };
    }
  } catch (err) {
    console.warn(
      JSON.stringify({ event: "nfl_goat_slate_failed", error: err?.message || String(err) }),
    );
    endpoints.slate = { ok: false, error: err?.message || String(err) };
  }

  if (opts.hydrateDefense !== false && Number.isFinite(season)) {
    try {
      const def = await fetchNflBdlDefenseMap({ season, useCache: true });
      briefcase.league.teamDefense = def.defenseByTeam || {};
      briefcase.league.defenseSource = def.source || "live";
      endpoints.team_season_stats = {
        ok: Object.keys(briefcase.league.teamDefense).length > 0,
        count: Object.keys(briefcase.league.teamDefense).length,
        note: def.source || null,
      };
    } catch (err) {
      console.warn(
        JSON.stringify({ event: "nfl_goat_defense_failed", error: err?.message || String(err) }),
      );
      endpoints.team_season_stats = { ok: false, error: err?.message || String(err) };
    }
  }

  if (opts.hydrateInjuries !== false) {
    try {
      briefcase.league.injuries = await fetchNflBdlPlayerInjuries();
      endpoints.player_injuries = {
        ok: briefcase.league.injuries.length > 0,
        count: briefcase.league.injuries.length,
      };
    } catch (err) {
      console.warn(
        JSON.stringify({ event: "nfl_goat_injuries_failed", error: err?.message || String(err) }),
      );
      endpoints.player_injuries = { ok: false, error: err?.message || String(err) };
    }
  }

  if (opts.hydrateRosters !== false && Number.isFinite(season)) {
    try {
      const allRosters =
        opts.hydrateAllRosters !== false
          ? await fetchNflBdlAllTeamRosters({
              season,
              apiKey: getNflBdlApiKey(),
              useCache: true,
              forceRefresh: opts.hydrateAllRosters === "refresh",
            })
          : { rostersByTeam: {}, ok: false, teamCount: 0 };
      if (Object.keys(allRosters.rostersByTeam || {}).length) {
        briefcase.league.rostersByTeam = {
          ...(briefcase.league.rostersByTeam || {}),
          ...allRosters.rostersByTeam,
        };
      }
      endpoints["teams/all_rosters"] = {
        ok: allRosters.ok,
        count: allRosters.teamCount,
        source: allRosters.source || null,
        error: allRosters.error,
        note:
          allRosters.teamCount >= 32
            ? "all 32 teams"
            : allRosters.teamCount >= 28
              ? "28+ teams — slate merge may add remainder"
              : "partial — ESPN roster merge fills gaps in Ask",
      };
    } catch (err) {
      endpoints["teams/all_rosters"] = { ok: false, error: err?.message || String(err) };
    }
  }

  if (Number.isFinite(season)) {
    try {
      const standingsRes = await fetchNflBdlStandings({ season, apiKey: getNflBdlApiKey() });
      endpoints.standings = {
        ok: standingsRes.ok,
        status: standingsRes.status,
        count: standingsRes.rows.length,
        error: standingsRes.error,
      };
      if (standingsRes.rows.length) briefcase.league.standings = standingsRes.rows;
    } catch (err) {
      endpoints.standings = { ok: false, error: err?.message || String(err) };
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
        endpoints.season_stats = {
          ok: briefcase.players.seasonStats.length > 0,
          count: briefcase.players.seasonStats.length,
          note: briefcase.players.seasonStats.length
            ? null
            : "endpoint live — no season stat rows yet for sampled players",
        };

        briefcase.players.recentStats = await fetchNflBdlRecentPlayerStats({
          seasons: [season, season - 1],
          playerIds,
        });
        endpoints.stats = {
          ok: briefcase.players.recentStats.length > 0,
          count: briefcase.players.recentStats.length,
        };

        const advanced = await fetchNflBdlAdvancedStats({
          season,
          playerIds,
          apiKey: getNflBdlApiKey(),
          maxPlayers: 8,
        });
        briefcase.players.advanced = {
          passing: advanced.passing,
          rushing: advanced.rushing,
          receiving: advanced.receiving,
        };
        const advancedCount =
          advanced.passing.length + advanced.rushing.length + advanced.receiving.length;
        endpoints["advanced_stats/*"] = {
          ok: advanced.ok,
          status: advanced.status,
          count: advancedCount,
          error: advanced.error,
          note: advancedCount ? null : "endpoint live — advanced rows sparse pre/post sample",
        };
      }
    } catch (err) {
      console.warn(
        JSON.stringify({ event: "nfl_goat_stats_failed", error: err?.message || String(err) }),
      );
      endpoints.stats = { ok: false, error: err?.message || String(err) };
    }
  }

  try {
    const teams = await fetchNflBdlTeams({ apiKey: getNflBdlApiKey() });
    endpoints.teams = { ok: teams.length > 0, count: teams.length };
    if (teams.length) briefcase.league.teams = teams;
  } catch (err) {
    endpoints.teams = { ok: false, error: err?.message || String(err) };
  }

  try {
    const activeRes = await fetchNflBdlActivePlayers({ apiKey: getNflBdlApiKey() });
    endpoints.active_players = {
      ok: activeRes.ok && activeRes.rows.length > 0,
      count: activeRes.rows.length,
      status: activeRes.status,
      error: activeRes.error,
    };
    if (activeRes.rows.length) briefcase.league.activePlayers = activeRes.rows;
  } catch (err) {
    endpoints.active_players = { ok: false, error: err?.message || String(err) };
  }

  if (Number.isFinite(season) && briefcase.slate.games?.length) {
    try {
      const sampleGameIds = briefcase.slate.games
        .map((g) => g.providerGameId)
        .filter(Boolean)
        .slice(0, 4);
      const teamStatsRes = await fetchNflBdlTeamStats({
        season,
        gameIds: sampleGameIds,
        apiKey: getNflBdlApiKey(),
      });
      endpoints.team_stats = {
        ok: teamStatsRes.ok,
        count: teamStatsRes.rows.length,
        status: teamStatsRes.status,
        error: teamStatsRes.error,
        note: `sampled ${sampleGameIds.length} game(s)`,
      };
      if (teamStatsRes.rows.length) briefcase.league.teamStats = teamStatsRes.rows;
    } catch (err) {
      endpoints.team_stats = { ok: false, error: err?.message || String(err) };
    }
  }

  if (opts.hydrateDfs !== false && Number.isFinite(season)) {
    try {
      const dfsRes = await fetchNflBdlDfsSlates({
        season,
        week: week ?? undefined,
        apiKey: getNflBdlApiKey(),
      });
      endpoints["dfs/slates"] = {
        ok: dfsRes.ok,
        count: dfsRes.slates.length,
        status: dfsRes.status,
        error: dfsRes.error,
      };
      if (dfsRes.slates.length) {
        briefcase.dfs.slates = dfsRes.slates;
        const slateId = dfsRes.slates[0]?.id;
        if (slateId != null) {
          const draftRes = await fetchNflBdlDfsDraftables({
            slateId,
            apiKey: getNflBdlApiKey(),
          });
          endpoints["dfs/draftables"] = {
            ok: draftRes.ok,
            count: draftRes.rows.length,
            status: draftRes.status,
            error: draftRes.error,
            note: `slate ${slateId}`,
          };
          if (draftRes.rows.length) briefcase.dfs.draftables = draftRes.rows;
        }
      } else {
        endpoints["dfs/draftables"] = { ok: true, count: 0, note: "no slates for week — draftables skipped" };
      }
    } catch (err) {
      endpoints["dfs/slates"] = { ok: false, error: err?.message || String(err) };
    }
  }

  if (opts.hydrateFantasy !== false && Number.isFinite(season)) {
    try {
      const formats = await fetchNflBdlFantasyScoringFormats({ season, apiKey: getNflBdlApiKey() });
      endpoints["fantasy/scoring_formats"] = {
        ok: formats.ok,
        count: formats.rows.length,
        status: formats.status,
        error: formats.error,
      };
      if (formats.rows.length) briefcase.fantasy.scoringFormats = formats.rows;

      const fromProps = (briefcase.slate.playerProps || [])
        .map((r) => r.playerId)
        .filter((id) => id != null)
        .slice(0, 8);
      const proj = await fetchNflBdlFantasyProjections({
        season,
        week: week ?? undefined,
        playerIds: fromProps,
        apiKey: getNflBdlApiKey(),
      });
      endpoints["fantasy/projections"] = {
        ok: proj.ok,
        count: proj.rows.length,
        status: proj.status,
        error: proj.error,
        note: week != null ? `week ${week}` : "season",
      };
      if (proj.rows.length) briefcase.fantasy.projections = proj.rows;

      if (week != null && Number.isFinite(week) && week > 0) {
        const wk = await fetchNflBdlFantasyWeeklyStats({
          season,
          week,
          playerIds: fromProps,
          apiKey: getNflBdlApiKey(),
        });
        endpoints["fantasy/weekly_stats"] = {
          ok: wk.ok,
          count: wk.rows.length,
          status: wk.status,
          error: wk.error,
        };
        if (wk.rows.length) briefcase.fantasy.weeklyStats = wk.rows;
      } else {
        endpoints["fantasy/weekly_stats"] = { ok: true, count: 0, note: "no week — weekly stats skipped" };
      }

      const ranks = await fetchNflBdlFantasyRankings({
        season,
        playerIds: fromProps,
        apiKey: getNflBdlApiKey(),
      });
      endpoints["fantasy/rankings"] = {
        ok: ranks.ok,
        count: ranks.rows.length,
        status: ranks.status,
        error: ranks.error,
      };
      if (ranks.rows.length) briefcase.fantasy.rankings = ranks.rows;

      const adp = await fetchNflBdlFantasyAdp({
        season,
        playerIds: fromProps,
        apiKey: getNflBdlApiKey(),
      });
      endpoints["fantasy/adp"] = {
        ok: adp.ok,
        count: adp.rows.length,
        status: adp.status,
        error: adp.error,
      };
      if (adp.rows.length) briefcase.fantasy.adp = adp.rows;
    } catch (err) {
      endpoints["fantasy/projections"] = { ok: false, error: err?.message || String(err) };
    }
  }

  const audit = auditNflGoatBriefcaseCoverage(briefcase);
  const propCatalog = auditBriefcasePropCatalogCoverage(briefcase);
  briefcase.coverage = {
    ...briefcase.coverage,
    ...audit,
    propCatalog,
    defenseTeams: Object.keys(briefcase.league.teamDefense || {}).length,
    endpoints,
  };
  return briefcase;
}
