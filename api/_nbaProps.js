import { getDurableJson, setDurableJson } from "./_durableStore.js";
import { nbaPropsCacheKey } from "../shared/nbaPropsConstants.js";
import {
  buildNbaPropsFreshness,
  nbaPropsCacheTtlMs,
  shouldRefreshNbaPropsCache,
} from "../shared/nbaPropsCachePolicy.js";
import {
  mergeNbaPropsIntoPlayerStats,
  nbaPropsBookLabel,
} from "../shared/nbaPropsBoardDisplay.js";
import { NBA_UI_PLAYER_CHIPS } from "../shared/nbaUiPlayerChips.js";
import { fetchAndParseActionNetworkGameProps } from "./_nbaPropsFetch.js";
import {
  getDefaultNbaPropsScrapeTarget,
  getNbaPlayoffGameId,
  getNbaPlayoffGameIdByGameId,
  resolveActionNetworkGameIdForBoardGame,
  resolveNbaPlayoffGameIdFromScoreboard,
} from "./_nbaPropsGameId.js";

const memCache = new Map();

/**
 * @param {number | string} gameId
 */
async function readCacheEntry(gameId) {
  const key = nbaPropsCacheKey(gameId);
  const mem = memCache.get(key);
  if (mem) return mem;
  return getDurableJson(key);
}

/**
 * @param {number | string} gameId
 * @param {{ payload: Record<string, unknown>, fetchedAtMs: number, tipoffMs?: number | null }} entry
 */
async function writeCacheEntry(gameId, entry) {
  const key = nbaPropsCacheKey(gameId);
  memCache.set(key, entry);
  const ttlSeconds = Math.ceil(
    nbaPropsCacheTtlMs(entry.fetchedAtMs, entry.tipoffMs ?? null) / 1000,
  );
  try {
    await setDurableJson(key, entry, { ttlSeconds });
  } catch {
    /* KV optional locally */
  }
}

/**
 * @param {Record<string, unknown>} payload
 * @param {number} fetchedAtMs
 */
export function decorateNbaPropsWithFreshness(payload, fetchedAtMs) {
  const freshness = buildNbaPropsFreshness(fetchedAtMs);
  return {
    ...payload,
    fetchedAtMs,
    fetchedAt: freshness.fetchedAt,
    freshness,
  };
}

/**
 * Resolve game id + tipoff for scrape target.
 * @param {{ gameId?: number | string, homeTeam?: string, awayTeam?: string, date?: string }} [opts]
 */
export async function resolveNbaPropsScrapeTarget(opts = {}) {
  if (opts.gameId != null && String(opts.gameId).trim()) {
    const gameId = Number(opts.gameId);
    const fromHardcode =
      getNbaPlayoffGameIdByGameId(gameId) ||
      getNbaPlayoffGameId(opts.homeTeam, opts.awayTeam, opts.date);
    return {
      gameId,
      tipoffMs: fromHardcode?.tipoffMs ?? null,
      dateYmd: fromHardcode?.dateYmd || null,
      source: "query_gameId",
    };
  }

  const fromQuery = getNbaPlayoffGameId(opts.homeTeam, opts.awayTeam, opts.date);
  if (fromQuery) return { ...fromQuery, source: fromQuery.source };

  const dynamic = await resolveNbaPlayoffGameIdFromScoreboard(
    opts.homeTeam,
    opts.awayTeam,
    opts.date,
  );
  if (dynamic) return dynamic;

  const fallback = getDefaultNbaPropsScrapeTarget();
  if (fallback) return fallback;

  throw new Error("No NBA props scrape target resolved");
}

/**
 * Cron / manual refresh — REST only (no Puppeteer).
 * @param {number | string} [gameId]
 * @param {{ homeTeam?: string, awayTeam?: string, date?: string }} [opts]
 */
export async function scrapeAndCacheNbaProps(gameId, opts = {}) {
  const target = await resolveNbaPropsScrapeTarget({
    gameId,
    homeTeam: opts.homeTeam,
    awayTeam: opts.awayTeam,
    date: opts.date,
  });

  const nowMs = Date.now();
  const payload = await fetchAndParseActionNetworkGameProps(target.gameId, {
    dateYmd: target.dateYmd || undefined,
  });

  const entry = {
    payload: { ...payload, scrapeMethod: payload.scrapeMethod || "rest" },
    fetchedAtMs: nowMs,
    tipoffMs: target.tipoffMs ?? null,
  };

  await writeCacheEntry(target.gameId, entry);

  console.log(
    JSON.stringify({
      event: "nba_props_cached",
      gameId: target.gameId,
      scrapeMethod: payload.scrapeMethod,
      playerCount: payload.playerCount,
      posted: payload.hasPostedLines,
      tipoffMs: target.tipoffMs,
    }),
  );

  return decorateNbaPropsWithFreshness(entry.payload, nowMs);
}

/**
 * Read path — KV only, never scrapes.
 * @param {number | string} gameId
 */
export async function getNbaPropsForBoard(gameId) {
  const gid = Number(gameId);
  if (!Number.isFinite(gid) || gid <= 0) return null;

  const nowMs = Date.now();
  const cached = await readCacheEntry(gid);
  if (!cached?.payload) return null;

  if (shouldRefreshNbaPropsCache(cached, nowMs)) {
    console.log(
      JSON.stringify({
        event: "nba_props_stale_cache",
        gameId: gid,
        ageMinutes: Math.round((nowMs - cached.fetchedAtMs) / 60000),
        note: "awaiting cron refresh",
      }),
    );
  }

  return decorateNbaPropsWithFreshness(cached.payload, cached.fetchedAtMs);
}

/**
 * @param {Record<string, unknown>} propsOdds
 * @param {number} [maxPlayers]
 */
export function slimNbaPropsOddsForWire(propsOdds, maxPlayers = 48) {
  if (!propsOdds || typeof propsOdds !== "object") return propsOdds;
  const players = Array.isArray(propsOdds.players) ? propsOdds.players : [];
  return {
    gameId: propsOdds.gameId,
    source: propsOdds.source,
    scrapeMethod: propsOdds.scrapeMethod,
    hasPostedLines: propsOdds.hasPostedLines,
    playerCount: propsOdds.playerCount,
    fetchedAt: propsOdds.fetchedAt,
    fetchedAtMs: propsOdds.fetchedAtMs,
    freshness: propsOdds.freshness,
    players: players.slice(0, maxPlayers),
  };
}

/**
 * @param {number | string} gameId
 */
async function hydrateNbaGamePropsForBoard(gameId) {
  const siteProps = await getNbaPropsForBoard(gameId);
  if (!siteProps) return null;
  return slimNbaPropsOddsForWire(siteProps);
}

/**
 * Read path — attach cached Action Network props to board (never scrapes on user request).
 * @param {Record<string, unknown>} board
 */
export async function hydrateNbaPropsOdds(board) {
  if (!board || typeof board !== "object") return board;

  const games = Array.isArray(board.todaysGames) ? board.todaysGames : [];
  /** @type {Record<string, Record<string, unknown>>} */
  const propsOddsByGameId = {};
  let primaryProps = null;
  let primaryGameId = null;

  const seen = new Set();
  for (const game of games) {
    const gid = resolveActionNetworkGameIdForBoardGame(game);
    if (gid == null || seen.has(gid)) continue;
    seen.add(gid);
    const hydrated = await hydrateNbaGamePropsForBoard(gid);
    if (!hydrated) continue;
    propsOddsByGameId[String(gid)] = hydrated;
    if (!primaryProps) {
      primaryProps = hydrated;
      primaryGameId = gid;
    }
  }

  if (!primaryProps) {
    const fallback = getNbaPlayoffGameId("OKC", "SAS", "20260520");
    if (fallback?.gameId) {
      const hydrated = await hydrateNbaGamePropsForBoard(fallback.gameId);
      if (hydrated) {
        primaryProps = hydrated;
        primaryGameId = fallback.gameId;
        propsOddsByGameId[String(fallback.gameId)] = hydrated;
      }
    }
  }

  if (!primaryProps) return board;

  const firstWithLine = (primaryProps.players || []).find((p) => p?.props?.points?.over || p?.props?.points?.under);
  const primaryBookId =
    firstWithLine?.props?.points?.over?.bookId ??
    firstWithLine?.props?.points?.under?.bookId ??
    null;
  primaryProps = {
    ...primaryProps,
    primaryBookId,
    primaryBookLabel:
      primaryBookId != null ? nbaPropsBookLabel(primaryBookId) : "DraftKings",
  };

  const todaysGames = games.map((g) => {
    const gid = resolveActionNetworkGameIdForBoardGame(g);
    if (gid == null) return g;
    return { ...g, actionNetworkGameId: gid };
  });

  const playerStats = mergeNbaPropsIntoPlayerStats(board.playerStats, primaryProps, {
    chips: NBA_UI_PLAYER_CHIPS,
  });

  const propsOddsStale = Boolean(primaryProps.freshness?.isStale);

  return {
    ...board,
    todaysGames,
    playerStats,
    propsOdds: primaryProps,
    propsOddsByGameId,
    propsOddsStale,
    sourceMeta: {
      ...(board.sourceMeta || {}),
      propsOdds: primaryProps.hasPostedLines ? "action_network" : board.sourceMeta?.propsOdds,
      propsOddsFetchedAt: primaryProps.fetchedAt,
      propsOddsStale,
      propsOddsScrapeMethod: primaryProps.scrapeMethod || "rest",
      propsOddsGameId: primaryGameId,
    },
  };
}

/**
 * @param {Record<string, unknown> | null | undefined} propsOdds
 */
export function buildNbaPropsFreshnessPromptBlock(propsOdds) {
  const fresh = propsOdds?.freshness;
  if (!fresh?.isStale && !fresh?.staleWarning) {
    if (propsOdds?.fetchedAt) {
      return `\nODDS FRESHNESS: Posted NBA prop lines fetched at ${propsOdds.fetchedAt} (${fresh?.ageMinutes ?? "?"} min ago). Cite only prices listed under propsOdds.players[].props (points/rebounds/assists) and their books arrays.\n`;
    }
    return "";
  }
  return `\nODDS FRESHNESS (mandatory):\n${fresh.staleWarning}\nFetched at: ${fresh.fetchedAt || propsOdds.fetchedAt || "unknown"}.\n`;
}
