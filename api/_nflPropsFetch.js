/**
 * Action Network NFL props + scoreboard fetch (no Odds API).
 */
import {
  NFL_PROPS_API_BASE,
  NFL_PROPS_BOOK_IDS_QUERY,
} from "../shared/nflPropsConstants.js";
import { parseActionNetworkNflGameProps } from "./_nflPropsParse.js";

const UA = "UnderReview/1.0 (+https://under-review.app)";

/**
 * @param {string} url
 */
async function fetchJson(url) {
  const res = await fetch(url, {
    cache: "no-store",
    headers: {
      Accept: "application/json",
      "User-Agent": UA,
    },
    signal: AbortSignal.timeout(30000),
  });
  if (!res.ok) {
    throw new Error(`Action Network HTTP ${res.status} for ${url}`);
  }
  return res.json();
}

/**
 * ET calendar date as YYYYMMDD.
 * @param {number | Date} [now]
 */
export function nflEtDateYmd(now = Date.now()) {
  return new Date(now).toLocaleDateString("en-CA", { timeZone: "America/New_York" }).replace(/-/g, "");
}

/**
 * @param {{ dateYmd?: string, week?: number | string, season?: number | string }} [opts]
 */
export async function fetchActionNetworkNflScoreboard(opts = {}) {
  const params = new URLSearchParams({
    bookIds: NFL_PROPS_BOOK_IDS_QUERY,
    periods: "event",
  });
  if (opts.week != null && String(opts.week).trim() !== "") {
    params.set("week", String(opts.week));
    if (opts.season != null) params.set("season", String(opts.season));
  } else {
    const ymd = String(opts.dateYmd || nflEtDateYmd()).replace(/-/g, "");
    params.set("date", ymd);
  }
  const url = `${NFL_PROPS_API_BASE}/scoreboard/nfl?${params.toString()}`;
  return fetchJson(url);
}

/**
 * @param {number | string} gameId
 */
export async function fetchActionNetworkNflGamePropsRaw(gameId) {
  const url = `${NFL_PROPS_API_BASE}/games/${gameId}/props?bookIds=${NFL_PROPS_BOOK_IDS_QUERY}`;
  return fetchJson(url);
}

/**
 * @param {number | string} gameId
 * @param {{ playersById?: Record<string, unknown> }} [opts]
 */
export async function fetchAndParseActionNetworkNflGameProps(gameId, opts = {}) {
  const gid = Number(gameId);
  if (!Number.isFinite(gid) || gid <= 0) {
    throw new Error("Invalid Action Network NFL gameId");
  }

  let playersById = opts.playersById || {};
  const raw = await fetchActionNetworkNflGamePropsRaw(gid);
  if (raw?.players && typeof raw.players === "object" && Object.keys(raw.players).length) {
    playersById = { ...playersById, ...raw.players };
  }

  const playerProps =
    raw?.player_props && typeof raw.player_props === "object" ? raw.player_props : {};
  const parsed = parseActionNetworkNflGameProps(playerProps, playersById, gid);

  return {
    ...parsed,
    scrapeMethod: "rest",
    providerGameId: gid,
  };
}
