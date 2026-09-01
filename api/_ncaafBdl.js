/**
 * BallDontLie NCAAF GOAT client — college football board + Ask briefcase.
 * OpenAPI: https://www.balldontlie.io/openapi/ncaaf.yml
 */
import {
  bdlSportFetch,
  bdlSportFetchAllPages,
} from "./_bdlSportClient.js";
import {
  normalizeNflBdlOddsRows,
  normalizeNflBdlPlayerPropRows,
  isNflBdlLiveGameStatus,
} from "./_nflBdl.js";
import {
  isNcaafBdlPrimaryEnabled,
  hasNcaafBdlApiKey,
} from "../shared/ncaafBdlPolicy.js";
import { getBdlBoardCached } from "./_bdlBoardCache.js";

const NCAAF_PREFIX = "/ncaaf/v1";
const PREFERRED_VENDORS = ["draftkings", "fanduel", "betmgm", "caesars", "fanatics", "betrivers"];

export { isNcaafBdlPrimaryEnabled, hasNcaafBdlApiKey };

export async function ncaafBdlFetch(path, params = {}, opts = {}) {
  return bdlSportFetch(NCAAF_PREFIX, path, params, opts);
}

export async function ncaafBdlFetchAllPages(path, params = {}, opts = {}) {
  return bdlSportFetchAllPages(NCAAF_PREFIX, path, params, opts);
}

export function normalizeNcaafGames(rows) {
  return (Array.isArray(rows) ? rows : [])
    .map((g) => {
      const homeAbbr = String(g?.home_team?.abbreviation || g?.home_team?.alias || "").toUpperCase();
      const awayAbbr = String(
        g?.visitor_team?.abbreviation ||
          g?.away_team?.abbreviation ||
          g?.visitor_team?.alias ||
          "",
      ).toUpperCase();
      const homeName =
        g?.home_team?.full_name || g?.home_team?.name || g?.home_team?.school || homeAbbr;
      const awayName =
        g?.visitor_team?.full_name ||
          g?.away_team?.full_name ||
          g?.visitor_team?.name ||
          awayAbbr;
      if (!homeAbbr && !homeName) return null;
      return {
        providerGameId: g.id ?? null,
        homeAbbr: homeAbbr || String(homeName).slice(0, 4).toUpperCase(),
        awayAbbr: awayAbbr || String(awayName).slice(0, 4).toUpperCase(),
        homeName,
        awayName,
        week: g.week ?? null,
        season: g.season ?? null,
        status: g.status || null,
        statusState: g.status_state || null,
        startTime: g.date || null,
        homeScore: g.home_team_score ?? g.home_score ?? null,
        awayScore: g.visitor_team_score ?? g.away_team_score ?? g.away_score ?? null,
        conference: g.home_team?.conference || null,
        source: "balldontlie_ncaaf",
      };
    })
    .filter(Boolean);
}

export function normalizeNcaafStandings(rows) {
  return (Array.isArray(rows) ? rows : []).map((row) => ({
    team: String(row?.team?.abbreviation || row?.team?.alias || "").toUpperCase() || null,
    teamName: row?.team?.full_name || row?.team?.name || row?.team?.school || null,
    conference: row?.team?.conference || row?.conference || null,
    wins: row?.wins ?? null,
    losses: row?.losses ?? null,
    rank: row?.rank ?? row?.poll_rank ?? null,
    season: row?.season ?? null,
    source: "balldontlie_ncaaf",
  }));
}

export function normalizeNcaafRankings(rows) {
  return (Array.isArray(rows) ? rows : []).map((row) => ({
    poll: row?.poll || row?.name || "AP",
    rank: row?.rank ?? null,
    team: String(row?.team?.abbreviation || row?.team?.alias || "").toUpperCase() || null,
    teamName: row?.team?.full_name || row?.team?.name || null,
    points: row?.points ?? null,
    season: row?.season ?? null,
    week: row?.week ?? null,
    source: "balldontlie_ncaaf",
  }));
}

export function normalizeNcaafActivePlayers(rows) {
  return (Array.isArray(rows) ? rows : []).map((row) => ({
    player: String(
      row?.full_name ||
        row?.player?.full_name ||
        [row?.first_name, row?.last_name].filter(Boolean).join(" ") ||
        "",
    ).trim(),
    playerId: row?.id ?? row?.player?.id ?? null,
    team: String(
      row?.team?.abbreviation || row?.team?.alias || row?.team?.name || "",
    ).toUpperCase() || null,
    position: row?.position || row?.player?.position || null,
    source: "balldontlie_ncaaf",
  }));
}

export function normalizeNcaafPlayerStatRows(rows) {
  return (Array.isArray(rows) ? rows : []).map((row) => ({
    player: String(
      row?.player?.full_name ||
        [row?.player?.first_name, row?.player?.last_name].filter(Boolean).join(" ") ||
        "",
    ).trim(),
    playerId: row?.player?.id ?? row?.player_id ?? null,
    team: String(row?.team?.abbreviation || row?.team?.alias || "").toUpperCase() || null,
    week: row?.game?.week ?? row?.week ?? null,
    passYds: row?.passing_yards ?? null,
    rushYds: row?.rushing_yards ?? null,
    recYds: row?.receiving_yards ?? null,
    passTd: row?.passing_touchdowns ?? null,
    rushTd: row?.rushing_touchdowns ?? null,
    recTd: row?.receiving_touchdowns ?? null,
    source: "balldontlie_ncaaf_player_stats",
  }));
}

export function normalizeNcaafSeasonStatRows(rows) {
  return (Array.isArray(rows) ? rows : []).map((row) => ({
    player: String(
      row?.player?.full_name ||
        [row?.player?.first_name, row?.player?.last_name].filter(Boolean).join(" ") ||
        "",
    ).trim(),
    playerId: row?.player?.id ?? row?.player_id ?? null,
    team: String(row?.team?.abbreviation || row?.team?.alias || "").toUpperCase() || null,
    position: row?.player?.position || null,
    season: row?.season ?? null,
    passYds: row?.passing_yards ?? null,
    rushYds: row?.rushing_yards ?? null,
    recYds: row?.receiving_yards ?? null,
    source: "balldontlie_ncaaf_season_stats",
  }));
}

export function normalizeNcaafPlayRows(rows) {
  return (Array.isArray(rows) ? rows : []).map((row) => ({
    id: row?.id ?? null,
    gameId: row?.game_id ?? null,
    quarter: row?.quarter ?? row?.period ?? null,
    clock: row?.clock ?? null,
    description: row?.description ?? row?.text ?? null,
    type: row?.type ?? row?.play_type ?? null,
    homeScore: row?.home_score ?? null,
    awayScore: row?.away_score ?? null,
    source: "balldontlie_ncaaf",
  }));
}

export async function fetchNcaafWeekGames(opts) {
  const params = {
    seasons: [opts.season],
    ...(opts.week != null ? { weeks: [opts.week] } : {}),
    ...(opts.startDate ? { start_date: opts.startDate } : {}),
    ...(opts.endDate ? { end_date: opts.endDate } : {}),
  };
  const res = await ncaafBdlFetchAllPages("/games", params, {
    apiKey: opts.apiKey,
    timeoutMs: 20000,
    maxPages: 4,
  });
  if (!res.ok) return { games: [], ok: false, status: res.status, error: res.error };
  let games = normalizeNcaafGames(/** @type {Array<Record<string, unknown>>} */ (res.data));
  if (opts.week != null) games = games.filter((g) => Number(g.week) === Number(opts.week));
  if (opts.season != null) games = games.filter((g) => !g.season || Number(g.season) === Number(opts.season));
  return {
    games,
    ok: true,
    status: res.status,
    error: null,
  };
}

export async function fetchNcaafWeekOdds(opts) {
  const res = await ncaafBdlFetch(
    "/odds",
    { season: opts.season, week: opts.week },
    { apiKey: opts.apiKey, timeoutMs: 20000 },
  );
  if (!res.ok || !Array.isArray(res.data?.data)) {
    return { rows: [], ok: false, status: res.status, error: res.error };
  }
  return {
    rows: normalizeNflBdlOddsRows(res.data.data, { preferVendor: true }),
    ok: true,
    status: res.status,
    error: null,
  };
}

export async function fetchNcaafOpeningOdds(opts) {
  const res = await ncaafBdlFetch(
    "/odds/opening",
    { season: opts.season, week: opts.week },
    { apiKey: opts.apiKey, timeoutMs: 20000 },
  );
  if (!res.ok || !Array.isArray(res.data?.data)) {
    return { rows: [], ok: false, status: res.status, error: res.error };
  }
  return {
    rows: normalizeNflBdlOddsRows(res.data.data, { opening: true, preferVendor: true }),
    ok: true,
    status: res.status,
    error: null,
  };
}

export async function fetchNcaafPlayerPropsForGame(gameId, opts = {}) {
  const gid = Number(gameId);
  if (!Number.isFinite(gid)) return [];
  const res = await ncaafBdlFetch(
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

export async function fetchNcaafStandings(opts) {
  const res = await ncaafBdlFetch("/standings", { season: opts.season }, { apiKey: opts.apiKey });
  if (!res.ok || !Array.isArray(res.data?.data)) {
    return { rows: [], ok: false, status: res.status, error: res.error };
  }
  return { rows: normalizeNcaafStandings(res.data.data), ok: true, status: res.status, error: null };
}

export async function fetchNcaafRankings(opts) {
  const res = await ncaafBdlFetch(
    "/rankings",
    { season: opts.season, ...(opts.week != null ? { week: opts.week } : {}) },
    { apiKey: opts.apiKey },
  );
  if (!res.ok || !Array.isArray(res.data?.data)) {
    return { rows: [], ok: false, status: res.status, error: res.error };
  }
  return { rows: normalizeNcaafRankings(res.data.data), ok: true, status: res.status, error: null };
}

export async function fetchNcaafActivePlayers(opts = {}) {
  const res = await ncaafBdlFetchAllPages("/players/active", {}, { apiKey: opts.apiKey, maxPages: 6 });
  if (!res.ok) return [];
  return normalizeNcaafActivePlayers(/** @type {Array<Record<string, unknown>>} */ (res.data));
}

export async function fetchNcaafPlayerStats(opts) {
  if (!opts.playerIds?.length) return [];
  const res = await ncaafBdlFetchAllPages(
    "/player_stats",
    {
      player_ids: opts.playerIds,
      ...(opts.season ? { season: opts.season } : {}),
    },
    { apiKey: opts.apiKey, maxPages: 4 },
  );
  if (!res.ok) return [];
  return normalizeNcaafPlayerStatRows(/** @type {Array<Record<string, unknown>>} */ (res.data));
}

export async function fetchNcaafPlayerSeasonStats(opts) {
  if (!opts.playerIds?.length) return [];
  const res = await ncaafBdlFetchAllPages(
    "/player_season_stats",
    { season: opts.season, player_ids: opts.playerIds },
    { apiKey: opts.apiKey, maxPages: 4 },
  );
  if (!res.ok) return [];
  return normalizeNcaafSeasonStatRows(/** @type {Array<Record<string, unknown>>} */ (res.data));
}

export async function fetchNcaafPlaysForGame(gameId, opts = {}) {
  const gid = Number(gameId);
  if (!Number.isFinite(gid)) return { rows: [], ok: false, error: "missing_game_id" };
  const res = await ncaafBdlFetchAllPages(
    "/plays",
    { game_id: gid },
    { apiKey: opts.apiKey, maxPages: Math.min(Number(opts.maxPages) || 4, 8) },
  );
  if (!res.ok) return { rows: [], ok: false, status: res.status, error: res.error };
  return {
    rows: normalizeNcaafPlayRows(/** @type {Array<Record<string, unknown>>} */ (res.data)),
    ok: true,
    status: res.status,
    error: null,
  };
}

export function createEmptyNcaafBriefcase(meta = {}) {
  return {
    version: 1,
    asOf: meta.asOf || null,
    week: meta.week ?? null,
    season: meta.season ?? null,
    primarySource: meta.primarySource || "pending",
    slate: { games: [], odds: [], playerProps: [], openingOdds: [] },
    league: { standings: [], rankings: [], rostersByTeam: {}, activePlayers: [] },
    players: { recentStats: [], seasonStats: [] },
    live: { playsByGameId: {} },
    coverage: { endpoints: {}, fields: {} },
  };
}

function inferDefaultNcaafSeason() {
  const now = new Date();
  const y = now.getUTCFullYear();
  const m = now.getUTCMonth() + 1;
  return m >= 3 ? y : y - 1;
}

function inferDefaultNcaafWeek() {
  // Late Aug–early Sep ≈ Week 1; caller can override.
  return 1;
}

/**
 * Hydrate NCAAF GOAT briefcase when NCAAF_BDL_PRIMARY=1.
 * @param {{ week?: number|null, season?: number|null, gameIds?: Array<number|string>, playerIds?: Array<number|string> }} [opts]
 */
export async function buildNcaafGoatBriefcase(opts = {}) {
  const briefcase = createEmptyNcaafBriefcase({
    week: opts.week ?? null,
    season: opts.season ?? null,
    asOf: new Date().toISOString(),
    primarySource: isNcaafBdlPrimaryEnabled() ? "balldontlie_ncaaf" : "pending",
  });

  if (!isNcaafBdlPrimaryEnabled() || !hasNcaafBdlApiKey()) {
    briefcase.coverage.note = "NCAAF BDL primary off or key missing";
    return briefcase;
  }

  const season = opts.season != null ? Number(opts.season) : inferDefaultNcaafSeason();
  const week = opts.week != null ? Number(opts.week) : inferDefaultNcaafWeek();
  briefcase.season = season;
  briefcase.week = week;

  /** @type {Record<string, { ok?: boolean, count?: number, status?: number, error?: string|null, note?: string }>} */
  const endpoints = {};

  const gamesRes = await fetchNcaafWeekGames({ season, week });
  endpoints.games = { ok: gamesRes.ok, count: gamesRes.games.length, status: gamesRes.status, error: gamesRes.error };
  if (gamesRes.games.length) briefcase.slate.games = gamesRes.games;

  const oddsRes = await fetchNcaafWeekOdds({ season, week });
  endpoints.odds = { ok: oddsRes.ok, count: oddsRes.rows.length, status: oddsRes.status, error: oddsRes.error };
  if (oddsRes.rows.length) briefcase.slate.odds = oddsRes.rows;

  const openingRes = await fetchNcaafOpeningOdds({ season, week });
  endpoints["odds/opening"] = {
    ok: openingRes.ok,
    count: openingRes.rows.length,
    note: openingRes.rows.length ? null : "endpoint live — opening rows may be empty early week",
  };
  if (openingRes.rows.length) briefcase.slate.openingOdds = openingRes.rows;

  const gids =
    opts.gameIds?.length > 0
      ? opts.gameIds
      : gamesRes.games.map((g) => g.providerGameId).filter(Boolean).slice(0, 12);
  for (const gid of gids) {
    const game = gamesRes.games.find((g) => String(g.providerGameId) === String(gid));
    const label = game ? `${game.awayAbbr} @ ${game.homeAbbr}` : "NCAAF";
    const props = await fetchNcaafPlayerPropsForGame(gid, { gameLabel: label });
    briefcase.slate.playerProps.push(...props);
  }
  endpoints["odds/player_props"] = {
    ok: briefcase.slate.playerProps.length > 0,
    count: briefcase.slate.playerProps.length,
    note: `sampled ${gids.length} game(s)`,
  };

  const standingsRes = await fetchNcaafStandings({ season });
  endpoints.standings = { ok: standingsRes.ok, count: standingsRes.rows.length };
  if (standingsRes.rows.length) briefcase.league.standings = standingsRes.rows;

  const rankingsRes = await fetchNcaafRankings({ season, week });
  endpoints.rankings = { ok: rankingsRes.ok, count: rankingsRes.rows.length };
  if (rankingsRes.rows.length) briefcase.league.rankings = rankingsRes.rows;

  const activePlayers = await fetchNcaafActivePlayers();
  endpoints["players/active"] = { ok: activePlayers.length > 0, count: activePlayers.length };
  if (activePlayers.length) {
    briefcase.league.activePlayers = activePlayers;
    /** @type {Record<string, Array<Record<string, unknown>>>} */
    const byTeam = {};
    for (const p of activePlayers) {
      const t = String(p.team || "").toUpperCase();
      if (!t) continue;
      if (!byTeam[t]) byTeam[t] = [];
      byTeam[t].push({ role: p.position, name: p.player, playerId: p.playerId });
    }
    briefcase.league.rostersByTeam = byTeam;
  }

  const fromProps = briefcase.slate.playerProps.map((r) => r.playerId).filter(Boolean);
  const playerIds = [...new Set([...(opts.playerIds || []), ...fromProps].map(String))].slice(0, 30);
  if (playerIds.length) {
    briefcase.players.recentStats = await fetchNcaafPlayerStats({ season, playerIds });
    briefcase.players.seasonStats = await fetchNcaafPlayerSeasonStats({ season, playerIds });
    endpoints.player_stats = { ok: briefcase.players.recentStats.length > 0, count: briefcase.players.recentStats.length };
    endpoints.player_season_stats = {
      ok: briefcase.players.seasonStats.length > 0,
      count: briefcase.players.seasonStats.length,
    };
  }

  const liveIds = gamesRes.games
    .filter((g) => isNflBdlLiveGameStatus(g.statusState, g.status))
    .map((g) => g.providerGameId)
    .filter(Boolean)
    .slice(0, 3);
  let playCount = 0;
  for (const gid of liveIds) {
    const playsRes = await fetchNcaafPlaysForGame(gid, { maxPages: 3 });
    if (playsRes.rows.length) {
      briefcase.live.playsByGameId[String(gid)] = playsRes.rows;
      playCount += playsRes.rows.length;
    }
  }
  endpoints.plays = {
    ok: true,
    count: playCount,
    note: liveIds.length ? `live games: ${liveIds.length}` : "no in-progress games yet",
  };

  briefcase.coverage.endpoints = endpoints;
  return briefcase;
}

/**
 * @param {{ week?: number|null, season?: number|null, includeProps?: boolean, maxPropGames?: number }} [opts]
 */
export async function buildNcaafLiveBoard(opts = {}) {
  const season = opts.season != null ? Number(opts.season) : inferDefaultNcaafSeason();
  const week = opts.week != null ? Number(opts.week) : inferDefaultNcaafWeek();
  const includeProps = opts.includeProps !== false;
  const cacheKey = `ncaaf_board_${season}_w${week}_p${includeProps ? 1 : 0}`;

  return getBdlBoardCached(cacheKey, () =>
    buildNcaafLiveBoardFresh({ ...opts, season, week, includeProps }),
  );
}

async function buildNcaafLiveBoardFresh(opts = {}) {
  const season = opts.season != null ? Number(opts.season) : inferDefaultNcaafSeason();
  const week = opts.week != null ? Number(opts.week) : inferDefaultNcaafWeek();
  const asOf = new Date().toISOString();

  if (!hasNcaafBdlApiKey()) {
    return { ok: false, source: "none", season, week, asOf, games: [], propLines: [], error: "missing_bdl_key" };
  }

  const gamesRes = await fetchNcaafWeekGames({ season, week });
  const oddsRes = await fetchNcaafWeekOdds({ season, week });
  /** @type {Array<Record<string, unknown>>} */
  const propLines = [];
  if (opts.includeProps !== false && isNcaafBdlPrimaryEnabled()) {
    const max = Math.max(1, Math.min(Number(opts.maxPropGames) || 6, 12));
    for (const g of gamesRes.games.slice(0, max)) {
      const props = await fetchNcaafPlayerPropsForGame(g.providerGameId, {
        gameLabel: `${g.awayAbbr} @ ${g.homeAbbr}`,
      });
      propLines.push(...props);
    }
  }

  const oddsByGame = new Map(
    oddsRes.rows.filter((r) => r.game_id != null).map((r) => [String(r.game_id), r]),
  );
  const games = gamesRes.games.map((g) => {
    const o = oddsByGame.get(String(g.providerGameId));
    return {
      ...g,
      spread: o?.spread || null,
      total: o?.total || null,
      moneyline: o?.moneyline || null,
      book: o?.book || null,
    };
  });

  return {
    ok: gamesRes.ok,
    source: isNcaafBdlPrimaryEnabled() ? "balldontlie_ncaaf" : "balldontlie_ncaaf_free",
    season,
    week,
    asOf,
    games,
    propLines,
    odds: oddsRes.rows,
    primary: isNcaafBdlPrimaryEnabled(),
  };
}
