/**
 * Action Network NBA scoreboard — odds/props enrichment only (game IDs, tipoff).
 * Slate discovery is BallDontLie-only (`nbaPlayoffSlateFromBdl.js`).
 */

import {
  NBA_PROPS_API_BASE,
  NBA_PROPS_BOOK_IDS_QUERY,
} from "./nbaPropsConstants.js";
import { canonicalizeTeamAbbr } from "./gameLineSpread.js";

/**
 * @param {string} [dateYmd] YYYYMMDD
 */
export function etDateYmdFromDate(dateYmd) {
  return String(dateYmd || "").replace(/-/g, "").trim();
}

/**
 * @param {Date} [now]
 * @returns {string} YYYY-MM-DD America/New_York
 */
export function getEtDateString(now = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

/**
 * @param {string} todayET YYYY-MM-DD
 * @returns {string} YYYY-MM-DD
 */
export function getTomorrowEtDateString(todayET) {
  const base = String(todayET || getEtDateString()).trim();
  const [y, m, d] = base.split("-").map(Number);
  const noonUtc = Date.UTC(y, m - 1, d, 17, 0, 0);
  const next = new Date(noonUtc + 24 * 60 * 60 * 1000);
  return getEtDateString(next);
}

/**
 * @param {string} todayET YYYY-MM-DD
 * @returns {string} YYYY-MM-DD
 */
export function getYesterdayEtDateString(todayET) {
  const base = String(todayET || getEtDateString()).trim();
  const [y, m, d] = base.split("-").map(Number);
  const noonUtc = Date.UTC(y, m - 1, d, 17, 0, 0);
  const prev = new Date(noonUtc - 24 * 60 * 60 * 1000);
  return getEtDateString(prev);
}

function slatePairKey(g) {
  const away = normAbbr(g?.awayTeam?.abbr);
  const home = normAbbr(g?.homeTeam?.abbr);
  return away && home ? `${away}|${home}` : "";
}

/**
 * @param {Record<string, unknown>} g raw Action Network scoreboard row
 */
function actionNetworkPairKeyFromRaw(g) {
  const teams = Array.isArray(g?.teams) ? g.teams : [];
  let homeRow = null;
  let awayRow = null;
  if (g?.home_team_id != null) {
    homeRow = teams.find((t) => t?.id === g.home_team_id) || null;
    awayRow = teams.find((t) => t?.id !== g.home_team_id) || null;
  }
  if (!homeRow && teams.length >= 2) {
    homeRow = teams[1];
    awayRow = teams[0];
  }
  const homeAbbr = normAbbr(homeRow?.abbr || homeRow?.display_name);
  const awayAbbr = normAbbr(awayRow?.abbr || awayRow?.display_name);
  if (!homeAbbr || !awayAbbr || homeAbbr === "UNK" || awayAbbr === "UNK") return "";
  return `${awayAbbr}|${homeAbbr}`;
}

/**
 * Playable = not explicitly finished/cancelled. Empty/unknown status is included (playoff boards vary).
 * @param {string | null | undefined} status
 * @param {string | null | undefined} realStatus
 */
export function isActionNetworkScheduledOrLive(status, realStatus) {
  const s = `${status || ""} ${realStatus || ""}`.toLowerCase().trim();
  if (!s) return true;
  if (/final|complete|closed|cancel|cancelled|abandon|postponed|ended|full.?time|ft\b/.test(s)) {
    return false;
  }
  if (/live|in_progress|in progress|halftime|half\b|quarter|\bq[1-4]\b|overtime|\bot\b/.test(s)) {
    return true;
  }
  if (/sched|pregame|pre-game|pre\b|upcoming|not.?started|created|open|pending|delayed|time.?tbd|tbd/.test(s)) {
    return true;
  }
  return !/complete|closed|final/.test(s);
}

/**
 * @param {string} dateYmd
 * @param {Record<string, unknown>[]} games
 */
export function logActionNetworkScoreboardProbe(dateYmd, games) {
  const rows = (games || []).map((g) => {
    const teams = Array.isArray(g?.teams) ? g.teams : [];
    const homeRow = g?.home_team_id != null ? teams.find((t) => t?.id === g.home_team_id) : null;
    const awayRow = teams.find((t) => t?.id !== g?.home_team_id) || teams[0];
    const passesFilter = isActionNetworkScheduledOrLive(g.status, g.real_status);
    return {
      id: g.id,
      status: g.status ?? null,
      real_status: g.real_status ?? null,
      start_time: g.start_time ?? null,
      home_team_id: g.home_team_id ?? null,
      away: awayRow?.abbr || awayRow?.display_name || null,
      home: homeRow?.abbr || homeRow?.display_name || null,
      passesFilter,
    };
  });
  console.log(
    JSON.stringify({
      event: "nba_playoff_slate_action_network",
      dateYmd,
      rawGameCount: rows.length,
      playableCount: rows.filter((r) => r.passesFilter).length,
      games: rows,
    }),
  );
}

/**
 * @param {string | null | undefined} abbr
 */
function normAbbr(abbr) {
  return canonicalizeTeamAbbr(String(abbr || "").toUpperCase().trim());
}

/**
 * @param {Record<string, unknown>} g
 * @param {string} dateYmd YYYYMMDD
 */
export function mapActionNetworkGameToSlateGame(g, dateYmd) {
  const teams = Array.isArray(g?.teams) ? g.teams : [];
  let homeRow = null;
  let awayRow = null;
  if (g?.home_team_id != null) {
    homeRow = teams.find((t) => t?.id === g.home_team_id) || null;
    awayRow = teams.find((t) => t?.id !== g.home_team_id) || null;
  }
  if (!homeRow && teams.length >= 2) {
    homeRow = teams[1];
    awayRow = teams[0];
  }
  const homeAbbr = normAbbr(homeRow?.abbr || homeRow?.display_name);
  const awayAbbr = normAbbr(awayRow?.abbr || awayRow?.display_name);
  if (!homeAbbr || !awayAbbr || homeAbbr === "UNK" || awayAbbr === "UNK") return null;

  const tipoffMs = g.start_time ? Date.parse(String(g.start_time)) : null;
  const live = isActionNetworkScheduledOrLive(g.status, g.real_status);
  const inProgress = /live|in_progress|halftime|\bq[1-4]\b/i.test(
    `${g.status || ""} ${g.real_status || ""}`,
  );

  return {
    id: g.id,
    status: inProgress ? "Live" : "Scheduled",
    state: inProgress ? "in" : "pre",
    statusCode: inProgress ? 2 : 1,
    period: null,
    clock: null,
    awayTeam: {
      name: awayAbbr,
      abbr: awayAbbr,
      score: null,
    },
    homeTeam: {
      name: homeAbbr,
      abbr: homeAbbr,
      score: null,
    },
    startTimeUtc: Number.isFinite(tipoffMs) ? new Date(tipoffMs).toISOString() : null,
    startTimeSource: "action_network_scoreboard",
    postseason: true,
    actionNetworkGameId: Number(g.id),
    actionNetworkStatus: g.status || g.real_status || null,
    actionNetworkDateYmd: dateYmd,
    _anScheduledOrLive: live,
  };
}

/**
 * @param {string} dateYmd YYYYMMDD
 */
export async function fetchActionNetworkNbaScoreboardForDate(dateYmd) {
  const ymd = etDateYmdFromDate(dateYmd);
  if (!/^\d{8}$/.test(ymd)) return [];

  const url = `${NBA_PROPS_API_BASE}/scoreboard/nba?date=${ymd}&bookIds=${NBA_PROPS_BOOK_IDS_QUERY}`;
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
  logActionNetworkScoreboardProbe(ymd, games);

  /** @type {ReturnType<typeof mapActionNetworkGameToSlateGame>[]} */
  const out = [];
  for (const g of games) {
    if (!isActionNetworkScheduledOrLive(g.status, g.real_status)) continue;
    const mapped = mapActionNetworkGameToSlateGame(g, ymd);
    if (mapped) out.push(mapped);
  }
  return out;
}

/**
 * Fetch raw Action Network games for a date (no playable filter — used to match event IDs).
 * @param {string} dateYmd YYYYMMDD
 */
export async function fetchActionNetworkNbaScoreboardRaw(dateYmd) {
  const ymd = etDateYmdFromDate(dateYmd);
  if (!/^\d{8}$/.test(ymd)) return [];

  const url = `${NBA_PROPS_API_BASE}/scoreboard/nba?date=${ymd}&bookIds=${NBA_PROPS_BOOK_IDS_QUERY}`;
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
  return Array.isArray(data?.games) ? data.games : [];
}

/**
 * Attach Action Network event IDs to BDL-driven slate rows (odds/props only).
 * @param {Record<string, unknown>[]} slateGames
 * @param {string} todayET YYYY-MM-DD
 * @param {string} [tomorrowET] YYYY-MM-DD
 */
export async function enrichSlateGamesWithActionNetworkEventIds(
  slateGames,
  todayET,
  tomorrowET,
) {
  if (!Array.isArray(slateGames) || slateGames.length === 0) return slateGames || [];

  const tomorrow = tomorrowET || getTomorrowEtDateString(todayET);
  const ymdTokens = [
    String(todayET || "").replace(/-/g, ""),
    String(tomorrow).replace(/-/g, ""),
  ].filter((t) => /^\d{8}$/.test(t));

  /** @type {Map<string, { eventId: number, tipoffMs: number | null, status: string | null }>} */
  const index = new Map();

  for (const ymd of ymdTokens) {
    let raw = [];
    try {
      raw = await fetchActionNetworkNbaScoreboardRaw(ymd);
      logActionNetworkScoreboardProbe(ymd, raw);
    } catch (err) {
      console.warn(
        JSON.stringify({
          event: "nba_slate_action_network_enrich_failed",
          dateYmd: ymd,
          error: err?.message || String(err),
        }),
      );
      continue;
    }

    for (const g of raw) {
      const pair = actionNetworkPairKeyFromRaw(g);
      const eventId = Number(g.id);
      if (!pair || !Number.isFinite(eventId)) continue;
      const tipoffMs = g.start_time ? Date.parse(String(g.start_time)) : null;
      index.set(pair, {
        eventId,
        tipoffMs: Number.isFinite(tipoffMs) ? tipoffMs : null,
        status: String(g.status || g.real_status || ""),
      });
    }
  }

  let enriched = 0;
  const out = slateGames.map((row) => {
    if (row?.actionNetworkGameId != null && Number.isFinite(Number(row.actionNetworkGameId))) {
      return row;
    }
    const hit = index.get(slatePairKey(row));
    if (!hit) return row;
    enriched += 1;
    return {
      ...row,
      actionNetworkGameId: hit.eventId,
      actionNetworkStatus: hit.status,
      actionNetworkEnriched: true,
    };
  });

  if (enriched > 0) {
    console.log(
      JSON.stringify({
        event: "nba_slate_action_network_enriched",
        slateCount: slateGames.length,
        enrichedCount: enriched,
      }),
    );
  }

  return out;
}
