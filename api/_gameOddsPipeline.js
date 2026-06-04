/**
 * Game spread ingestion: Odds API → scrapers → KV cache → web fallback.
 * Source failures are never exposed to users; stale KV is served silently.
 */

import { getEnv } from "./_env.js";
import { getDurableJson, setDurableJson } from "./_durableStore.js";
import { logOddsApiUsage } from "./_oddsApiUsageLog.js";
import { canonicalizeTeamAbbr } from "../shared/gameLineSpread.js";
import { normalizeTeamAbbr } from "../shared/nbaTeamAbbrev.js";
import {
  buildGameSpreadKey,
  buildLineMovementContext,
  normalizeSpreadFromOutcomes,
  spreadRecordForModel,
} from "../shared/gameLineSpread.js";
import {
  buildGameOddsKvKey,
  computeDueRefreshOffsets,
} from "../shared/gameOddsSchedule.js";
import {
  scrapeActionNetworkNbaSpread,
  scrapeEspnBetNbaSpread,
  scrapeEspnNbaSpread,
  scrapeTheScoreNbaSpread,
  scrapeWebFallbackNbaSpread,
} from "./_gameOddsScrapers.js";

const ODDS_BASE = "https://api.the-odds-api.com/v4";
const PREFERRED_BOOKS = ["draftkings", "fanduel", "betmgm", "williamhill_us", "pointsbetus"];
const KV_TTL_SECONDS = 14 * 24 * 60 * 60;

function pickBookmaker(bookmakers) {
  if (!Array.isArray(bookmakers) || !bookmakers.length) return null;
  for (const key of PREFERRED_BOOKS) {
    const hit = bookmakers.find((b) => b?.key === key);
    if (hit?.markets?.length) return hit;
  }
  return bookmakers.find((b) => Array.isArray(b?.markets) && b.markets.length) || null;
}

function gameFromOddsApiEvent(event) {
  const homeAbbr = canonicalizeTeamAbbr(normalizeTeamAbbr(event?.home_team));
  const awayAbbr = canonicalizeTeamAbbr(normalizeTeamAbbr(event?.away_team));
  if (!homeAbbr || !awayAbbr) return null;
  return {
    gameKey: buildGameSpreadKey(awayAbbr, homeAbbr),
    awayAbbr,
    homeAbbr,
    homeName: event?.home_team,
    awayName: event?.away_team,
    commenceTimeUtc: event?.commence_time || null,
    oddsEventId: event?.id || null,
  };
}

function totalsFromOddsApiEvent(event) {
  const meta = gameFromOddsApiEvent(event);
  if (!meta) return null;
  const book = pickBookmaker(event?.bookmakers);
  const market = book?.markets?.find((m) => m?.key === "totals");
  if (!market?.outcomes?.length) return null;

  const over = market.outcomes.find((o) => String(o?.name || "").toLowerCase() === "over");
  const point = over?.point ?? market.outcomes.find((o) => o?.point != null)?.point;
  const total = point != null && Number.isFinite(Number(point)) ? Number(point) : null;
  if (total == null) return null;

  return {
    ...meta,
    total,
    pace: "NEUTRAL",
    book: book?.key || null,
    capturedAt: new Date().toISOString(),
    source: "odds_api",
  };
}

function spreadFromOddsApiEvent(event) {
  const meta = gameFromOddsApiEvent(event);
  if (!meta) return null;
  const book = pickBookmaker(event?.bookmakers);
  const market = book?.markets?.find((m) => m?.key === "spreads");
  if (!market?.outcomes?.length) return null;
  const normalized = normalizeSpreadFromOutcomes({
    homeAbbr: meta.homeAbbr,
    awayAbbr: meta.awayAbbr,
    homeName: meta.homeName,
    awayName: meta.awayName,
    outcomes: market.outcomes,
  });
  if (!normalized) return null;
  return {
    ...meta,
    ...normalized,
    book: book?.key || null,
    capturedAt: new Date().toISOString(),
    source: "odds_api",
  };
}

/**
 * @param {string} oddsKey
 * @param {string} [sportKey]
 */
export async function fetchNbaTotalsFromOddsApi(oddsKey, sportKey = "basketball_nba") {
  if (!oddsKey) return { ok: false, byGameKey: new Map() };
  try {
    const url = `${ODDS_BASE}/sports/${sportKey}/odds/?apiKey=${oddsKey}&regions=us&markets=totals&oddsFormat=american`;
    const res = await fetch(url);
    logOddsApiUsage({ label: "gameOdds.fetchNbaTotalsFromOddsApi", url, response: res });
    if (!res.ok) return { ok: false, byGameKey: new Map() };
    const data = await res.json();
    if (!Array.isArray(data)) return { ok: false, byGameKey: new Map() };

    const byGameKey = new Map();
    for (const event of data) {
      const row = totalsFromOddsApiEvent(event);
      if (row?.gameKey && row.total != null) byGameKey.set(row.gameKey, row);
    }
    return { ok: true, byGameKey };
  } catch {
    return { ok: false, byGameKey: new Map() };
  }
}

export async function fetchNbaSpreadsFromOddsApi(oddsKey, sportKey = "basketball_nba") {
  if (!oddsKey) return { ok: false, byGameKey: new Map() };
  try {
    const url = `${ODDS_BASE}/sports/${sportKey}/odds/?apiKey=${oddsKey}&regions=us&markets=spreads&oddsFormat=american`;
    const res = await fetch(url);
    logOddsApiUsage({ label: "gameOdds.fetchNbaSpreadsFromOddsApi", url, response: res });
    if (!res.ok) return { ok: false, byGameKey: new Map() };
    const data = await res.json();
    if (!Array.isArray(data)) return { ok: false, byGameKey: new Map() };

    const byGameKey = new Map();
    for (const event of data) {
      const row = spreadFromOddsApiEvent(event);
      if (row?.gameKey) byGameKey.set(row.gameKey, row);
    }
    return { ok: true, byGameKey };
  } catch {
    return { ok: false, byGameKey: new Map() };
  }
}

function slateGameMeta(game) {
  const homeAbbr = canonicalizeTeamAbbr(game?.homeTeam?.abbr);
  const awayAbbr = canonicalizeTeamAbbr(game?.awayTeam?.abbr);
  if (!homeAbbr || !awayAbbr) return null;
  return {
    gameKey: buildGameSpreadKey(awayAbbr, homeAbbr),
    awayAbbr,
    homeAbbr,
    homeName: game?.homeTeam?.name,
    awayName: game?.awayTeam?.name,
    commenceTimeUtc: game?.startTimeUtc || game?.commenceTime || null,
    espnEventId: game?.id || null,
  };
}

async function scrapeSpreadForGame(meta) {
  const ctx = {
    homeAbbr: meta.homeAbbr,
    awayAbbr: meta.awayAbbr,
    homeName: meta.homeName,
    awayName: meta.awayName,
    espnEventId: meta.espnEventId,
  };

  const chain = [
    () => scrapeEspnNbaSpread(ctx),
    () => scrapeTheScoreNbaSpread(ctx),
    () => scrapeEspnBetNbaSpread(ctx),
    () => scrapeActionNetworkNbaSpread(ctx),
  ];

  for (const fn of chain) {
    try {
      const hit = await fn();
      if (hit?.displayLine) {
        return {
          ...meta,
          ...hit,
          capturedAt: new Date().toISOString(),
        };
      }
    } catch {
      /* silent */
    }
  }
  return null;
}

function mergeKvRecord(existing, freshLine, offsetHours = null) {
  const prev = existing && typeof existing === "object" ? existing : {};
  const snapshots = Array.isArray(prev.snapshots) ? [...prev.snapshots] : [];
  const capturedAt = freshLine.capturedAt || new Date().toISOString();

  const snap = {
    offsetHours: offsetHours ?? null,
    capturedAt,
    displayLine: freshLine.displayLine,
    favoriteAbbr: freshLine.favoriteAbbr,
    spreadPoint: freshLine.spreadPoint,
    underdogAbbr: freshLine.underdogAbbr,
  };

  if (offsetHours != null) {
    const idx = snapshots.findIndex((s) => s.offsetHours === offsetHours);
    if (idx >= 0) snapshots[idx] = snap;
    else snapshots.push(snap);
    snapshots.sort((a, b) => (Number(a.offsetHours) || 0) - (Number(b.offsetHours) || 0));
  }

  const current = {
    displayLine: freshLine.displayLine,
    favoriteAbbr: freshLine.favoriteAbbr,
    spreadPoint: freshLine.spreadPoint,
    underdogAbbr: freshLine.underdogAbbr,
    capturedAt,
    confirmedAt: capturedAt,
  };

  const movement = buildLineMovementContext(snapshots, current);

  return {
    ...prev,
    gameKey: freshLine.gameKey || prev.gameKey,
    awayAbbr: freshLine.awayAbbr || prev.awayAbbr,
    homeAbbr: freshLine.homeAbbr || prev.homeAbbr,
    commenceTimeUtc: freshLine.commenceTimeUtc || prev.commenceTimeUtc,
    snapshots,
    current,
    lineMovement: movement,
    lineUnavailable: false,
    updatedAt: capturedAt,
  };
}

async function loadKvRecord(sport, meta) {
  const key = buildGameOddsKvKey(sport, meta.gameKey, meta.commenceTimeUtc);
  return (await getDurableJson(key)) || null;
}

async function saveKvRecord(sport, meta, record) {
  const key = buildGameOddsKvKey(sport, meta.gameKey, meta.commenceTimeUtc);
  await setDurableJson(key, record, KV_TTL_SECONDS);
}

/**
 * Resolve spread for one game using the full waterfall.
 */
export async function resolveGameSpreadForSlateGame(game, oddsKey, options = {}) {
  const meta = slateGameMeta(game);
  if (!meta) return { lineUnavailable: true };

  const sport = options.sport || "nba";
  let line = null;
  let servedFromCache = false;

  const api = await fetchNbaSpreadsFromOddsApi(oddsKey);
  if (api.ok) {
    line = api.byGameKey.get(meta.gameKey) || null;
  }

  if (!line?.displayLine) {
    line = await scrapeSpreadForGame(meta);
  }

  if (!line?.displayLine) {
    const cached = await loadKvRecord(sport, meta);
    if (cached?.current?.displayLine) {
      servedFromCache = true;
      return spreadRecordForModel({
        ...cached,
        _staleness: true,
      });
    }
    line = await scrapeWebFallbackNbaSpread(game);
  }

  if (!line?.displayLine) {
    return { gameKey: meta.gameKey, lineUnavailable: true };
  }

  const merged = mergeKvRecord(await loadKvRecord(sport, meta), { ...meta, ...line }, options.offsetHours);
  merged._staleness = servedFromCache;
  await saveKvRecord(sport, meta, merged);

  return spreadRecordForModel(merged);
}

/**
 * Build spreads map for NBA board / UR Take (`spreads` keyed by "AWY @ HOM").
 */
export async function hydrateNbaGameSpreads(todaysGames = [], oddsKey = null) {
  const key = oddsKey || getEnv("ODDS_API_KEY");
  const games = Array.isArray(todaysGames) ? todaysGames : [];
  const api = await fetchNbaSpreadsFromOddsApi(key);
  const spreads = {};
  const movementByGame = {};

  await Promise.all(
    games.map(async (game) => {
      const meta = slateGameMeta(game);
      if (!meta) return;

      let line = api.ok ? api.byGameKey.get(meta.gameKey) : null;
      if (!line?.displayLine) {
        line = await scrapeSpreadForGame(meta);
      }

      if (!line?.displayLine) {
        const cached = await loadKvRecord("nba", meta);
        if (cached?.current?.displayLine) {
          spreads[meta.gameKey] = spreadRecordForModel({ ...cached, _staleness: true });
          movementByGame[meta.gameKey] = cached.lineMovement || null;
          return;
        }
        line = await scrapeWebFallbackNbaSpread(game);
      }

      if (!line?.displayLine) {
        spreads[meta.gameKey] = { gameKey: meta.gameKey, lineUnavailable: true };
        return;
      }

      const merged = mergeKvRecord(await loadKvRecord("nba", meta), { ...meta, ...line });
      await saveKvRecord("nba", meta, merged);
      spreads[meta.gameKey] = spreadRecordForModel(merged);
      movementByGame[meta.gameKey] = merged.lineMovement || null;
    }),
  );

  return { spreads, movementByGame };
}

/**
 * Build gameTotals map keyed by "AWY @ HOM" for board / UR Take.
 * @param {Array<Record<string, unknown>>} todaysGames
 * @param {string | null} [oddsKey]
 */
export async function buildGameTotalsFromSlate(todaysGames = [], oddsKey = null) {
  const key = oddsKey || getEnv("ODDS_API_KEY");
  const games = Array.isArray(todaysGames) ? todaysGames : [];
  const api = await fetchNbaTotalsFromOddsApi(key);
  /** @type {Record<string, { total: number | null, pace: string, source?: string }>} */
  const totals = {};

  for (const game of games) {
    const meta = slateGameMeta(game);
    if (!meta) continue;
    const label = `${meta.awayAbbr} @ ${meta.homeAbbr}`;
    const row = api.ok ? api.byGameKey.get(meta.gameKey) : null;
    if (row?.total != null) {
      totals[label] = {
        total: row.total,
        pace: row.pace || "NEUTRAL",
        source: row.source || "odds_api",
      };
    } else {
      totals[label] = { total: null, pace: "NEUTRAL" };
    }
  }

  return totals;
}

/**
 * Cron: refresh snapshots for games due at 12/6/3/1 hour offsets.
 */
export async function refreshDueNbaGameOddsSnapshots(todaysGames = [], oddsKey = null) {
  const key = oddsKey || getEnv("ODDS_API_KEY");
  const now = new Date();
  const results = [];

  for (const game of Array.isArray(todaysGames) ? todaysGames : []) {
    const meta = slateGameMeta(game);
    if (!meta?.commenceTimeUtc) continue;

    const existing = await loadKvRecord("nba", meta);
    const captured = (existing?.snapshots || []).map((s) => s.offsetHours).filter(Number.isFinite);
    const dueOffsets = computeDueRefreshOffsets(meta.commenceTimeUtc, captured, now);
    if (!dueOffsets.length) continue;

    for (const offsetHours of dueOffsets) {
      const resolved = await resolveGameSpreadForSlateGame(game, key, {
        sport: "nba",
        offsetHours,
      });
      results.push({
        gameKey: meta.gameKey,
        offsetHours,
        displayLine: resolved?.current?.displayLine || resolved?.displayLine || null,
        lineUnavailable: Boolean(resolved?.lineUnavailable),
      });
    }
  }

  return { refreshed: results.length, results };
}

/**
 * User-facing line string for spread questions — never mentions source failures.
 */
export function formatSpreadLineForUser(spreadRecord) {
  if (!spreadRecord || spreadRecord.lineUnavailable) return "line unavailable";
  return spreadRecord?.current?.displayLine || spreadRecord?.displayLine || "line unavailable";
}
