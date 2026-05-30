/**
 * BallDontLie MLB API — games, lineups, injuries, book odds, player props.
 * OpenAPI: https://www.balldontlie.io/openapi/mlb.yml
 */
import { bdlFetch } from "./_balldontlie.js";
import { tagStructuralImpactAtIngestion } from "../shared/structuralAngleValidation.js";

const MAX_GAME_PAGES = 12;
const MAX_INJURY_PAGES = 6;
const MAX_ODDS_PAGES = 8;
const MAX_STATS_PAGES = 8;
const bdlTierSkipLogged = new Set();

function logBdlTierSkipOnce(key, detail) {
  if (bdlTierSkipLogged.has(key)) return;
  bdlTierSkipLogged.add(key);
  console.warn(JSON.stringify({ event: "bdl_tier_endpoint_skipped", sport: "mlb", key, detail }));
}

function etCalendarDate(isoString) {
  if (!isoString) return "";
  return new Date(isoString).toLocaleDateString("en-CA", { timeZone: "America/New_York" });
}

async function drainMlbPages(endpoint, params, bdlKey, maxPages = MAX_GAME_PAGES) {
  const out = [];
  let cursor = null;
  for (let p = 0; p < maxPages; p++) {
    const merged = { ...params, per_page: params.per_page ?? 100 };
    if (cursor != null && cursor !== "") merged.cursor = cursor;
    const res = await bdlFetch(endpoint, merged, { apiKey: bdlKey, timeoutMs: 12000 });
    if (!res.ok || !Array.isArray(res.data?.data)) break;
    out.push(...res.data.data);
    const next = res.data.meta?.next_cursor;
    if (next == null || next === "") break;
    cursor = next;
  }
  return out;
}

function inferGameState(statusRaw) {
  const s = String(statusRaw || "").toLowerCase();
  if (/\bfinal\b|\bcompleted\b/.test(s)) return "post";
  if (/\blive\b|\bin progress\b|\bmiddle\b|\btop\b|\bbottom\b|\bdelay\b/.test(s)) return "in";
  return "pre";
}

function pickTeamAbbr(teamObj, fallbackName) {
  const abbr = String(teamObj?.abbreviation || "").trim().toUpperCase();
  if (abbr && abbr.length <= 4) return abbr;
  const name = String(teamObj?.display_name || teamObj?.name || fallbackName || "").trim();
  if (!name) return "?";
  const parts = name.split(/\s+/).filter(Boolean);
  const last = parts[parts.length - 1] || "";
  return last.slice(0, 3).toUpperCase();
}

/**
 * @param {object} g — MLBGame from BDL
 * @param {{ home: string|null, away: string|null }} pitchers
 */
export function mapBdlMlbGameToAppRow(g, pitchers = { home: null, away: null }) {
  const homeTeamObj = g.home_team || {};
  const awayTeamObj = g.away_team || {};
  const homeName =
    String(homeTeamObj.display_name || homeTeamObj.name || g.home_team_name || "").trim() || "Home";
  const awayName =
    String(awayTeamObj.display_name || awayTeamObj.name || g.away_team_name || "").trim() || "Away";
  const hd = g.home_team_data || {};
  const ad = g.away_team_data || {};
  const hr = hd.runs;
  const ar = ad.runs;
  const hasScore = hr != null && ar != null;
  const state = inferGameState(g.status);
  const statusParts = [String(g.status || "").trim(), g.display_clock ? String(g.display_clock).trim() : ""].filter(
    Boolean,
  );
  const statusLine = statusParts.join(" · ") || (state === "pre" ? "Scheduled" : state === "in" ? "Live" : "Final");

  let gameTimeEt = "";
  if (g.date) {
    gameTimeEt =
      new Date(g.date).toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        timeZone: "America/New_York",
      }) + " ET";
  }

  return {
    id: g.id,
    status: state === "pre" ? gameTimeEt || statusLine : statusLine,
    state,
    date: g.date || null,
    startTimeUtc: g.date || null,
    inning: g.period != null ? g.period : null,
    inningHalf: null,
    homeTeam: {
      name: homeName,
      abbr: pickTeamAbbr(homeTeamObj, homeName),
      score: hasScore ? Number(hr) : null,
      pitcher: pitchers.home || null,
    },
    awayTeam: {
      name: awayName,
      abbr: pickTeamAbbr(awayTeamObj, awayName),
      score: hasScore ? Number(ar) : null,
      pitcher: pitchers.away || null,
    },
    venue: String(g.venue || "").trim(),
    source: "balldontlie_mlb",
    bdlSeason: g.season ?? null,
    bdlSeasonType: g.season_type ?? null,
    bdlPostseason: Boolean(g.postseason),
  };
}

/**
 * @returns {Promise<{ todayGames: object[], tomorrowGames: object[] }|null>}
 */
export async function fetchBdlMlbTodayTomorrowGames(bdlKey, todayEtYmd, tomorrowEtYmd) {
  if (!bdlKey || !todayEtYmd || !tomorrowEtYmd) return null;

  const rawGames = await drainMlbPages(
    "/mlb/v1/games",
    { "dates[]": [todayEtYmd, tomorrowEtYmd], per_page: 100 },
    bdlKey,
    MAX_GAME_PAGES,
  );
  if (!rawGames.length) return null;

  logBdlTierSkipOnce(
    "lineups",
    "Skipped /mlb/v1/lineups because current BDL plan is MLB All-Star; ESPN probable starters are merged later.",
  );
  const mapped = rawGames.map((g) => mapBdlMlbGameToAppRow(g, { home: null, away: null }));

  let todayGames = mapped.filter((row) => etCalendarDate(row.date) === todayEtYmd);
  let tomorrowGames = mapped.filter((row) => etCalendarDate(row.date) === tomorrowEtYmd);
  /** If API dates[] matched but ET calendar split dropped rows (clock skew), keep slate usable. */
  if (!todayGames.length && !tomorrowGames.length && mapped.length > 0) {
    todayGames = mapped;
  }

  const teamIds = [
    ...new Set(
      rawGames.flatMap((g) => [g.home_team?.id, g.away_team?.id]).filter((id) => id != null),
    ),
  ];

  return { todayGames, tomorrowGames, rawGames, teamIds };
}

export async function fetchBdlMlbInjuriesForTeamIds(bdlKey, teamIds) {
  const ids = [...new Set((teamIds || []).filter((id) => Number.isFinite(Number(id))))];
  if (!bdlKey || !ids.length) return [];

  const out = [];
  const chunks = [];
  for (let i = 0; i < ids.length; i += 8) chunks.push(ids.slice(i, i + 8));
  for (const chunk of chunks) {
    const rows = await drainMlbPages(
      "/mlb/v1/player_injuries",
      { "team_ids[]": chunk, per_page: 100 },
      bdlKey,
      MAX_INJURY_PAGES,
    );
    for (const row of rows) {
      const p = row.player;
      const name = String(p?.full_name || "").trim();
      if (!name) continue;
      const teamAbbr = pickTeamAbbr(p?.team || {}, "");
      out.push(
        tagStructuralImpactAtIngestion(
          {
            player: name,
            team: teamAbbr,
            position: String(p?.position || p?.primary_position || "").trim(),
            status: String(row.status || "").trim(),
            detail: [String(row.type || "").trim(), String(row.detail || "").trim(), String(row.short_comment || "").trim()]
              .filter(Boolean)
              .join(" — "),
            source: "balldontlie_mlb",
          },
          "mlb",
          "lineup_vacancy",
        ),
      );
    }
  }
  return out.slice(0, 80);
}

export async function fetchBdlMlbActivePlayersForTeamIds(bdlKey, teamIds) {
  const ids = [...new Set((teamIds || []).filter((id) => Number.isFinite(Number(id))))];
  if (!bdlKey || !ids.length) return [];
  const rows = await drainMlbPages("/mlb/v1/players/active", { "team_ids[]": ids, per_page: 100 }, bdlKey, 12);
  return rows
    .map((row) => ({
      playerId: row?.id ?? null,
      name: String(row?.full_name || [row?.first_name, row?.last_name].filter(Boolean).join(" ")).trim(),
      team: pickTeamAbbr(row?.team || {}, ""),
      position: String(row?.position || "").trim(),
      batsThrows: String(row?.bats_throws || "").trim(),
      active: row?.active !== false,
      source: "balldontlie_mlb",
    }))
    .filter((row) => row.playerId != null && row.name);
}

function summarizeMlbStatRow(row) {
  return {
    gameId: row?.game_id ?? null,
    batting: {
      atBats: row?.at_bats ?? null, runs: row?.runs ?? null, hits: row?.hits ?? null,
      rbi: row?.rbi ?? null, homeRuns: row?.hr ?? null, totalBases: row?.total_bases ?? null,
      strikeouts: row?.k ?? null, walks: row?.bb ?? null,
    },
    pitching: {
      inningsPitched: row?.ip ?? null, strikeouts: row?.p_k ?? null, walks: row?.p_bb ?? null,
      earnedRuns: row?.er ?? null, hitsAllowed: row?.p_hits ?? null, pitchCount: row?.pitch_count ?? null,
    },
  };
}

export async function fetchBdlMlbRecentStatsForPlayers(bdlKey, activePlayers, { season } = {}) {
  const players = Array.isArray(activePlayers) ? activePlayers : [];
  const ids = [...new Set(players.map((row) => Number(row?.playerId)).filter(Number.isFinite))].slice(0, 80);
  if (!bdlKey || !ids.length) return [];
  const teamByPlayerId = new Map(players.map((row) => [Number(row.playerId), row.team]));
  const nameByPlayerId = new Map(players.map((row) => [Number(row.playerId), row.name]));
  const rows = [];
  for (let i = 0; i < ids.length; i += 12) {
    const chunk = ids.slice(i, i + 12);
    rows.push(...(await drainMlbPages("/mlb/v1/stats", { "player_ids[]": chunk, ...(season ? { "seasons[]": [season] } : {}), per_page: 100 }, bdlKey, MAX_STATS_PAGES)));
  }
  const byPlayer = new Map();
  for (const row of rows) {
    const playerId = Number(row?.player?.id ?? row?.player_id);
    if (!Number.isFinite(playerId)) continue;
    if (!byPlayer.has(playerId)) {
      byPlayer.set(playerId, {
        playerId,
        player: String(row?.player?.full_name || nameByPlayerId.get(playerId) || "").trim(),
        team: pickTeamAbbr(row?.player?.team || {}, teamByPlayerId.get(playerId) || ""),
        games: [],
        source: "balldontlie_mlb",
      });
    }
    byPlayer.get(playerId).games.push(summarizeMlbStatRow(row));
  }
  return [...byPlayer.values()]
    .map((entry) => ({ ...entry, games: entry.games.slice(0, 5), gamesReturned: entry.games.length }))
    .filter((entry) => entry.player && entry.games.length > 0)
    .slice(0, 80);
}

export async function fetchBdlMlbStandings(bdlKey, season) {
  if (!bdlKey || !season) return [];
  const rows = await drainMlbPages("/mlb/v1/standings", { season, per_page: 100 }, bdlKey, 4);
  return rows
    .map((row) => ({
      team: pickTeamAbbr(row?.team || {}, row?.team?.display_name || ""),
      teamName: String(row?.team?.display_name || row?.team?.name || "").trim(),
      wins: row?.wins ?? null, losses: row?.losses ?? null, winPercent: row?.win_percent ?? null,
      divisionRank: row?.division_rank ?? null, leagueRank: row?.league_rank ?? null,
      gamesBehind: row?.games_behind ?? null, streak: row?.streak ?? null,
      lastTenGames: row?.last_ten_games ?? null, runDifferential: row?.run_differential ?? null,
      source: "balldontlie_mlb",
    }))
    .filter((row) => row.team);
}

function gameLabelFromAppRow(row) {
  const a = row?.awayTeam?.name || "";
  const h = row?.homeTeam?.name || "";
  return `${a} @ ${h}`;
}

/**
 * BDL game odds → same shape as Odds-API-driven gameTotals (subset).
 */
export async function fetchBdlMlbGameTotalsMap(bdlKey, todayEtYmd, gamesForPark) {
  if (!bdlKey || !todayEtYmd) return {};

  const oddsRows = await drainMlbPages("/mlb/v1/odds", { dates: [todayEtYmd], per_page: 100 }, bdlKey, MAX_ODDS_PAGES);
  const byId = new Map((gamesForPark || []).map((g) => [g.id, g]));

  const totals = {};
  for (const o of oddsRows) {
    const gid = o.game_id;
    const row = byId.get(gid);
    if (!row || o.total_value == null || o.total_value === "") continue;
    const line = parseFloat(String(o.total_value).replace(/[^\d.-]/g, ""));
    if (!Number.isFinite(line)) continue;
    const key = gameLabelFromAppRow(row);
    const pf = row.parkFactor;
    let run_env = "NEUTRAL";
    if (pf != null && Number(pf) < 95) run_env = "LOW";
    else if (pf != null && Number(pf) > 105) run_env = "HIGH";
    totals[key] = {
      total: line,
      run_env,
      park: row.homeTeam?.name || "",
      parkNote: row.park?.note || "",
      parkFactor: pf ?? null,
      source: "balldontlie_mlb",
    };
  }
  return totals;
}

/**
 * @returns propLines matching api/mlb.js Odds shape (partial).
 */
export async function fetchBdlMlbPlayerPropsForSlate(bdlKey, appGames) {
  if (bdlKey && Array.isArray(appGames) && appGames.length) {
    logBdlTierSkipOnce(
      "odds_player_props",
      "Skipped /mlb/v1/odds/player_props because current BDL plan is MLB All-Star.",
    );
  }
  return [];
}
