/**
 * BallDontLie La Liga GOAT client — matches, odds, props, lineups, analytics.
 * OpenAPI: https://www.balldontlie.io/openapi/laliga.yml
 */
import { bdlSportFetch, bdlSportFetchAllPages } from "./_bdlSportClient.js";
import {
  isLaligaBdlPrimaryEnabled,
  hasLaligaBdlApiKey,
} from "../shared/laligaBdlPolicy.js";
import { getBdlBoardCached } from "./_bdlBoardCache.js";
import { inferLaligaSeasonStartYear } from "../shared/bdlSeasonDefaults.js";

const LALIGA_PREFIX = "/laliga/v1";
const PREFERRED_VENDORS = ["draftkings", "fanduel", "betmgm", "caesars", "fanatics", "betrivers"];
const LALIGA_EXPLODE_KEYS = ["dates", "team_ids", "match_ids"];
const laligaFetchOpts = { explodeArrayKeys: LALIGA_EXPLODE_KEYS };

export { isLaligaBdlPrimaryEnabled, hasLaligaBdlApiKey };

export async function laligaBdlFetch(path, params = {}, opts = {}) {
  return bdlSportFetch(LALIGA_PREFIX, path, params, { ...laligaFetchOpts, ...opts });
}

export async function laligaBdlFetchAllPages(path, params = {}, opts = {}) {
  return bdlSportFetchAllPages(LALIGA_PREFIX, path, params, { ...laligaFetchOpts, ...opts });
}

function parseLaligaShortName(shortName) {
  const s = String(shortName || "").trim();
  const m = s.match(/^(.+?)\s+@\s+(.+)$/);
  if (!m) return { awayAbbr: "", homeAbbr: "" };
  return { awayAbbr: m[1].trim(), homeAbbr: m[2].trim() };
}

function parseLaligaLongName(name) {
  const s = String(name || "").trim();
  const m = s.match(/^(.+?)\s+at\s+(.+)$/i);
  if (!m) return { awayName: "", homeName: "" };
  return { awayName: m[1].trim(), homeName: m[2].trim() };
}

export function normalizeLaligaMatches(rows) {
  return (Array.isArray(rows) ? rows : [])
    .map((m) => {
      const fromShort = parseLaligaShortName(m?.short_name);
      const fromLong = parseLaligaLongName(m?.name);
      const homeAbbr = String(
        m?.home_team?.abbreviation || m?.home_team?.short_name || fromShort.homeAbbr || "",
      ).toUpperCase();
      const awayAbbr = String(
        m?.away_team?.abbreviation || m?.away_team?.short_name || fromShort.awayAbbr || "",
      ).toUpperCase();
      const homeName = m?.home_team?.name || m?.home_team?.full_name || fromLong.homeName || m?.name || homeAbbr;
      const awayName = m?.away_team?.name || m?.away_team?.full_name || fromLong.awayName || awayAbbr;
      if (!homeName && !awayName && !m?.name && !m?.short_name) return null;
      return {
        providerMatchId: m.id ?? null,
        homeAbbr: homeAbbr || String(homeName).slice(0, 3).toUpperCase(),
        awayAbbr: awayAbbr || String(awayName).slice(0, 3).toUpperCase(),
        homeName: typeof homeName === "string" ? homeName : String(homeName || ""),
        awayName: typeof awayName === "string" ? awayName : String(awayName || ""),
        season: m.season ?? null,
        status: m.status || null,
        statusState: m.status_state || null,
        startTime: m.start_time || m.date || null,
        homeScore: m.home_score ?? null,
        awayScore: m.away_score ?? null,
        round: m.round_number ?? null,
        venue: m.venue_name || null,
        source: "balldontlie_laliga",
      };
    })
    .filter(Boolean);
}

export function normalizeLaligaOddsRows(rows) {
  return (Array.isArray(rows) ? rows : []).map((row) => {
    const vendor = String(row.vendor || "").toLowerCase();
    return {
      match_id: row.match_id ?? row.game_id ?? null,
      vendor,
      book: vendor || "unknown",
      moneyline: {
        home: row.home_odds ?? row.moneyline_home_odds ?? null,
        draw: row.draw_odds ?? row.moneyline_draw_odds ?? null,
        away: row.away_odds ?? row.moneyline_away_odds ?? null,
      },
      openedAt: row.opened_at ?? null,
      updatedAt: row.updated_at ?? null,
      source: "balldontlie_laliga",
    };
  });
}

export function normalizeLaligaPlayerPropRows(rows, ctx = {}) {
  const allowed = new Set(PREFERRED_VENDORS);
  /** @type {Array<Record<string, unknown>>} */
  const out = [];
  for (const row of rows || []) {
    const vendor = String(row.vendor || "").toLowerCase();
    if (vendor && !allowed.has(vendor)) continue;
    const player = String(
      row.player?.full_name ||
        row.player?.name ||
        [row.player?.first_name, row.player?.last_name].filter(Boolean).join(" ") ||
        "",
    ).trim();
    const propRaw = String(row.prop_type || "prop").trim();
    const prop = propRaw.replace(/_/g, " ");
    const market = row.market && typeof row.market === "object" ? row.market : {};
    const lineVal = row.line_value != null ? Number.parseFloat(String(row.line_value)) : NaN;
    const eventId = ctx.eventId ?? row.match_id ?? row.game_id ?? null;
    const game = ctx.gameLabel || "La Liga";
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
        source: "balldontlie_laliga",
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
        source: "balldontlie_laliga",
        marketType: "milestone",
      });
    }
  }
  return out;
}

export function normalizeLaligaStandings(rows) {
  return (Array.isArray(rows) ? rows : []).map((row) => ({
    team: String(row?.team?.abbreviation || row?.team?.short_name || "").toUpperCase() || null,
    teamName: row?.team?.name || row?.team?.full_name || null,
    position: row?.rank ?? row?.position ?? null,
    played: row?.played ?? row?.games_played ?? null,
    wins: row?.wins ?? null,
    draws: row?.draws ?? null,
    losses: row?.losses ?? null,
    points: row?.points ?? null,
    goalDiff: row?.goal_difference ?? row?.goals_diff ?? null,
    season: row?.season ?? null,
    source: "balldontlie_laliga",
  }));
}

export function normalizeLaligaInjuries(rows) {
  return (Array.isArray(rows) ? rows : []).map((row) => ({
    player: String(
      row?.player?.full_name ||
        row?.player?.name ||
        [row?.player?.first_name, row?.player?.last_name].filter(Boolean).join(" ") ||
        "",
    ).trim(),
    playerId: row?.player?.id ?? row?.player_id ?? null,
    team: String(row?.team?.abbreviation || row?.team?.short_name || "").toUpperCase() || null,
    status: row?.status || row?.injury_status || null,
    comment: row?.comment || row?.description || null,
    source: "balldontlie_laliga",
  }));
}

export function normalizeLaligaRosterRows(rows, teamAbbr) {
  return (Array.isArray(rows) ? rows : []).map((row) => ({
    role: row?.position || row?.player?.position || null,
    name: String(
      row?.player?.full_name ||
        row?.player?.name ||
        [row?.player?.first_name, row?.player?.last_name].filter(Boolean).join(" ") ||
        "",
    ).trim(),
    playerId: row?.player?.id ?? row?.player_id ?? null,
    jersey: row?.player?.jersey_number ?? null,
    team: String(teamAbbr || "").toUpperCase() || null,
    source: "balldontlie_laliga",
  }));
}

export function isLaligaLiveMatch(statusState, status) {
  const state = String(statusState || "").toLowerCase();
  if (state === "in_progress" || state === "delayed" || state === "suspended") return true;
  const s = String(status || "").toLowerCase();
  return /\b(live|in progress|1st half|2nd half|halftime|extra time)\b/.test(s);
}
function dateWindow(days = 10) {
  const out = [];
  const base = new Date();
  for (let i = -1; i < days; i++) {
    const d = new Date(base);
    d.setUTCDate(d.getUTCDate() + i);
    out.push(d.toISOString().slice(0, 10));
  }
  return out;
}

export async function fetchLaligaMatches(opts = {}) {
  const params = {
    ...(opts.season != null ? { season: opts.season } : {}),
    ...(opts.dates?.length ? { dates: opts.dates } : {}),
    ...(opts.teamIds?.length ? { team_ids: opts.teamIds } : {}),
    ...(opts.matchIds?.length ? { match_ids: opts.matchIds } : {}),
  };
  const res = await laligaBdlFetchAllPages("/matches", params, {
    apiKey: opts.apiKey,
    timeoutMs: 20000,
    maxPages: 4,
  });
  if (!res.ok) return { matches: [], ok: false, status: res.status, error: res.error };
  return {
    matches: normalizeLaligaMatches(/** @type {Array<Record<string, unknown>>} */ (res.data)),
    ok: true,
    status: res.status,
    error: null,
  };
}

export async function fetchLaligaOdds(opts = {}) {
  const params = {
    ...(opts.matchIds?.length ? { match_ids: opts.matchIds } : {}),
    ...(opts.dates?.length ? { dates: opts.dates } : {}),
  };
  const res = await laligaBdlFetchAllPages("/odds", params, { apiKey: opts.apiKey, maxPages: 4 });
  if (!res.ok) return { rows: [], ok: false, status: res.status, error: res.error };
  const raw = /** @type {Array<Record<string, unknown>>} */ (res.data);
  return { rows: normalizeLaligaOddsRows(raw), ok: true, status: res.status, error: null };
}

export async function fetchLaligaOpeningOdds(opts = {}) {
  const res = await laligaBdlFetchAllPages(
    "/odds/opening",
    {
      ...(opts.matchIds?.length ? { match_ids: opts.matchIds } : {}),
      ...(opts.dates?.length ? { dates: opts.dates } : {}),
    },
    { apiKey: opts.apiKey, maxPages: 4 },
  );
  const raw = Array.isArray(res.data) ? res.data : res.data?.data || [];
  return {
    rows: normalizeLaligaOddsRows(raw),
    ok: res.ok,
    status: res.status,
    error: res.error,
  };
}

export async function fetchLaligaPlayerPropsForMatch(matchId, opts = {}) {
  const mid = Number(matchId);
  if (!Number.isFinite(mid)) return [];
  const res = await laligaBdlFetch(
    "/odds/player_props",
    { match_id: mid },
    { apiKey: opts.apiKey, timeoutMs: 20000 },
  );
  if (!res.ok || !Array.isArray(res.data?.data)) return [];
  return normalizeLaligaPlayerPropRows(res.data.data, {
    gameLabel: opts.gameLabel,
    eventId: mid,
  });
}

export async function fetchLaligaStandings(opts) {
  const res = await laligaBdlFetch("/standings", { season: opts.season }, { apiKey: opts.apiKey });
  if (!res.ok || !Array.isArray(res.data?.data)) {
    return { rows: [], ok: false, status: res.status, error: res.error };
  }
  return { rows: normalizeLaligaStandings(res.data.data), ok: true, status: res.status, error: null };
}

export async function fetchLaligaInjuries(opts = {}) {
  const res = await laligaBdlFetchAllPages("/player_injuries", {}, { apiKey: opts.apiKey, maxPages: 6 });
  if (!res.ok) return [];
  return normalizeLaligaInjuries(/** @type {Array<Record<string, unknown>>} */ (res.data));
}

export async function fetchLaligaTeams(opts = {}) {
  const res = await laligaBdlFetchAllPages("/teams", {}, { apiKey: opts.apiKey, maxPages: 2 });
  if (!res.ok) return [];
  return /** @type {Array<Record<string, unknown>>} */ (res.data);
}

export async function fetchLaligaRosters(opts = {}) {
  const res = await laligaBdlFetchAllPages(
    "/rosters",
    { ...(opts.season != null ? { season: opts.season } : {}) },
    { apiKey: opts.apiKey, maxPages: 4 },
  );
  if (!res.ok) return { rostersByTeam: {}, ok: false };
  /** @type {Record<string, Array<Record<string, unknown>>>} */
  const rostersByTeam = {};
  for (const row of /** @type {Array<Record<string, unknown>>} */ (res.data)) {
    const abbr = String(
      row?.team?.abbreviation || row?.team?.short_name || row?.team_abbreviation || "",
    ).toUpperCase();
    if (!abbr) continue;
    if (!rostersByTeam[abbr]) rostersByTeam[abbr] = [];
    rostersByTeam[abbr].push(
      ...normalizeLaligaRosterRows(Array.isArray(row?.players) ? row.players : [row], abbr),
    );
  }
  return { rostersByTeam, ok: Object.keys(rostersByTeam).length > 0 };
}

export async function fetchLaligaMatchEvents(matchIds, opts = {}) {
  if (!matchIds?.length) return [];
  const res = await laligaBdlFetchAllPages(
    "/match_events",
    { match_ids: matchIds.slice(0, 8) },
    { apiKey: opts.apiKey, maxPages: 4 },
  );
  if (!res.ok) return [];
  return /** @type {Array<Record<string, unknown>>} */ (res.data);
}

export async function fetchLaligaMatchLineups(matchIds, opts = {}) {
  if (!matchIds?.length) return [];
  const res = await laligaBdlFetchAllPages(
    "/match_lineups",
    { match_ids: matchIds.slice(0, 8) },
    { apiKey: opts.apiKey, maxPages: 4 },
  );
  if (!res.ok) return [];
  return /** @type {Array<Record<string, unknown>>} */ (res.data);
}

export async function fetchLaligaPlayerMatchStats(matchIds, opts = {}) {
  if (!matchIds?.length) return [];
  const res = await laligaBdlFetchAllPages(
    "/player_match_stats",
    { match_ids: matchIds.slice(0, 6) },
    { apiKey: opts.apiKey, maxPages: 4 },
  );
  if (!res.ok) return [];
  return /** @type {Array<Record<string, unknown>>} */ (res.data);
}

export function createEmptyLaligaBriefcase(meta = {}) {
  return {
    version: 1,
    asOf: meta.asOf || null,
    season: meta.season ?? null,
    primarySource: meta.primarySource || "pending",
    slate: { matches: [], odds: [], playerProps: [], openingOdds: [] },
    league: { standings: [], injuries: [], rostersByTeam: {} },
    live: { eventsByMatchId: {}, lineupsByMatchId: {} },
    analytics: { playerMatchStats: [], pregameForms: [] },
    coverage: { endpoints: {} },
  };
}

/**
 * @param {{ season?: number|null, dates?: string[], matchIds?: Array<number|string>, playerIds?: Array<number|string> }} [opts]
 */
export async function buildLaligaGoatBriefcase(opts = {}) {
  const briefcase = createEmptyLaligaBriefcase({
    season: opts.season ?? null,
    asOf: new Date().toISOString(),
    primarySource: isLaligaBdlPrimaryEnabled() ? "balldontlie_laliga" : "pending",
  });

  if (!isLaligaBdlPrimaryEnabled() || !hasLaligaBdlApiKey()) {
    briefcase.coverage.note = "La Liga BDL primary off or key missing";
    return briefcase;
  }

  const season = opts.season != null ? Number(opts.season) : inferLaligaSeasonStartYear();
  const dates = opts.dates?.length ? opts.dates : dateWindow(12);
  briefcase.season = season;

  /** @type {Record<string, { ok?: boolean, count?: number, note?: string, error?: string|null }>} */
  const endpoints = {};

  const matchesRes = await fetchLaligaMatches({ season, dates });
  endpoints.matches = { ok: matchesRes.ok, count: matchesRes.matches.length, error: matchesRes.error };
  if (matchesRes.matches.length) briefcase.slate.matches = matchesRes.matches;

  const matchIds =
    opts.matchIds?.length > 0
      ? opts.matchIds
      : matchesRes.matches.map((m) => m.providerMatchId).filter(Boolean).slice(0, 12);

  const oddsRes = await fetchLaligaOdds({ matchIds, dates });
  endpoints.odds = { ok: oddsRes.ok, count: oddsRes.rows.length };
  if (oddsRes.rows.length) briefcase.slate.odds = oddsRes.rows;

  const openingRes = await fetchLaligaOpeningOdds({ matchIds, dates });
  endpoints["odds/opening"] = { ok: openingRes.ok, count: openingRes.rows.length };
  if (openingRes.rows.length) briefcase.slate.openingOdds = openingRes.rows;

  for (const mid of matchIds.slice(0, 8)) {
    const match = matchesRes.matches.find((m) => String(m.providerMatchId) === String(mid));
    const label = match ? `${match.awayAbbr} @ ${match.homeAbbr}` : "La Liga";
    const props = await fetchLaligaPlayerPropsForMatch(mid, { gameLabel: label });
    briefcase.slate.playerProps.push(...props);
  }
  endpoints["odds/player_props"] = {
    ok: briefcase.slate.playerProps.length > 0,
    count: briefcase.slate.playerProps.length,
    note: `sampled ${Math.min(matchIds.length, 8)} match(es)`,
  };

  const standingsRes = await fetchLaligaStandings({ season });
  endpoints.standings = { ok: standingsRes.ok, count: standingsRes.rows.length };
  if (standingsRes.rows.length) briefcase.league.standings = standingsRes.rows;

  const injuries = await fetchLaligaInjuries();
  endpoints.player_injuries = { ok: injuries.length > 0, count: injuries.length };
  if (injuries.length) briefcase.league.injuries = injuries;

  const rosterRes = await fetchLaligaRosters({ season });
  endpoints.rosters = { ok: rosterRes.ok, count: Object.keys(rosterRes.rostersByTeam).length };
  if (Object.keys(rosterRes.rostersByTeam).length) {
    briefcase.league.rostersByTeam = rosterRes.rostersByTeam;
  }

  const liveIds = matchesRes.matches
    .filter((m) => isLaligaLiveMatch(m.statusState, m.status))
    .map((m) => m.providerMatchId)
    .filter(Boolean)
    .slice(0, 4);
  const sampleIds = liveIds.length ? liveIds : matchIds.slice(0, 4);

  const events = await fetchLaligaMatchEvents(sampleIds);
  endpoints.match_events = { ok: events.length >= 0, count: events.length };
  for (const ev of events) {
    const mid = String(ev.match_id ?? "");
    if (!mid) continue;
    if (!briefcase.live.eventsByMatchId[mid]) briefcase.live.eventsByMatchId[mid] = [];
    briefcase.live.eventsByMatchId[mid].push(ev);
  }

  const lineups = await fetchLaligaMatchLineups(sampleIds);
  endpoints.match_lineups = { ok: lineups.length >= 0, count: lineups.length };
  for (const lu of lineups) {
    const mid = String(lu.match_id ?? "");
    if (mid) briefcase.live.lineupsByMatchId[mid] = lu;
  }

  const pms = await fetchLaligaPlayerMatchStats(sampleIds);
  endpoints.player_match_stats = { ok: pms.length >= 0, count: pms.length };
  if (pms.length) briefcase.analytics.playerMatchStats = pms;

  briefcase.coverage.endpoints = endpoints;
  return briefcase;
}

/**
 * @param {{ season?: number|null, dates?: string[], includeProps?: boolean, maxPropMatches?: number }} [opts]
 */
export async function buildLaligaLiveBoard(opts = {}) {
  const season = opts.season != null ? Number(opts.season) : inferLaligaSeasonStartYear();
  const includeProps = opts.includeProps !== false;
  const datesKey = opts.dates?.length ? opts.dates.join("_") : "auto";
  const cacheKey = `laliga_board_${season}_${datesKey}_p${includeProps ? 1 : 0}`;

  return getBdlBoardCached(cacheKey, () =>
    buildLaligaLiveBoardFresh({ ...opts, season, includeProps }),
  );
}

async function buildLaligaLiveBoardFresh(opts = {}) {
  const season = opts.season != null ? Number(opts.season) : inferLaligaSeasonStartYear();
  const dates = opts.dates?.length ? opts.dates : dateWindow(10);
  const asOf = new Date().toISOString();

  if (!hasLaligaBdlApiKey()) {
    return {
      ok: false,
      source: "none",
      season,
      asOf,
      matches: [],
      propLines: [],
      standings: [],
      error: "missing_bdl_key",
    };
  }

  const matchesRes = await fetchLaligaMatches({ season, dates });
  let matches = matchesRes.matches;
  const oddsRes = await fetchLaligaOdds({
    matchIds: matches.map((m) => m.providerMatchId).filter(Boolean),
    dates,
  });
  if (!matches.length && oddsRes.rows.length) {
    const ids = [...new Set(oddsRes.rows.map((r) => r.match_id).filter(Boolean))].slice(0, 24);
    if (ids.length) {
      const byOdds = await fetchLaligaMatches({ matchIds: ids, season });
      if (byOdds.matches.length) matches = byOdds.matches;
    }
  }
  const standingsRes = await fetchLaligaStandings({ season });

  /** @type {Array<Record<string, unknown>>} */
  const propLines = [];
  if (opts.includeProps !== false && isLaligaBdlPrimaryEnabled()) {
    const max = Math.max(1, Math.min(Number(opts.maxPropMatches) || 6, 10));
    for (const m of matches.slice(0, max)) {
      const props = await fetchLaligaPlayerPropsForMatch(m.providerMatchId, {
        gameLabel: `${m.awayAbbr} @ ${m.homeAbbr}`,
      });
      propLines.push(...props);
    }
  }

  const oddsByMatch = new Map(
    oddsRes.rows.filter((r) => r.match_id != null).map((r) => [String(r.match_id), r]),
  );
  const matchesWithOdds = matches.map((m) => ({
    ...m,
    moneyline: oddsByMatch.get(String(m.providerMatchId))?.moneyline || null,
    book: oddsByMatch.get(String(m.providerMatchId))?.book || null,
  }));

  return {
    ok: matchesRes.ok || oddsRes.ok,
    source: isLaligaBdlPrimaryEnabled() ? "balldontlie_laliga" : "balldontlie_laliga_free",
    season,
    asOf,
    matches: matchesWithOdds,
    propLines,
    odds: oddsRes.rows,
    standings: standingsRes.rows,
    primary: isLaligaBdlPrimaryEnabled(),
  };
}
