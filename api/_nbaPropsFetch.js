import {
  NBA_PROPS_API_BASE,
  NBA_PROPS_BOOK_IDS_QUERY,
  NBA_PROPS_CORE_PICK_TYPES,
} from "../shared/nbaPropsConstants.js";
import { parseActionNetworkGameProps } from "./_nbaPropsParse.js";

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
 * @param {number | string} gameId
 * @param {string} dateYmd YYYYMMDD
 */
export async function fetchActionNetworkPlayerDirectory(gameId, dateYmd) {
  const url = `${NBA_PROPS_API_BASE}/scoreboard/nba/markets?customPickTypes=${NBA_PROPS_CORE_PICK_TYPES}&date=${dateYmd}&bookIds=${NBA_PROPS_BOOK_IDS_QUERY}`;
  const data = await fetchJson(url);
  const players = data?.players && typeof data.players === "object" ? data.players : {};
  const games = Array.isArray(data?.games) ? data.games : [];
  const gid = Number(gameId);
  const game = games.find((g) => Number(g?.id) === gid);

  /** @type {Record<string, unknown>} */
  const playersById = { ...players };

  if (game) {
    for (const marketRows of Object.values(data?.markets || {})) {
      if (!marketRows || typeof marketRows !== "object") continue;
      const event = marketRows.event;
      if (!event || typeof event !== "object") continue;
      for (const rows of Object.values(event)) {
        if (!Array.isArray(rows)) continue;
        for (const row of rows) {
          if (Number(row?.event_id) !== gid) continue;
          const pid = row?.player_id;
          if (pid == null) continue;
          if (!playersById[String(pid)]) {
            playersById[String(pid)] = { id: pid, team_id: row.team_id ?? null };
          }
        }
      }
    }
  }

  return { playersById, gameMeta: game || null };
}

/**
 * @param {number | string} gameId
 */
export async function fetchActionNetworkGamePropsRaw(gameId) {
  const url = `${NBA_PROPS_API_BASE}/games/${gameId}/props?bookIds=${NBA_PROPS_BOOK_IDS_QUERY}`;
  return fetchJson(url);
}

/**
 * @param {number | string} gameId
 * @param {{ dateYmd?: string, playersById?: Record<string, unknown> }} [opts]
 */
export async function fetchAndParseActionNetworkGameProps(gameId, opts = {}) {
  const gid = Number(gameId);
  if (!Number.isFinite(gid) || gid <= 0) {
    throw new Error("Invalid Action Network gameId");
  }

  let playersById = opts.playersById || {};
  if (!Object.keys(playersById).length && opts.dateYmd) {
    const dir = await fetchActionNetworkPlayerDirectory(gid, opts.dateYmd);
    playersById = dir.playersById;
  }

  const raw = await fetchActionNetworkGamePropsRaw(gid);
  if (raw?.players && typeof raw.players === "object" && Object.keys(raw.players).length) {
    playersById = { ...playersById, ...raw.players };
  }

  const playerProps = raw?.player_props && typeof raw.player_props === "object" ? raw.player_props : {};
  const parsed = parseActionNetworkGameProps(playerProps, playersById, gid);

  return {
    ...parsed,
    scrapeMethod: "rest",
    providerGameId: gid,
  };
}
