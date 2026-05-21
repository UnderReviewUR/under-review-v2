import {
  NBA_PROPS_API_BASE,
  NBA_PROPS_BOOK_IDS_QUERY,
} from "../shared/nbaPropsConstants.js";
import {
  getPlayoffHomeSlateFallbackGames,
  NBA_PLAYOFF_HOME_SLATE_FALLBACK,
} from "../shared/nbaPlayoffHomeSlateFallback.js";

/** Hardcoded playoff lookups until full scoreboard resolver is wired everywhere. */
const HARDCODED_GAMES = NBA_PLAYOFF_HOME_SLATE_FALLBACK;

/**
 * @param {string} ymd YYYYMMDD
 */
function normalizeDateYmd(ymd) {
  const raw = String(ymd || "").replace(/-/g, "").trim();
  return /^\d{8}$/.test(raw) ? raw : null;
}

/**
 * @param {string | null | undefined} abbr
 */
function normAbbr(abbr) {
  return String(abbr || "")
    .toUpperCase()
    .trim();
}

/**
 * @param {string | null | undefined} homeTeam
 * @param {string | null | undefined} awayTeam
 * @param {string | null | undefined} date YYYY-MM-DD or YYYYMMDD
 */
/**
 * @param {number | string} gameId
 */
export function getNbaPlayoffGameIdByGameId(gameId) {
  const gid = Number(gameId);
  if (!Number.isFinite(gid)) return null;
  const row = HARDCODED_GAMES.find((g) => g.gameId === gid);
  if (!row) return null;
  return {
    gameId: row.gameId,
    tipoffMs: row.tipoffMs,
    homeAbbr: row.homeAbbr,
    awayAbbr: row.awayAbbr,
    dateYmd: row.dateYmd,
    source: "hardcoded",
  };
}

export function getNbaPlayoffGameId(homeTeam, awayTeam, date) {
  const home = normAbbr(homeTeam);
  const away = normAbbr(awayTeam);
  const ymd = normalizeDateYmd(date);

  for (const row of HARDCODED_GAMES) {
    const homeMatch = !home || home === normAbbr(row.homeAbbr);
    const awayMatch = !away || away === normAbbr(row.awayAbbr);
    const dateMatch = !ymd || ymd === row.dateYmd;
    if (homeMatch && awayMatch && dateMatch) {
      return {
        gameId: row.gameId,
        tipoffMs: row.tipoffMs,
        homeAbbr: row.homeAbbr,
        awayAbbr: row.awayAbbr,
        dateYmd: row.dateYmd,
        source: "hardcoded",
      };
    }
  }

  return null;
}

/**
 * Dynamic lookup via Action Network scoreboard (follow-up path).
 * @param {string | null | undefined} homeTeam
 * @param {string | null | undefined} awayTeam
 * @param {string | null | undefined} date
 */
export async function resolveNbaPlayoffGameIdFromScoreboard(homeTeam, awayTeam, date) {
  const hardcoded = getNbaPlayoffGameId(homeTeam, awayTeam, date);
  if (hardcoded) return hardcoded;

  const ymd = normalizeDateYmd(date);
  const home = normAbbr(homeTeam);
  const away = normAbbr(awayTeam);
  if (!ymd || !home || !away) return null;

  const url = `${NBA_PROPS_API_BASE}/scoreboard/nba?bookIds=${NBA_PROPS_BOOK_IDS_QUERY}&date=${ymd}&periods=event`;
  const res = await fetch(url, {
    cache: "no-store",
    headers: {
      Accept: "application/json",
      "User-Agent": "UnderReview/1.0 (+https://under-review.app)",
    },
    signal: AbortSignal.timeout(12000),
  });
  if (!res.ok) {
    throw new Error(`Action Network scoreboard HTTP ${res.status}`);
  }
  const data = await res.json();
  const games = Array.isArray(data?.games) ? data.games : [];

  for (const g of games) {
    const teams = Array.isArray(g?.teams) ? g.teams : [];
    const abbrs = teams.map((t) => normAbbr(t?.abbr));
    if (!abbrs.includes(home) || !abbrs.includes(away)) continue;
    const homeRow = teams.find((t) => normAbbr(t?.abbr) === home);
    const awayRow = teams.find((t) => normAbbr(t?.abbr) === away);
    if (!homeRow || !awayRow) continue;
    if (g.home_team_id != null && g.home_team_id !== homeRow.id) continue;

    return {
      gameId: g.id,
      tipoffMs: g.start_time ? Date.parse(String(g.start_time)) : null,
      homeAbbr: home,
      awayAbbr: away,
      dateYmd: ymd,
      source: "scoreboard",
    };
  }

  return null;
}

/**
 * Default game for cron when no query params supplied.
 */
export function getDefaultNbaPropsScrapeTarget() {
  return getNbaPlayoffGameId("OKC", "SAS", "20260520");
}

/**
 * Inject known playoff scoreboard rows when BDL/Odds miss tonight's ET slate.
 * @param {string} todayET YYYY-MM-DD
 * @param {string} [tomorrowET] YYYY-MM-DD
 */
export function getHardcodedPlayoffSlateGamesForEtDates(todayET, tomorrowET) {
  return getPlayoffHomeSlateFallbackGames(todayET, tomorrowET);
}

/**
 * @param {Record<string, unknown> | null | undefined} game
 */
export function resolveActionNetworkGameIdForBoardGame(game) {
  if (!game || typeof game !== "object") return null;
  const preset = game.actionNetworkGameId ?? game.anGameId;
  if (preset != null && Number.isFinite(Number(preset))) return Number(preset);

  const home = game?.homeTeam?.abbr;
  const away = game?.awayTeam?.abbr;
  const start = game.startTimeUtc || game.commenceTime || null;
  let dateYmd = null;
  if (start) {
    dateYmd = new Date(start).toLocaleDateString("en-CA", { timeZone: "America/New_York" });
  }
  const hit = getNbaPlayoffGameId(home, away, dateYmd);
  return hit?.gameId ?? null;
}
