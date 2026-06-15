/**
 * BallDontLie MLB API — games, lineups, injuries, book odds, player props.
 * OpenAPI: https://www.balldontlie.io/openapi/mlb.yml
 */
import { bdlFetch } from "./_balldontlie.js";
import { tagStructuralImpactAtIngestion } from "../shared/structuralAngleValidation.js";
import { isMlbBdlPaidTierEnabled } from "../shared/mlbBdlPolicy.js";

const MAX_GAME_PAGES = 12;
const MAX_LINEUP_PAGES = 8;
const MAX_INJURY_PAGES = 6;
const MAX_ODDS_PAGES = 8;

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

function mergeProbablePitchersFromLineups(gameRow, lineupEntries) {
  const hid = gameRow.home_team?.id;
  const aid = gameRow.away_team?.id;
  let home = null;
  let away = null;
  for (const row of lineupEntries || []) {
    if (!row?.is_probable_pitcher) continue;
    const tid = row.team?.id;
    const pname = String(row.player?.full_name || "").trim();
    if (!pname || tid == null) continue;
    if (hid != null && tid === hid) home = pname;
    if (aid != null && tid === aid) away = pname;
  }
  return { home, away };
}

function groupLineupsByGameId(lineupRows) {
  const m = new Map();
  for (const row of lineupRows || []) {
    const gid = row.game_id;
    if (gid == null) continue;
    if (!m.has(gid)) m.set(gid, []);
    m.get(gid).push(row);
  }
  return m;
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

  const gameIds = [...new Set(rawGames.map((g) => g.id).filter((id) => id != null))];
  let lineupRows = [];
  if (isMlbBdlPaidTierEnabled() && gameIds.length > 0) {
    const idChunks = [];
    for (let i = 0; i < gameIds.length; i += 12) idChunks.push(gameIds.slice(i, i + 12));
    for (const chunk of idChunks) {
      const rows = await drainMlbPages(
        "/mlb/v1/lineups",
        { "game_ids[]": chunk, per_page: 100 },
        bdlKey,
        MAX_LINEUP_PAGES,
      );
      lineupRows.push(...rows);
    }
  }

  const byGid = groupLineupsByGameId(lineupRows);
  const mapped = rawGames.map((g) => {
    const pitchers = mergeProbablePitchersFromLineups(g, byGid.get(g.id) || []);
    return mapBdlMlbGameToAppRow(g, pitchers);
  });

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
export async function fetchBdlMlbPlayerPropsForSlate(bdlKey, appGames, { concurrency = 3, maxGames = 10 } = {}) {
  if (!bdlKey || !Array.isArray(appGames) || !appGames.length) return [];

  const targets = appGames.slice(0, maxGames);
  const propLines = [];

  const allowedVendors = new Set(["draftkings", "fanduel", "betmgm", "fanatics"]);

  async function handleGame(game) {
    const gid = game.id;
    if (gid == null) return;
    const res = await bdlFetch("/mlb/v1/odds/player_props", { game_id: gid }, { apiKey: bdlKey, timeoutMs: 12000 });
    if (!res.ok || !Array.isArray(res.data?.data)) return;

    const glabel = gameLabelFromAppRow(game);
    const tIso = game.startTimeUtc || game.date;
    const gameTime =
      tIso &&
      new Date(tIso).toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        timeZone: "America/New_York",
      }) + " ET";

    for (const row of res.data.data) {
      const vendor = String(row.vendor || "").toLowerCase();
      if (vendor && !allowedVendors.has(vendor)) continue;

      const player = String(row.player?.full_name || "").trim();
      if (!player) continue;
      const propRaw = String(row.prop_type || "prop").trim();
      const prop = propRaw.replace(/_/g, " ");
      const market = row.market && typeof row.market === "object" ? row.market : {};
      const lineVal = row.line_value != null ? parseFloat(String(row.line_value)) : NaN;

      if (market.type === "over_under" && Number.isFinite(lineVal)) {
        if (market.over_odds != null) {
          propLines.push({
            game: glabel,
            player,
            prop,
            propRaw,
            line: lineVal,
            side: "Over",
            odds: market.over_odds,
            book: vendor || "unknown",
            eventId: String(gid),
            gameTime: gameTime || "",
            source: "balldontlie_mlb",
          });
        }
        if (market.under_odds != null) {
          propLines.push({
            game: glabel,
            player,
            prop,
            propRaw,
            line: lineVal,
            side: "Under",
            odds: market.under_odds,
            book: vendor || "unknown",
            eventId: String(gid),
            gameTime: gameTime || "",
            source: "balldontlie_mlb",
          });
        }
      } else if (market.type === "milestone" && market.odds != null) {
        propLines.push({
          game: glabel,
          player,
          prop: `${prop} (milestone)`,
          propRaw,
          line: Number.isFinite(lineVal) ? lineVal : null,
          side: "Yes",
          odds: market.odds,
          book: vendor || "unknown",
          eventId: String(gid),
          gameTime: gameTime || "",
          source: "balldontlie_mlb",
        });
      }
    }
  }

  for (let i = 0; i < targets.length; i += concurrency) {
    const chunk = targets.slice(i, i + concurrency);
    await Promise.all(chunk.map((g) => handleGame(g)));
  }

  return propLines;
}
