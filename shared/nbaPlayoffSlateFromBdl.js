/**
 * NBA playoff slate discovery via BallDontLie (All-Star) → KV `nba_slate_bdl_v1_{YYYYMMDD}`.
 * Action Network is odds-only (see nbaPlayoffSlateFromActionNetwork.js).
 */

import { canonicalizeTeamAbbr } from "./gameLineSpread.js";
import { isKvFresh } from "./selfHealingKv.js";
import {
  getEtDateString,
  getTomorrowEtDateString,
} from "./nbaPlayoffSlateFromActionNetwork.js";

/** Bust stale Action-Network-driven `nba_playoff_games_*` keys. */
const KV_PREFIX = "nba_slate_bdl_v1_";
const KV_TTL_SECONDS = 6 * 60 * 60;
const REFRESH_MAX_AGE_MS = 20 * 60 * 1000;

/**
 * @param {string} dateYmd YYYYMMDD
 */
export function nbaBdlSlateKvKey(dateYmd) {
  const ymd = String(dateYmd || "").replace(/-/g, "").trim();
  return `${KV_PREFIX}${ymd}`;
}

/**
 * @param {string | null | undefined} status
 */
export function isBdlStatusNotFinal(status) {
  const s = String(status || "").trim().toLowerCase();
  if (!s) return true;
  return s !== "final" && !/^ft\b|finished|complete/.test(s);
}

/**
 * @param {Record<string, unknown>} g BDL or mapped slate row
 * @returns {string | null} YYYY-MM-DD America/New_York
 */
export function bdlGameStartEtDateYmd(g) {
  const iso = g?.start_time ?? g?.datetime ?? g?.startTimeUtc ?? null;
  if (iso) {
    const ms = Date.parse(String(iso));
    if (Number.isFinite(ms)) {
      return new Intl.DateTimeFormat("en-CA", {
        timeZone: "America/New_York",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).format(new Date(ms));
    }
  }
  const d = g?.date;
  if (d) return String(d).slice(0, 10);
  return null;
}

/**
 * Playable on a given ET calendar day: not Final and tipoff date matches.
 * @param {Record<string, unknown>} mapped Slate row from mapBdlGameToSlateRow
 * @param {string} etDayYmd YYYY-MM-DD
 */
export function isBdlEtDayPlayableSlateGame(mapped, etDayYmd) {
  if (!mapped || !isBdlStatusNotFinal(mapped.status)) return false;
  const startEt = bdlGameStartEtDateYmd(mapped);
  return startEt === etDayYmd;
}

/** @deprecated alias — same as {@link isBdlEtDayPlayableSlateGame} */
export const isBdlTonightPlayableSlateGame = isBdlEtDayPlayableSlateGame;

function firstNonEmpty(...vals) {
  for (const v of vals) {
    const s = v != null ? String(v).trim() : "";
    if (s) return s;
  }
  return null;
}

/**
 * Map a BallDontLie /games row to the app slate shape (UI + prompts).
 * @param {Record<string, unknown>} g
 */
export function mapBdlGameToSlateRow(g) {
  const home = g.home_team || g.homeTeam;
  const away = g.visitor_team || g.visitorTeam;
  const homeName = home?.full_name || home?.name || "";
  const awayName = away?.full_name || away?.name || "";
  const homeAbbr =
    canonicalizeTeamAbbr(
      home?.abbreviation || (home?.full_name ? String(home.full_name) : ""),
    ) || "?";
  const awayAbbr =
    canonicalizeTeamAbbr(
      away?.abbreviation || (away?.full_name ? String(away.full_name) : ""),
    ) || "?";

  const hs = g.home_team_score != null ? Number(g.home_team_score) : null;
  const vs = g.visitor_team_score != null ? Number(g.visitor_team_score) : null;
  const stRaw = String(g.status || "").trim();
  const stLower = stRaw.toLowerCase();
  const period = Number(g.period) || 0;

  let state;
  let status;
  let statusCode;

  if (stLower === "final") {
    state = "post";
    status = "Final";
    statusCode = 3;
  } else if (period > 0 && stLower !== "final") {
    state = "in";
    status = stRaw || "Live";
    statusCode = 2;
  } else {
    state = "pre";
    status = /qtr|half|ot/i.test(stRaw) ? stRaw : "Scheduled";
    statusCode = 1;
  }

  const periodNum = Number(g.period);
  const clockRaw = g.time != null ? String(g.time).trim() : "";

  const seriesContext =
    g.series_text || g.series_summary || g.stage || g.round
      ? {
          summary: firstNonEmpty(g.series_text, g.series_summary) || null,
          stage: g.stage != null ? String(g.stage) : null,
          round: g.round != null ? String(g.round) : null,
        }
      : null;

  return {
    id: g.id,
    status,
    state,
    statusCode,
    period: Number.isFinite(periodNum) ? periodNum : null,
    clock: clockRaw || null,
    homeTeam: {
      name: homeName,
      abbr: homeAbbr,
      score: Number.isFinite(hs) ? hs : null,
    },
    awayTeam: {
      name: awayName,
      abbr: awayAbbr,
      score: Number.isFinite(vs) ? vs : null,
    },
    startTimeUtc: firstNonEmpty(g.start_time, g.datetime) || null,
    startTimeSource: "bdl",
    postseason: !!g.postseason,
    bdlGameId: g.id,
    seriesContext,
  };
}

/**
 * @param {string} bdlKey
 * @param {string} dateIso YYYY-MM-DD
 * @param {{ postseason?: boolean }} [opts]
 */
export async function fetchBdlGamesForDateIso(bdlKey, dateIso, opts = {}) {
  if (!bdlKey) return [];
  const bases = [
    "https://api.balldontlie.io/v1/games",
    "https://api.balldontlie.io/nba/v1/games",
  ];
  for (const base of bases) {
    const all = [];
    let cursor = null;
    let pages = 0;
    let firstOk = false;
    while (pages < 30) {
      const qs = new URLSearchParams();
      qs.append("dates[]", dateIso);
      qs.append("per_page", "100");
      if (opts.postseason) qs.append("postseason", "true");
      if (cursor != null && cursor !== "") qs.append("cursor", String(cursor));
      const res = await fetch(`${base}?${qs.toString()}`, {
        cache: "no-store",
        headers: { Authorization: bdlKey },
        signal: AbortSignal.timeout(15000),
      });
      if (!res.ok) break;
      const data = await res.json();
      if (!data || !Array.isArray(data.data)) break;
      firstOk = true;
      all.push(...data.data);
      const next = data.meta?.next_cursor;
      if (next == null || next === "" || data.data.length === 0) break;
      cursor = next;
      pages += 1;
    }
    if (firstOk) return all;
  }
  return [];
}

/**
 * @param {Record<string, unknown>[]} rows
 * @param {string} etDayYmd YYYY-MM-DD
 */
export function filterBdlRowsForEtDay(rows, etDayYmd) {
  const mapped = (rows || []).map(mapBdlGameToSlateRow);
  return mapped.filter((g) => isBdlEtDayPlayableSlateGame(g, etDayYmd));
}

/**
 * @param {Record<string, unknown>[]} rows
 * @param {string} todayET YYYY-MM-DD
 */
export function filterBdlRowsToTonightSlate(rows, todayET) {
  return filterBdlRowsForEtDay(rows, todayET);
}

/**
 * @param {string} dateYmd YYYYMMDD
 * @param {ReturnType<typeof mapBdlGameToSlateRow>[]} games
 */
export function buildNbaBdlSlateKvPayload(dateYmd, games) {
  const ymd = String(dateYmd || "").replace(/-/g, "").trim();
  return {
    dateYmd: ymd,
    source: "bdl",
    refreshedAtMs: Date.now(),
    slateGames: games || [],
  };
}

/**
 * @param {Record<string, unknown>|null|undefined} payload
 */
export function slateGamesFromBdlKvPayload(payload) {
  if (!payload || typeof payload !== "object") return [];
  if (Array.isArray(payload.slateGames)) return payload.slateGames;
  return [];
}

/**
 * Self-healing: fresh KV → return; else BDL live → write KV → return.
 * @param {string} dateYmd YYYYMMDD
 * @param {string} etDayYmd YYYY-MM-DD calendar day for this KV key
 * @param {string} bdlKey
 * @param {{ getDurableJson: (key: string) => Promise<unknown>, setDurableJson: (key: string, value: unknown, opts?: { ttlSeconds?: number }) => Promise<void> }} store
 */
export async function resolveNbaBdlPlayoffSlateForDateYmd(dateYmd, etDayYmd, bdlKey, store) {
  const ymd = String(dateYmd || "").replace(/-/g, "").trim();
  const etDayResolved = etDayYmd || getEtDateString();
  const dateIso =
    ymd.length === 8
      ? `${ymd.slice(0, 4)}-${ymd.slice(4, 6)}-${ymd.slice(6, 8)}`
      : etDayResolved;
  const key = nbaBdlSlateKvKey(ymd);

  let payload = null;
  try {
    payload = store?.getDurableJson ? await store.getDurableJson(key) : null;
  } catch {
    payload = null;
  }

  const cached = slateGamesFromBdlKvPayload(payload);
  if (isKvFresh(payload?.refreshedAtMs, REFRESH_MAX_AGE_MS) && cached.length) {
    return cached.filter((g) => isBdlEtDayPlayableSlateGame(g, etDayResolved));
  }

  let rows = [];
  try {
    rows = await fetchBdlGamesForDateIso(bdlKey, dateIso, { postseason: true });
  } catch (err) {
    console.warn(
      JSON.stringify({
        event: "nba_playoff_slate_bdl_fetch_failed",
        dateYmd: ymd,
        error: err?.message || String(err),
      }),
    );
    if (cached.length) {
      return cached.filter((g) => isBdlEtDayPlayableSlateGame(g, etDayResolved));
    }
    return [];
  }

  const slateGames = filterBdlRowsForEtDay(rows, etDayResolved);
  console.log(
    JSON.stringify({
      event: "nba_playoff_slate_bdl",
      dateYmd: ymd,
      dateIso,
      rawGameCount: rows.length,
      playableCount: slateGames.length,
      games: slateGames.map((g) => ({
        id: g.id,
        bdlGameId: g.bdlGameId,
        status: g.status,
        state: g.state,
        away: g.awayTeam?.abbr,
        home: g.homeTeam?.abbr,
        startTimeUtc: g.startTimeUtc,
      })),
    }),
  );

  const nextPayload = buildNbaBdlSlateKvPayload(ymd, slateGames);
  if (store?.setDurableJson) {
    try {
      await store.setDurableJson(key, nextPayload, { ttlSeconds: KV_TTL_SECONDS });
    } catch {
      /* KV optional locally */
    }
  }

  console.log(
    JSON.stringify({
      event: "nba_playoff_slate_bdl_self_heal",
      dateYmd: ymd,
      gameCount: slateGames.length,
      hadStaleCache: Boolean(payload?.refreshedAtMs),
    }),
  );

  return slateGames;
}

/**
 * Tonight's BDL playoff slate (single ET day).
 * @param {string} todayET YYYY-MM-DD
 * @param {{ getDurableJson: (key: string) => Promise<unknown>, setDurableJson?: (key: string, value: unknown, opts?: { ttlSeconds?: number }) => Promise<void> }} store
 * @param {string} bdlKey
 */
export async function readNbaBdlPlayoffSlateForToday(todayET, store, bdlKey) {
  const today = todayET || getEtDateString();
  const ymd = today.replace(/-/g, "");
  if (!bdlKey) return [];
  return resolveNbaBdlPlayoffSlateForDateYmd(ymd, today, bdlKey, store);
}

/**
 * 48h playoff window: today's ET slate first; if empty, tomorrow with slateDayLabel.
 * @param {string} todayET YYYY-MM-DD
 * @param {string} [tomorrowET] YYYY-MM-DD
 * @param {{ getDurableJson: (key: string) => Promise<unknown>, setDurableJson?: (key: string, value: unknown, opts?: { ttlSeconds?: number }) => Promise<void> }} store
 * @param {string} bdlKey
 * @returns {Promise<{ games: ReturnType<typeof mapBdlGameToSlateRow>[], window: 'tonight'|'tomorrow'|'empty', primaryEtDate: string }>}
 */
export async function readNbaBdlPlayoffSlateWindow(todayET, tomorrowET, store, bdlKey) {
  const today = todayET || getEtDateString();
  const tomorrow = tomorrowET || getTomorrowEtDateString(today);
  if (!bdlKey) {
    return { games: [], window: "empty", primaryEtDate: today };
  }

  const todayGames = await resolveNbaBdlPlayoffSlateForDateYmd(
    today.replace(/-/g, ""),
    today,
    bdlKey,
    store,
  );
  if (todayGames.length > 0) {
    return {
      games: todayGames.map((g) => ({ ...g, slateDayLabel: "Tonight" })),
      window: "tonight",
      primaryEtDate: today,
    };
  }

  const tomorrowGames = await resolveNbaBdlPlayoffSlateForDateYmd(
    tomorrow.replace(/-/g, ""),
    tomorrow,
    bdlKey,
    store,
  );
  return {
    games: tomorrowGames.map((g) => ({ ...g, slateDayLabel: "Tomorrow" })),
    window: tomorrowGames.length > 0 ? "tomorrow" : "empty",
    primaryEtDate: tomorrow,
  };
}

/**
 * @param {string} todayET YYYY-MM-DD
 * @param {string} [tomorrowET] YYYY-MM-DD
 * @param {{ getDurableJson: (key: string) => Promise<unknown>, setDurableJson?: (key: string, value: unknown, opts?: { ttlSeconds?: number }) => Promise<void> }} store
 * @param {string} bdlKey
 */
export async function readNbaPlayoffSlateGamesFromBdlKv(todayET, tomorrowET, store, bdlKey) {
  const window = await readNbaBdlPlayoffSlateWindow(todayET, tomorrowET, store, bdlKey);
  return window.games;
}
