/**
 * Dynamic NBA playoff slate from Action Network scoreboard → KV `nba_playoff_games_{YYYYMMDD}`.
 */

import {
  NBA_PROPS_API_BASE,
  NBA_PROPS_BOOK_IDS_QUERY,
} from "./nbaPropsConstants.js";
import { canonicalizeTeamAbbr } from "./gameLineSpread.js";
import { isKvFresh } from "./selfHealingKv.js";

const KV_PREFIX = "nba_playoff_games_";
const KV_TTL_SECONDS = 6 * 60 * 60;
const REFRESH_MAX_AGE_MS = 20 * 60 * 1000;

/**
 * @param {string} dateYmd YYYYMMDD
 */
export function nbaPlayoffGamesKvKey(dateYmd) {
  const ymd = String(dateYmd || "").replace(/-/g, "").trim();
  return `${KV_PREFIX}${ymd}`;
}

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

function etDateTokens(todayET, tomorrowET) {
  const yesterdayET = getYesterdayEtDateString(todayET);
  return new Set(
    [yesterdayET, todayET, tomorrowET]
      .filter(Boolean)
      .map((d) => String(d).replace(/-/g, "").trim()),
  );
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
 * @param {string} dateYmd YYYYMMDD
 * @param {ReturnType<typeof mapActionNetworkGameToSlateGame>[]} games
 */
export function buildNbaPlayoffGamesKvPayload(dateYmd, games) {
  const ymd = etDateYmdFromDate(dateYmd);
  return {
    dateYmd: ymd,
    refreshedAtMs: Date.now(),
    games: (games || []).map((g) => ({
      event_id: g.actionNetworkGameId,
      gameId: g.actionNetworkGameId,
      homeAbbr: g.homeTeam?.abbr,
      awayAbbr: g.awayTeam?.abbr,
      tipoffMs: g.startTimeUtc ? Date.parse(g.startTimeUtc) : null,
      status: g.actionNetworkStatus || g.status,
      startTimeUtc: g.startTimeUtc,
    })),
    slateGames: games || [],
  };
}

/**
 * @param {Record<string, unknown>|null|undefined} payload
 */
export function slateGamesFromNbaPlayoffKvPayload(payload) {
  if (!payload || typeof payload !== "object") return [];
  if (Array.isArray(payload.slateGames) && payload.slateGames.length) return payload.slateGames;
  if (!Array.isArray(payload.games)) return [];
  return payload.games
    .map((row) => {
      const gameId = Number(row?.event_id ?? row?.gameId);
      if (!Number.isFinite(gameId)) return null;
      const homeAbbr = normAbbr(row?.homeAbbr);
      const awayAbbr = normAbbr(row?.awayAbbr);
      if (!homeAbbr || !awayAbbr) return null;
      const tipoffMs = Number(row?.tipoffMs);
      const startTimeUtc =
        row?.startTimeUtc ||
        (Number.isFinite(tipoffMs) ? new Date(tipoffMs).toISOString() : null);
      const inProgress = /live|in_progress/i.test(String(row?.status || ""));
      return {
        id: gameId,
        status: inProgress ? "Live" : "Scheduled",
        state: inProgress ? "in" : "pre",
        statusCode: inProgress ? 2 : 1,
        period: null,
        clock: null,
        awayTeam: { name: awayAbbr, abbr: awayAbbr, score: null },
        homeTeam: { name: homeAbbr, abbr: homeAbbr, score: null },
        startTimeUtc,
        startTimeSource: "action_network_kv",
        postseason: true,
        actionNetworkGameId: gameId,
      };
    })
    .filter(Boolean);
}

/**
 * @param {string} todayET YYYY-MM-DD
 * @param {string} [tomorrowET] YYYY-MM-DD
 * @param {{ getDurableJson: (key: string) => Promise<unknown>, setDurableJson: (key: string, value: unknown, opts?: { ttlSeconds?: number }) => Promise<void> }} store
 * @param {{ force?: boolean }} [opts]
 */
export async function refreshNbaPlayoffGamesKvForEtDates(todayET, tomorrowET, store, opts = {}) {
  const tokens = [...etDateTokens(todayET, tomorrowET)];
  const results = [];

  for (const ymd of tokens) {
    const key = nbaPlayoffGamesKvKey(ymd);
    if (!opts.force && store?.getDurableJson) {
      const existing = await store.getDurableJson(key);
      const age = Date.now() - Number(existing?.refreshedAtMs || 0);
      const cachedCount = Number(existing?.games?.length ?? 0);
      if (existing?.refreshedAtMs && age < REFRESH_MAX_AGE_MS && cachedCount > 0) {
        results.push({ dateYmd: ymd, key, cached: true, gameCount: cachedCount });
        continue;
      }
    }

    let slateGames = [];
    try {
      slateGames = await fetchActionNetworkNbaScoreboardForDate(ymd);
    } catch (err) {
      console.warn(
        JSON.stringify({
          event: "nba_playoff_scoreboard_fetch_failed",
          dateYmd: ymd,
          error: err?.message || String(err),
        }),
      );
    }

    const payload = buildNbaPlayoffGamesKvPayload(ymd, slateGames);
    if (store?.setDurableJson) {
      try {
        await store.setDurableJson(key, payload, { ttlSeconds: KV_TTL_SECONDS });
      } catch {
        /* KV optional locally */
      }
    }
    results.push({ dateYmd: ymd, key, cached: false, gameCount: slateGames.length });
  }

  return results;
}

/**
 * Self-healing read for one scoreboard date: fresh KV → return; else fetch live → write KV → return.
 * @param {string} dateYmd YYYYMMDD
 * @param {{ getDurableJson: (key: string) => Promise<unknown>, setDurableJson: (key: string, value: unknown, opts?: { ttlSeconds?: number }) => Promise<void> }} store
 */
export async function resolveNbaPlayoffSlateForDateYmd(dateYmd, store) {
  const ymd = etDateYmdFromDate(dateYmd);
  const key = nbaPlayoffGamesKvKey(ymd);
  let payload = null;
  try {
    payload = store?.getDurableJson ? await store.getDurableJson(key) : null;
  } catch {
    payload = null;
  }

  const cachedGames = slateGamesFromNbaPlayoffKvPayload(payload);
  if (isKvFresh(payload?.refreshedAtMs, REFRESH_MAX_AGE_MS)) {
    return cachedGames;
  }

  let slateGames = [];
  try {
    slateGames = await fetchActionNetworkNbaScoreboardForDate(ymd);
  } catch (err) {
    console.warn(
      JSON.stringify({
        event: "nba_playoff_slate_self_heal_failed",
        dateYmd: ymd,
        error: err?.message || String(err),
      }),
    );
    if (cachedGames.length) return cachedGames;
    return [];
  }

  const nextPayload = buildNbaPlayoffGamesKvPayload(ymd, slateGames);
  if (store?.setDurableJson) {
    try {
      await store.setDurableJson(key, nextPayload, { ttlSeconds: KV_TTL_SECONDS });
    } catch {
      /* KV optional locally */
    }
  }

  console.log(
    JSON.stringify({
      event: "nba_playoff_slate_self_heal",
      dateYmd: ymd,
      gameCount: slateGames.length,
      hadStaleCache: Boolean(payload?.refreshedAtMs),
    }),
  );

  return slateGames;
}

/**
 * @param {string} todayET YYYY-MM-DD
 * @param {string} [tomorrowET] YYYY-MM-DD
 * @param {{ getDurableJson: (key: string) => Promise<unknown>, setDurableJson?: (key: string, value: unknown, opts?: { ttlSeconds?: number }) => Promise<void> }} store
 */
export async function readNbaPlayoffSlateGamesFromKv(todayET, tomorrowET, store) {
  const tokens = [...etDateTokens(todayET, tomorrowET)];
  const seen = new Set();
  /** @type {ReturnType<typeof mapActionNetworkGameToSlateGame>[]} */
  const out = [];

  for (const ymd of tokens) {
    const games = await resolveNbaPlayoffSlateForDateYmd(ymd, store);
    for (const g of games) {
      const pair = `${g.awayTeam?.abbr}|${g.homeTeam?.abbr}`;
      if (!pair || seen.has(pair)) continue;
      seen.add(pair);
      out.push(g);
    }
  }
  return out;
}
