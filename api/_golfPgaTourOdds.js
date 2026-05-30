import { getDurableJson, setDurableJson } from "./_durableStore.js";
import { getEnv } from "./_env.js";
import { getEtHour24At, getEtYmdAt, isGolfTournamentEtDay } from "../shared/golfOddsCachePolicy.js";
import {
  extractGolfTournamentIntentFromQuestion,
  slugifyGolfLabel,
} from "../shared/golfTournamentIntent.js";
import { decorateGolfOddsWithFreshness, mergeGolfOddsWithEspnField } from "./_golfOddsApi.js";

const PGA_TOUR_DATA_API_BASE = "https://data-api.pgatour.com";
const PGA_TOUR_GRAPHQL_ENDPOINT = "https://orchestrator.pgatour.com/graphql";
const PGA_TOUR_GRAPHQL_API_KEY = "da2-gsrx5bibzbb4njvhl7t37wqyl4";
const PGA_TOUR_ODDS_KV_TTL_SECONDS = 6 * 60 * 60;
const PGA_TOUR_ODDS_STALE_MS = 2 * 60 * 60 * 1000;
const PGA_TOUR_SCHEDULE_CACHE_MS = 30 * 60 * 1000;

const scheduleMemCache = new Map();
const oddsMemCache = new Map();

function normalizeTournamentId(value) {
  const id = String(value || "")
    .trim()
    .toUpperCase();
  return /^[A-Z]\d{7}$/.test(id) ? id : null;
}

function buildPgaTourOddsCacheKey(tournamentId) {
  return `golf_pgatour_odds_${tournamentId}_v1`;
}

export function parsePgaTourAmericanOdds(value) {
  const raw = String(value || "")
    .trim()
    .replace(/,/g, "");
  if (!raw) return null;
  const m = raw.match(/^([+-]?\d+)/);
  if (!m) return null;
  const n = Number(m[1]);
  return Number.isFinite(n) ? n : null;
}

function getEventYear(currentEvent) {
  const raw = currentEvent?.startDate || currentEvent?.date || currentEvent?.endDate;
  const fromDate = raw ? new Date(raw) : null;
  const year =
    fromDate && !Number.isNaN(fromDate.getTime())
      ? fromDate.getUTCFullYear()
      : new Date().getUTCFullYear();
  return String(year);
}

function tournamentLooksLikeRegularPgaTour(currentEvent) {
  const intent = extractGolfTournamentIntentFromQuestion(
    `${currentEvent?.name || ""} ${currentEvent?.shortName || ""}`
  );
  return !intent?.isMajor;
}

async function fetchJson(url) {
  const res = await fetch(url, {
    cache: "no-store",
    headers: {
      Accept: "application/json",
      "User-Agent": "UnderReview/1.0 (+https://under-review.app)",
    },
    signal: AbortSignal.timeout(12000),
  });
  if (!res.ok) throw new Error(`PGA Tour odds HTTP ${res.status} for ${url}`);
  return res.json();
}

async function fetchPgaTourSchedule(year, tourCode = "R") {
  const cacheKey = `${tourCode}:${year}`;
  const mem = scheduleMemCache.get(cacheKey);
  if (mem && Date.now() < mem.expiresAt) return mem.value;

  const query = `
    query UpcomingSchedule($tourCode: String!, $year: String) {
      upcomingSchedule(tourCode: $tourCode, year: $year) {
        id
        tournaments {
          id
          startDate
          tournamentName
          tournamentStatus
          display
          courseName
          city
          state
          country
        }
      }
    }
  `;
  const res = await fetch(PGA_TOUR_GRAPHQL_ENDPOINT, {
    method: "POST",
    cache: "no-store",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      "x-api-key": getEnv("PGA_TOUR_GRAPHQL_API_KEY") || PGA_TOUR_GRAPHQL_API_KEY,
      "User-Agent": "UnderReview/1.0 (+https://under-review.app)",
    },
    body: JSON.stringify({ query, variables: { tourCode, year } }),
    signal: AbortSignal.timeout(12000),
  });
  if (!res.ok) throw new Error(`PGA Tour schedule HTTP ${res.status}`);
  const body = await res.json();
  const tournaments = body?.data?.upcomingSchedule?.tournaments;
  if (!Array.isArray(tournaments)) throw new Error("PGA Tour schedule missing tournaments");
  scheduleMemCache.set(cacheKey, {
    value: tournaments,
    expiresAt: Date.now() + PGA_TOUR_SCHEDULE_CACHE_MS,
  });
  return tournaments;
}

function eventDateMatchesSchedule(currentEvent, scheduleRow) {
  const eventMs = Date.parse(String(currentEvent?.startDate || ""));
  const scheduleMs = Number(scheduleRow?.startDate);
  if (!Number.isFinite(eventMs) || !Number.isFinite(scheduleMs)) return false;
  return Math.abs(eventMs - scheduleMs) <= 36 * 60 * 60 * 1000;
}

export async function resolvePgaTourTournamentIdForEvent(currentEvent) {
  const direct = normalizeTournamentId(
    currentEvent?.pgaTourTournamentId ||
      currentEvent?.pgatourTournamentId ||
      currentEvent?.tournamentId ||
      currentEvent?.id
  );
  if (direct) return direct;
  if (!currentEvent || !tournamentLooksLikeRegularPgaTour(currentEvent)) return null;

  const year = getEventYear(currentEvent);
  const schedule = await fetchPgaTourSchedule(year);
  const eventName = slugifyGolfLabel(currentEvent.name || currentEvent.shortName || "");
  if (!eventName) return null;

  const byNameAndDate = schedule.find((row) => {
    const rowName = slugifyGolfLabel(row?.tournamentName || "");
    if (!rowName || rowName !== eventName) return false;
    return eventDateMatchesSchedule(currentEvent, row);
  });
  if (byNameAndDate?.id) return normalizeTournamentId(byNameAndDate.id);

  const byName = schedule.find((row) => slugifyGolfLabel(row?.tournamentName || "") === eventName);
  if (byName?.id) return normalizeTournamentId(byName.id);

  return null;
}

function flattenOddsRows(marketData, subMarketPredicate = () => true) {
  const rows = [];
  for (const subMarket of marketData?.subMarkets || []) {
    const subMarketName = String(subMarket?.subMarketName || "").trim();
    if (!subMarketPredicate(subMarketName)) continue;
    for (const group of subMarket?.oddsDataGroup || []) {
      for (const oddsRow of group?.oddsData || []) {
        for (const entry of oddsRow?.group || []) {
          const player = entry?.players?.[0];
          const name = String(player?.displayName || "").trim();
          const odds = parsePgaTourAmericanOdds(entry?.oddsValue);
          if (!name) continue;
          rows.push({
            player: name,
            odds,
            source: "pgatour_site",
            playerId: String(player?.playerId || entry?.entityId || "").trim() || null,
            optionId: entry?.optionId || null,
            market: marketData?.marketDisplayName || marketData?.market || null,
            subMarket: subMarketName || null,
          });
        }
      }
    }
  }
  return rows;
}

function dedupeOddsRows(rows) {
  const out = [];
  const seen = new Set();
  for (const row of rows || []) {
    const key = `${slugifyGolfLabel(row.player)}:${row.subMarket || ""}`;
    if (!row.player || seen.has(key)) continue;
    seen.add(key);
    out.push(row);
  }
  return out;
}

function pickFinishRows(finishMarket, label) {
  const exact = new RegExp(`^${label}$`, "i");
  const exactRows = flattenOddsRows(finishMarket, (name) => exact.test(name));
  if (exactRows.length) return dedupeOddsRows(exactRows);
  return dedupeOddsRows(
    flattenOddsRows(finishMarket, (name) => new RegExp(`^${label}\\b`, "i").test(name))
  );
}

export function parsePgaTourOddsPayload(tournamentId, markets, marketPayloads) {
  const marketByType = new Map((markets?.availableMarkets || []).map((m) => [m?.marketType, m]));
  const winMarket = marketPayloads.get("ODDS_TO_WIN");
  const finishMarket = marketPayloads.get("FINISH");
  const playerPropsMarket = marketPayloads.get("PLAYER_PROPS");

  const outrights = dedupeOddsRows(flattenOddsRows(winMarket)).sort((a, b) => {
    const ao = a.odds != null && Number.isFinite(a.odds) ? Number(a.odds) : 999999;
    const bo = b.odds != null && Number.isFinite(b.odds) ? Number(b.odds) : 999999;
    return ao - bo;
  });
  const topFinish = {
    top_5: pickFinishRows(finishMarket, "Top 5"),
    top_10: pickFinishRows(finishMarket, "Top 10"),
    top_20: pickFinishRows(finishMarket, "Top 20"),
  };
  const makeCutRows = flattenOddsRows(playerPropsMarket, (name) => /make.*cut/i.test(name));
  const makeCut = {};
  for (const row of makeCutRows) {
    if (row.player) makeCut[row.player] = row;
  }
  const hasPostedLines = outrights.some((o) => o.odds != null && Number.isFinite(Number(o.odds)));

  return {
    outrights,
    topFinish,
    makeCut,
    eventName: tournamentId,
    tournamentId,
    marketStatus: hasPostedLines ? "posted" : "field",
    linesUnavailable: !hasPostedLines,
    source: "pgatour_site",
    hasPostedLines,
    availableMarkets: (markets?.availableMarkets || []).map((m) => ({
      id: m?.id,
      name: m?.name,
      displayName: m?.displayName,
      marketType: m?.marketType,
      book: m?.book,
    })),
    marketIds: {
      winner: marketByType.get("ODDS_TO_WIN")?.id || null,
      finish: marketByType.get("FINISH")?.id || null,
      playerProps: marketByType.get("PLAYER_PROPS")?.id || null,
    },
  };
}

export async function scrapePgaTourOddsRest(tournamentId) {
  const tid = normalizeTournamentId(tournamentId);
  if (!tid) throw new Error("PGA Tour tournamentId is required");
  const markets = await fetchJson(
    `${PGA_TOUR_DATA_API_BASE}/odds/tournament/${encodeURIComponent(tid)}`
  );
  const marketPayloads = new Map();
  const wanted = new Set(["ODDS_TO_WIN", "FINISH", "PLAYER_PROPS"]);
  for (const market of markets?.availableMarkets || []) {
    if (!wanted.has(market?.marketType) || market?.id == null) continue;
    const payload = await fetchJson(
      `${PGA_TOUR_DATA_API_BASE}/odds/tournament/${encodeURIComponent(tid)}/${encodeURIComponent(market.id)}`
    );
    marketPayloads.set(market.marketType, payload);
  }
  const parsed = parsePgaTourOddsPayload(tid, markets, marketPayloads);
  return { ...parsed, scrapeMethod: "rest", providerTimestamp: Date.now() };
}

async function readCacheEntry(tournamentId) {
  const key = buildPgaTourOddsCacheKey(tournamentId);
  const mem = oddsMemCache.get(key);
  if (mem) return mem;
  return getDurableJson(key);
}

async function writeCacheEntry(tournamentId, entry) {
  const key = buildPgaTourOddsCacheKey(tournamentId);
  oddsMemCache.set(key, entry);
  try {
    await setDurableJson(key, entry, { ttlSeconds: PGA_TOUR_ODDS_KV_TTL_SECONDS });
  } catch {
    /* KV optional locally */
  }
}

function shouldRefreshPgaTourOddsCache(cached) {
  if (!cached?.fetchedAtMs) return true;
  return Date.now() - cached.fetchedAtMs >= PGA_TOUR_ODDS_STALE_MS;
}

export async function scrapeAndCachePgaTourOdds(tournamentId) {
  const tid = normalizeTournamentId(tournamentId);
  if (!tid) throw new Error("PGA Tour tournamentId is required");
  const nowMs = Date.now();
  const payload = await scrapePgaTourOddsRest(tid);
  const currentEvent = { startDate: new Date(nowMs).toISOString(), state: "in" };
  const todayEt = getEtYmdAt(nowMs);
  const entry = {
    payload,
    fetchedAtMs: nowMs,
    openingRefreshEtYmd:
      getEtHour24At(nowMs) >= 8 && isGolfTournamentEtDay(currentEvent, todayEt) ? todayEt : null,
  };
  await writeCacheEntry(tid, entry);
  console.log(
    JSON.stringify({
      event: "pgatour_odds_cached",
      tournamentId: tid,
      scrapeMethod: payload.scrapeMethod,
      outrights: payload.outrights?.length || 0,
      top5: payload.topFinish?.top_5?.length || 0,
      top10: payload.topFinish?.top_10?.length || 0,
      top20: payload.topFinish?.top_20?.length || 0,
      posted: payload.outrights?.filter((o) => o.odds != null).length || 0,
    })
  );
  return decorateGolfOddsWithFreshness(payload, nowMs);
}

export async function getPgaTourOddsForBoard(currentEvent) {
  const tournamentId = await resolvePgaTourTournamentIdForEvent(currentEvent);
  if (!tournamentId) return null;
  const cached = await readCacheEntry(tournamentId);
  if (cached?.payload && !shouldRefreshPgaTourOddsCache(cached)) {
    return decorateGolfOddsWithFreshness(cached.payload, cached.fetchedAtMs);
  }
  try {
    const live = await scrapeAndCachePgaTourOdds(tournamentId);
    console.log(
      JSON.stringify({
        event: "pgatour_odds_self_heal",
        tournamentId,
        hadCache: Boolean(cached?.payload),
        posted: live?.hasPostedLines,
        outrights: Array.isArray(live?.outrights) ? live.outrights.length : 0,
      })
    );
    return live;
  } catch (err) {
    console.warn(
      JSON.stringify({
        event: "pgatour_odds_self_heal_failed",
        tournamentId,
        error: err?.message || String(err),
      })
    );
    if (cached?.payload) return decorateGolfOddsWithFreshness(cached.payload, cached.fetchedAtMs);
    return null;
  }
}

export async function hydratePgaTourBoardOdds(board) {
  if (!board || typeof board !== "object") return board;
  const currentEvent = board.currentEvent;
  if (!currentEvent || !tournamentLooksLikeRegularPgaTour(currentEvent)) return board;
  const espnOdds =
    board.odds && typeof board.odds === "object"
      ? board.odds
      : { outrights: [], topFinish: {}, makeCut: {}, linesUnavailable: true };
  const siteOdds = await getPgaTourOddsForBoard(currentEvent);
  if (!siteOdds) return board;
  return {
    ...board,
    odds: mergeGolfOddsWithEspnField({ ...siteOdds, source: "pgatour_site" }, espnOdds),
    sourceMeta: {
      ...(board.sourceMeta || {}),
      odds: siteOdds.hasPostedLines ? "pgatour_site" : board.sourceMeta?.odds,
      oddsFetchedAt: siteOdds.fetchedAt,
      oddsStale: Boolean(siteOdds.freshness?.isStale),
      oddsScrapeMethod: siteOdds.scrapeMethod || null,
      pgaTourTournamentId: siteOdds.tournamentId || null,
    },
  };
}

export const PGA_TOUR_ODDS_REST_BASE = PGA_TOUR_DATA_API_BASE;
