import {
  NBA_PROPS_API_BASE,
  NBA_PROPS_BOOK_IDS_QUERY,
} from "../shared/nbaPropsConstants.js";
import {
  getEtDateString,
  getTomorrowEtDateString,
  readNbaPlayoffSlateGamesFromKv,
  refreshNbaPlayoffGamesKvForEtDates,
} from "../shared/nbaPlayoffSlateFromActionNetwork.js";
import { getDurableJson, setDurableJson } from "./_durableStore.js";

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
 * Dynamic lookup via Action Network scoreboard.
 * @param {string | null | undefined} homeTeam
 * @param {string | null | undefined} awayTeam
 * @param {string | null | undefined} date YYYY-MM-DD or YYYYMMDD
 */
export async function resolveNbaPlayoffGameIdFromScoreboard(homeTeam, awayTeam, date) {
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
 * @param {string} todayET YYYY-MM-DD
 * @param {string} [tomorrowET] YYYY-MM-DD
 */
export async function getNbaPlayoffSlateGamesForEtDates(todayET, tomorrowET) {
  const today = todayET || getEtDateString();
  const tomorrow = tomorrowET || getTomorrowEtDateString(today);
  const store = { getDurableJson, setDurableJson };
  await refreshNbaPlayoffGamesKvForEtDates(today, tomorrow, store);
  return readNbaPlayoffSlateGamesFromKv(today, tomorrow, store);
}

/**
 * First scheduled/live KV game for manual cron when no query params supplied.
 */
export async function getDefaultNbaPropsScrapeTarget() {
  const todayET = getEtDateString();
  const tomorrowET = getTomorrowEtDateString(todayET);
  const games = await getNbaPlayoffSlateGamesForEtDates(todayET, tomorrowET);
  const pick =
    games.find((g) => {
      const s = String(g?.state || "").toLowerCase();
      return s === "pre" || s === "scheduled";
    }) || games[0];
  if (!pick?.actionNetworkGameId) return null;
  const tipoffMs = pick.startTimeUtc ? Date.parse(pick.startTimeUtc) : null;
  const dateYmd = pick.startTimeUtc
    ? new Date(pick.startTimeUtc).toLocaleDateString("en-CA", { timeZone: "America/New_York" }).replace(/-/g, "")
    : todayET.replace(/-/g, "");
  return {
    gameId: pick.actionNetworkGameId,
    tipoffMs: Number.isFinite(tipoffMs) ? tipoffMs : null,
    homeAbbr: pick.homeTeam?.abbr,
    awayAbbr: pick.awayTeam?.abbr,
    dateYmd,
    source: "kv_playoff_slate",
  };
}

/**
 * @param {Record<string, unknown> | null | undefined} game
 */
export function resolveActionNetworkGameIdForBoardGame(game) {
  if (!game || typeof game !== "object") return null;
  const preset = game.actionNetworkGameId ?? game.anGameId;
  if (preset != null && Number.isFinite(Number(preset))) return Number(preset);
  return null;
}
