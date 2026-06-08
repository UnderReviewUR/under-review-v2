/**
 * Action Network scoreboard — spread/total without The Odds API.
 * Game objects embed markets when fetched with bookIds (DraftKings priority).
 */

import {
  NBA_PROPS_API_BASE,
  NBA_PROPS_BOOK_IDS,
} from "../shared/nbaPropsConstants.js";
import { canonicalizeTeamAbbr, normalizeSpreadFromOutcomes } from "../shared/gameLineSpread.js";

const UA = "UnderReview/1.0 (+https://under-review.app)";
const SCOREBOARD_CACHE_TTL_MS = 90 * 1000;

/** @type {Map<string, { fetchedAtMs: number, data: Record<string, unknown> }>} */
const scoreboardCache = new Map();

function normAbbr(abbr) {
  return canonicalizeTeamAbbr(abbr);
}

function etDateYmdFromUtc(iso) {
  if (!iso) return null;
  const ymd = new Date(iso).toLocaleDateString("en-CA", { timeZone: "America/New_York" });
  return ymd.replace(/-/g, "");
}

function todayEtDateYmd() {
  return new Date().toLocaleDateString("en-CA", { timeZone: "America/New_York" }).replace(/-/g, "");
}

/**
 * @param {{ side?: string, value?: number, team_id?: number }} row
 * @param {{ home_team_id?: number, away_team_id?: number, teams?: Array<{ id?: number, abbr?: string }> }} game
 * @param {string} homeAbbr
 * @param {string} awayAbbr
 */
export function spreadOutcomesFromActionNetworkRow(row, game, homeAbbr, awayAbbr) {
  const ha = normAbbr(homeAbbr);
  const aa = normAbbr(awayAbbr);
  const val = Number(row?.value);
  if (!ha || !aa || !Number.isFinite(val)) return null;

  const teams = Array.isArray(game?.teams) ? game.teams : [];
  const homeTeamId = Number(game?.home_team_id);
  const awayTeamId = Number(game?.away_team_id);
  const teamId = Number(row?.team_id);
  const side = String(row?.side || "").toLowerCase();

  let teamAbbr = null;
  if (side === "home" || (Number.isFinite(teamId) && teamId === homeTeamId)) {
    teamAbbr = ha;
  } else if (side === "away" || (Number.isFinite(teamId) && teamId === awayTeamId)) {
    teamAbbr = aa;
  } else if (Number.isFinite(teamId)) {
    const hit = teams.find((t) => Number(t?.id) === teamId);
    teamAbbr = normAbbr(hit?.abbr);
  }

  if (!teamAbbr) return null;
  const otherAbbr = teamAbbr === ha ? aa : ha;
  return [
    { name: teamAbbr, point: val },
    { name: otherAbbr, point: -val },
  ];
}

/**
 * @param {{ value?: number }} row
 */
export function totalFromActionNetworkRow(row) {
  const total = Number(row?.value);
  if (!Number.isFinite(total) || total <= 0) return null;
  return total;
}

/**
 * @param {Record<string, unknown>} game
 * @param {string} homeAbbr
 * @param {string} awayAbbr
 */
export function pickActionNetworkBookEventMarkets(game) {
  const marketsRoot = game?.markets;
  if (!marketsRoot || typeof marketsRoot !== "object") return null;

  for (const bookId of NBA_PROPS_BOOK_IDS) {
    const event = marketsRoot?.[String(bookId)]?.event;
    if (event && typeof event === "object") return event;
  }

  for (const book of Object.values(marketsRoot)) {
    const event = book?.event;
    if (event && typeof event === "object") return event;
  }
  return null;
}

/**
 * @param {string} dateYmd YYYYMMDD
 */
export async function fetchActionNetworkNbaScoreboard(dateYmd) {
  const ymd = String(dateYmd || "").replace(/-/g, "").trim();
  if (!/^\d{8}$/.test(ymd)) return null;

  const cached = scoreboardCache.get(ymd);
  if (cached && Date.now() - cached.fetchedAtMs < SCOREBOARD_CACHE_TTL_MS) {
    return cached.data;
  }

  const bookIds = NBA_PROPS_BOOK_IDS.join(",");
  const url = `${NBA_PROPS_API_BASE}/scoreboard/nba?bookIds=${bookIds}&date=${ymd}&periods=event`;
  const res = await fetch(url, {
    cache: "no-store",
    headers: { Accept: "application/json", "User-Agent": UA },
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) return null;
  const data = await res.json();
  scoreboardCache.set(ymd, { fetchedAtMs: Date.now(), data });
  return data;
}

/**
 * @param {Array<Record<string, unknown>>} games
 * @param {{ homeAbbr?: string, awayAbbr?: string, actionNetworkGameId?: number | string }} ctx
 */
export function findActionNetworkGameOnScoreboard(games, ctx) {
  const list = Array.isArray(games) ? games : [];
  const gid = ctx?.actionNetworkGameId;
  if (gid != null && Number.isFinite(Number(gid))) {
    const hit = list.find((g) => Number(g?.id) === Number(gid));
    if (hit) return hit;
  }

  const ha = normAbbr(ctx?.homeAbbr);
  const aa = normAbbr(ctx?.awayAbbr);
  if (!ha || !aa) return null;

  for (const g of list) {
    const teams = Array.isArray(g?.teams) ? g.teams : [];
    const abbrs = teams.map((t) => normAbbr(t?.abbr));
    if (!abbrs.includes(ha) || !abbrs.includes(aa)) continue;
    const homeRow = teams.find((t) => normAbbr(t?.abbr) === ha);
    if (g.home_team_id != null && homeRow && g.home_team_id !== homeRow.id) continue;
    return g;
  }
  return null;
}

/**
 * @param {{
 *   homeAbbr?: string,
 *   awayAbbr?: string,
 *   homeName?: string,
 *   awayName?: string,
 *   actionNetworkGameId?: number | string,
 *   dateYmd?: string,
 *   commenceTimeUtc?: string,
 * }} ctx
 */
export async function fetchActionNetworkNbaSpreadFromApi(ctx) {
  const ha = normAbbr(ctx?.homeAbbr);
  const aa = normAbbr(ctx?.awayAbbr);
  if (!ha || !aa) return null;

  const dateYmd =
    String(ctx?.dateYmd || "").replace(/-/g, "") ||
    etDateYmdFromUtc(ctx?.commenceTimeUtc) ||
    todayEtDateYmd();

  const board = await fetchActionNetworkNbaScoreboard(dateYmd);
  const game = findActionNetworkGameOnScoreboard(board?.games, ctx);
  if (!game) return null;

  const eventMarkets = pickActionNetworkBookEventMarkets(game);
  const spreadRows = Array.isArray(eventMarkets?.spread) ? eventMarkets.spread : [];
  const spreadRow = spreadRows[0];
  if (!spreadRow) return null;

  const outcomes = spreadOutcomesFromActionNetworkRow(spreadRow, game, ha, aa);
  if (!outcomes) return null;

  const normalized = normalizeSpreadFromOutcomes({
    homeAbbr: ha,
    awayAbbr: aa,
    homeName: ctx?.homeName,
    awayName: ctx?.awayName,
    outcomes,
  });
  if (!normalized) return null;

  return { ...normalized, source: "action_network_api" };
}

/**
 * @param {{
 *   homeAbbr?: string,
 *   awayAbbr?: string,
 *   actionNetworkGameId?: number | string,
 *   dateYmd?: string,
 *   commenceTimeUtc?: string,
 * }} ctx
 */
export async function fetchActionNetworkNbaTotalFromApi(ctx) {
  const ha = normAbbr(ctx?.homeAbbr);
  const aa = normAbbr(ctx?.awayAbbr);
  if (!ha || !aa) return null;

  const dateYmd =
    String(ctx?.dateYmd || "").replace(/-/g, "") ||
    etDateYmdFromUtc(ctx?.commenceTimeUtc) ||
    todayEtDateYmd();

  const board = await fetchActionNetworkNbaScoreboard(dateYmd);
  const game = findActionNetworkGameOnScoreboard(board?.games, ctx);
  if (!game) return null;

  const eventMarkets = pickActionNetworkBookEventMarkets(game);
  const totalRows = Array.isArray(eventMarkets?.total) ? eventMarkets.total : [];
  const total = totalFromActionNetworkRow(totalRows[0]);
  if (total == null) return null;

  return { total, source: "action_network_api", pace: "NEUTRAL" };
}
