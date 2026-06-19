/**
 * World Cup per-event player props — DK/FD/BetMGM match pages → KV (no Odds API).
 */

import { getDurableJson, setDurableJson } from "./_durableStore.js";
import {
  fetchBookPageHtmlForScrape,
  parseMatchPlayerPropRowsFromHtml,
  parseMatchPlayerPropRowsFromJson,
} from "./_wcBookScrapeCommon.js";
import {
  delayBetweenWcBookScrapes,
  listEnabledWcMatchPlayerPropBooks,
  listWcMatchPlayerPropsScrapeUrls,
} from "../shared/wcBookScrapePolicy.js";
import { runWcBookScrapeWithBackoff } from "../shared/wcBookScrapeRunner.js";
import {
  WC_MATCH_PLAYER_PROPS_KV_KEY,
  WC_MATCH_PLAYER_PROPS_TTL_SECONDS,
} from "../shared/wc2026PlayerConstants.js";
import {
  attachMatchPlayerPropsFreshness,
  collapseMatchPlayerPropRowsForDisplay,
  createEmptyMatchPlayerPropMarkets,
  hasMatchPlayerPropRows,
  matchPlayerPropRowsFromEvent,
  matchPlayerPropsForEvent,
  mergeMatchPlayerPropMarketMaps,
  readFreshMatchPlayerPropsForEvent,
  WC_MATCH_PLAYER_PROP_MARKET_KEYS,
} from "../shared/wcMatchPlayerProps.js";
import { normalizeWcPlayerName } from "../shared/wcPlayerRegistry.js";
import { filterMatchPlayerPropScrapeRows } from "../shared/wcMatchPlayerPropRowGuard.js";
import { WC_MATCH_PLAYER_PROPS_SEED_BY_EVENT } from "../src/data/wc2026MatchPlayerPropsSeed.js";
import {
  isWcBdlSource,
  isWcGoatPrimaryEnabled,
  shouldUseWcBookScrapeForPlayerMarkets,
  wcGoatMatchPlayerPropsNeedsLiveRefresh,
} from "../shared/wcBdlPolicy.js";
import { readWcMatchesFromKv } from "./_wcData.js";
import { resolveBdlMatchIdForEvent, scrapeAndCacheWcBdlMatchPlayerProps } from "./_wcBdlData.js";

const MIN_ANYTIME_ROWS = 3;
const MIN_ANYTIME_ROWS_PER_BOOK = 2;

/**
 * @param {string | number} eventId
 */
async function readMatchMetaFromKv(eventId) {
  const kv = await readWcMatchesFromKv(Number.MAX_SAFE_INTEGER);
  const match = (kv?.matches || []).find((m) => String(m?.id) === String(eventId));
  if (!match) return null;
  return {
    homeTeam: match.homeTeam || null,
    awayTeam: match.awayTeam || null,
    bdlMatchId: match.bdlMatchId ?? null,
    status: match.status || null,
    date: match.date || null,
  };
}

/**
 * GOAT: live BDL scrape when KV is empty, stale (>5m), or fixture is in progress.
 * @param {string | number} eventId
 * @param {{ homeTeam?: string, awayTeam?: string, bdlMatchId?: number, status?: string, date?: string }} [meta]
 * @param {number} [nowMs]
 */
export async function refreshWcGoatMatchPlayerPropsIfNeeded(eventId, meta = {}, nowMs = Date.now()) {
  const id = String(eventId || "").trim();
  if (!id) return null;
  if (!isWcGoatPrimaryEnabled()) {
    return readWcMatchPlayerPropsForEvent(id, nowMs);
  }
  const forceFresh = meta.forceFresh === true;
  const cached = forceFresh ? null : await readWcMatchPlayerPropsForEvent(id, nowMs);
  const needsShotsRefresh =
    meta.requireShotsRows === true &&
    cached &&
    hasMatchPlayerPropRows(cached) &&
    matchPlayerPropRowsFromEvent(cached, "player_shots_ou", 1).length === 0 &&
    matchPlayerPropRowsFromEvent(cached, "player_shots_each_half", 1).length === 0;
  if (
    !forceFresh &&
    !needsShotsRefresh &&
    !wcGoatMatchPlayerPropsNeedsLiveRefresh(cached, {
      matchStatus: meta.status,
      nowMs,
    })
  ) {
    return cached;
  }
  const result = await ensureWcBdlMatchPlayerPropsForEvent(id, meta);
  if (result && hasMatchPlayerPropRows(result)) {
    console.log(
      JSON.stringify({
        event: "wc_goat_match_props_refreshed",
        eventId: id,
        forceFresh,
        storedPropRows: WC_MATCH_PLAYER_PROP_MARKET_KEYS.reduce(
          (n, key) => n + (result.markets?.[key]?.length || 0),
          0,
        ),
        anytimeCount: (result.markets?.anytime_scorer || []).length,
      }),
    );
  }
  return result || cached;
}

/**
 * Live BDL fetch → KV for one event (GOAT primary).
 * @param {string | number} eventId
 * @param {{ homeTeam?: string, awayTeam?: string, bdlMatchId?: number }} [meta]
 */
export async function ensureWcBdlMatchPlayerPropsForEvent(eventId, meta = {}) {
  const id = String(eventId);
  const merged = { ...meta };
  if (!merged.homeTeam || !merged.awayTeam) {
    const fromKv = await readMatchMetaFromKv(id);
    if (fromKv) {
      merged.homeTeam = merged.homeTeam || fromKv.homeTeam;
      merged.awayTeam = merged.awayTeam || fromKv.awayTeam;
      merged.bdlMatchId = merged.bdlMatchId ?? fromKv.bdlMatchId;
      merged.date = merged.date || fromKv.date;
      merged.status = merged.status || fromKv.status;
    }
  }

  const bdlMatchId = await resolveBdlMatchIdForEvent(id, merged);
  if (bdlMatchId == null) return null;

  const cached = await scrapeAndCacheWcBdlMatchPlayerProps(bdlMatchId, id, merged);
  if (cached.ok) {
    return readWcMatchPlayerPropsForEvent(id);
  }

  const existing = await readWcMatchPlayerPropsForEvent(id);
  if (existing && hasMatchPlayerPropRows(existing)) {
    return existing;
  }
  return null;
}

/**
 * @param {Record<string, unknown> | null | undefined} eventPayload
 */
function filterMatchPlayerPropMarketsForResponse(eventPayload) {
  const markets =
    eventPayload?.markets && typeof eventPayload.markets === "object" ? eventPayload.markets : {};
  return Object.fromEntries(
    Object.entries(markets).map(([key, rows]) => [
      key,
      collapseMatchPlayerPropRowsForDisplay(
        filterMatchPlayerPropScrapeRows(Array.isArray(rows) ? rows : []),
        key,
      ),
    ]),
  );
}

/**
 * @param {Record<string, Array<Record<string, unknown>>>} markets
 * @param {string[]} booksUsed
 */
function isSufficientMatchProps(markets, booksUsed) {
  const anytime = (markets.anytime_scorer || []).length;
  if (anytime >= MIN_ANYTIME_ROWS) return true;
  if (anytime >= 2 && booksUsed.length >= 2) return true;
  const totalRows = WC_MATCH_PLAYER_PROP_MARKET_KEYS.reduce(
    (n, key) => n + (markets[key]?.length || 0),
    0,
  );
  return totalRows >= 5 && booksUsed.length >= 1;
}

/**
 * @param {string} bookKey
 * @param {{ eventId: string, homeTeam?: string, awayTeam?: string }} meta
 */
export async function scrapeMatchPlayerPropsForBook(bookKey, meta, bookIndex = 0) {
  const { getDurableJson } = await import("./_durableStore.js");
  const { resolveWcBookEventId, learnWcBookEventIdsFromHtml, WC_BOOK_EVENT_MAP_KV_KEY } =
    await import("../shared/wcBookEventIdMap.js");
  const mapRoot = await getDurableJson(WC_BOOK_EVENT_MAP_KV_KEY);
  const bookEventId = resolveWcBookEventId(meta.eventId, bookKey, mapRoot);
  const metaWithBook = {
    ...meta,
    eventId: bookEventId || meta.eventId,
  };
  const urls = listWcMatchPlayerPropsScrapeUrls(bookKey, metaWithBook);
  if (!urls.length) {
    return { book: bookKey, ok: false, markets: {}, error: "missing_url" };
  }

  const filter = { homeTeam: meta.homeTeam, awayTeam: meta.awayTeam };

  return runWcBookScrapeWithBackoff({
    market: "match_props",
    bookKey,
    bookIndex,
    scrapeOnce: async () => {
      let markets = createEmptyMatchPlayerPropMarkets();
      let lastError = "parse_empty";

      for (const url of urls) {
        const fetched = await fetchBookPageHtmlForScrape(url, { bookKey });
        if (!fetched.ok || !fetched.html) {
          lastError = fetched.error || "fetch_failed";
          continue;
        }

        await learnWcBookEventIdsFromHtml(meta.eventId, bookKey, fetched.html);

        let parsed = parseMatchPlayerPropRowsFromHtml(fetched.html, filter);
        if (
          (parsed.anytime_scorer || []).length < MIN_ANYTIME_ROWS &&
          fetched.html.trim().startsWith("{")
        ) {
          try {
            parsed = parseMatchPlayerPropRowsFromJson(JSON.parse(fetched.html), filter);
          } catch {
            /* ignore */
          }
        }

        markets = mergeMatchPlayerPropMarketMaps(markets, parsed);
        const anytimeCount = (markets.anytime_scorer || []).length;
        if (anytimeCount >= MIN_ANYTIME_ROWS_PER_BOOK) {
          return { book: bookKey, ok: true, markets, error: null };
        }
      }

      const anytimeCount = (markets.anytime_scorer || []).length;
      if (anytimeCount < MIN_ANYTIME_ROWS_PER_BOOK) {
        return { book: bookKey, ok: false, markets, error: lastError };
      }

      return { book: bookKey, ok: true, markets, error: null };
    },
  });
}

/**
 * @param {Array<{ book: string, ok: boolean, markets: Record<string, unknown[]>, error: string | null }>} bookResults
 */
function mergeMatchPropsConsensus(bookResults) {
  /** @type {Record<string, Map<string, { name: string, americanOdds: string, nationAbbr?: string, line?: string, side?: string, bookOdds: Record<string, string> }>>} */
  const byMarket = Object.fromEntries(
    WC_MATCH_PLAYER_PROP_MARKET_KEYS.map((key) => [key, new Map()]),
  );

  for (const res of bookResults) {
    if (!res.ok || !res.markets) continue;
    for (const marketKey of WC_MATCH_PLAYER_PROP_MARKET_KEYS) {
      const rows = res.markets[marketKey] || [];
      for (const row of rows) {
        const name = normalizeWcPlayerName(row.name);
        if (!name || !row.americanOdds) continue;
        const key = `${name.toLowerCase()}|${row.line || ""}|${row.side || ""}`;
        const existing = byMarket[marketKey].get(key);
        if (!existing) {
          byMarket[marketKey].set(key, {
            name,
            americanOdds: row.americanOdds,
            nationAbbr: row.nationAbbr,
            line: row.line,
            side: row.side,
            bookOdds: { [res.book]: row.americanOdds },
          });
        } else {
          existing.bookOdds[res.book] = row.americanOdds;
        }
      }
    }
  }

  /** @type {Record<string, Array<Record<string, unknown>>>} */
  const markets = {};
  for (const [marketKey, map] of Object.entries(byMarket)) {
    markets[marketKey] = [...map.values()];
  }
  const booksUsed = bookResults.filter((r) => r.ok).map((r) => r.book);
  return { markets, booksUsed };
}

/**
 * @param {Record<string, Array<Record<string, unknown>>>} markets
 * @param {string} eventId
 */
function mergeMatchPropsWithSeed(markets, eventId) {
  const seed = WC_MATCH_PLAYER_PROPS_SEED_BY_EVENT[String(eventId)];
  if (!seed?.markets) return markets;

  const out = { ...markets };
  for (const [marketKey, seedRows] of Object.entries(seed.markets)) {
    const existing = Array.isArray(out[marketKey]) ? [...out[marketKey]] : [];
    const seen = new Set(existing.map((r) => normalizeWcPlayerName(String(r.name)).toLowerCase()));
    for (const row of seedRows) {
      const name = normalizeWcPlayerName(row.name);
      const key = name.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      existing.push({
        name,
        americanOdds: row.americanOdds,
        nationAbbr: row.nationAbbr,
        line: row.line,
        side: row.side,
        bookOdds: { seed: row.americanOdds },
      });
    }
    out[marketKey] = existing;
  }
  return out;
}

/**
 * @param {string | number} eventId
 * @param {{ homeTeam?: string, awayTeam?: string, scrapeMode?: string }} [meta]
 */
export async function scrapeAndCacheWcMatchPlayerProps(eventId, meta = {}) {
  const id = String(eventId);
  const nowMs = Date.now();

  if (isWcGoatPrimaryEnabled()) {
    const bdlEvent = await ensureWcBdlMatchPlayerPropsForEvent(id, meta);
    if (bdlEvent && hasMatchPlayerPropRows(bdlEvent)) {
      return {
        ok: true,
        eventId: id,
        source: "balldontlie",
        booksUsed: ["balldontlie"],
        anytimeCount: (bdlEvent.markets?.anytime_scorer || []).length,
      };
    }

    const seed = WC_MATCH_PLAYER_PROPS_SEED_BY_EVENT[id];
    if (seed?.markets && !isWcGoatPrimaryEnabled()) {
      const cached = (await getDurableJson(WC_MATCH_PLAYER_PROPS_KV_KEY)) || {};
      const byEventId =
        cached.byEventId && typeof cached.byEventId === "object" ? { ...cached.byEventId } : {};
      byEventId[id] = {
        eventId: id,
        homeTeam: meta.homeTeam || null,
        awayTeam: meta.awayTeam || null,
        lastUpdated: nowMs,
        source: "seed",
        booksUsed: ["seed"],
        markets: seed.markets,
      };
      await setDurableJson(
        WC_MATCH_PLAYER_PROPS_KV_KEY,
        { lastUpdated: nowMs, byEventId },
        { ttlSeconds: WC_MATCH_PLAYER_PROPS_TTL_SECONDS },
      );
      return { ok: true, eventId: id, source: "seed", booksUsed: ["seed"] };
    }

    return { ok: false, eventId: id, error: "bdl_props_unavailable", source: "balldontlie" };
  }

  if (!shouldUseWcBookScrapeForPlayerMarkets()) {
    return { ok: false, eventId: id, error: "book_scrape_disabled" };
  }

  const scrapeMeta = {
    eventId: id,
    homeTeam: meta.homeTeam,
    awayTeam: meta.awayTeam,
  };

  const books = listEnabledWcMatchPlayerPropBooks();
  /** @type {Array<{ book: string, ok: boolean, markets: Record<string, unknown[]>, error: string | null }>} */
  const bookResults = [];
  for (let i = 0; i < books.length; i++) {
    if (i > 0) await delayBetweenWcBookScrapes(i - 1);
    bookResults.push(await scrapeMatchPlayerPropsForBook(books[i], scrapeMeta, i));
  }

  let { markets, booksUsed } = mergeMatchPropsConsensus(bookResults);
  let source = "consensus";
  const anytimeCount = (markets.anytime_scorer || []).length;

  for (const key of WC_MATCH_PLAYER_PROP_MARKET_KEYS) {
    markets[key] = filterMatchPlayerPropScrapeRows(markets[key]);
  }

  if (anytimeCount < MIN_ANYTIME_ROWS) {
    markets = mergeMatchPropsWithSeed(markets, id);
    source = anytimeCount > 0 ? "consensus+seed" : "seed";
    if (!booksUsed.includes("seed")) booksUsed = [...booksUsed, "seed"];
  }

  const finalAnytime = (markets.anytime_scorer || []).length;
  if (!isSufficientMatchProps(markets, booksUsed)) {
    console.log(
      JSON.stringify({
        event: "wc_match_props_skip",
        eventId: id,
        scrapeMode: meta.scrapeMode,
        anytimeCount: finalAnytime,
        booksUsed,
        error: "insufficient_rows",
      }),
    );
    return { ok: false, eventId: id, error: "insufficient_rows" };
  }

  const cached = (await getDurableJson(WC_MATCH_PLAYER_PROPS_KV_KEY)) || {};
  const byEventId =
    cached.byEventId && typeof cached.byEventId === "object" ? { ...cached.byEventId } : {};

  byEventId[id] = {
    eventId: id,
    homeTeam: meta.homeTeam || null,
    awayTeam: meta.awayTeam || null,
    lastUpdated: nowMs,
    source,
    booksUsed,
    markets,
  };

  await setDurableJson(
    WC_MATCH_PLAYER_PROPS_KV_KEY,
    { lastUpdated: nowMs, byEventId },
    { ttlSeconds: WC_MATCH_PLAYER_PROPS_TTL_SECONDS },
  );

  console.log(
    JSON.stringify({
      event: "wc_match_props_cached",
      eventId: id,
      scrapeMode: meta.scrapeMode,
      source,
      booksUsed,
      anytimeCount: finalAnytime,
      firstCount: (markets.first_goalscorer || []).length,
      assistsCount: (markets.player_assists_ou || []).length,
      sotCount: (markets.player_sot_ou || []).length,
      cardCount: (markets.player_card || []).length,
    }),
  );

  return {
    ok: true,
    eventId: id,
    source,
    booksUsed,
    anytimeCount: finalAnytime,
  };
}

/**
 * @param {number} [nowMs]
 */
export async function readWcMatchPlayerPropsKv(nowMs = Date.now()) {
  const raw = await getDurableJson(WC_MATCH_PLAYER_PROPS_KV_KEY);
  if (!raw) return null;
  return raw;
}

/**
 * @param {string} eventId
 * @param {number} [nowMs]
 * @param {Record<string, unknown> | null | undefined} [kvRoot]
 */
export async function readWcMatchPlayerPropsForEvent(eventId, nowMs = Date.now(), kvRoot = undefined) {
  const kv = kvRoot !== undefined ? kvRoot : await readWcMatchPlayerPropsKv(nowMs);
  return readFreshMatchPlayerPropsForEvent(kv, String(eventId), nowMs);
}

/**
 * @param {string} [eventId]
 */
export async function getWcMatchPlayerPropsPayload(eventId) {
  const kv = await readWcMatchPlayerPropsKv();
  if (!eventId) {
    const by = kv?.byEventId || {};
    const eventIds = Object.keys(by);
    return {
      ok: true,
      eventCount: eventIds.length,
      eventIds: eventIds.slice(0, 50),
      lastUpdated: kv?.lastUpdated || null,
      dataSource: isWcGoatPrimaryEnabled() ? "balldontlie" : "default",
    };
  }

  let event = readFreshMatchPlayerPropsForEvent(kv, String(eventId));

  if (isWcGoatPrimaryEnabled()) {
    const meta = await readMatchMetaFromKv(eventId);
    const refreshed = await refreshWcGoatMatchPlayerPropsIfNeeded(eventId, meta || {}, Date.now());
    if (refreshed) event = refreshed;
  }

  if (!event || !hasMatchPlayerPropRows(event)) {
    return {
      ok: false,
      error: "not_found",
      eventId: String(eventId),
      dataSource: isWcGoatPrimaryEnabled() ? "balldontlie" : "default",
      hint: isWcGoatPrimaryEnabled()
        ? "No BDL player props for this fixture yet — check BALLDONTLIE_API_KEY and match_id mapping."
        : undefined,
    };
  }

  const filteredMarkets = filterMatchPlayerPropMarketsForResponse(event);
  const anytimeCount = (filteredMarkets.anytime_scorer || []).length;

  return {
    ok: true,
    eventId: String(eventId),
    ...event,
    markets: filteredMarkets,
    anytimeCount,
    dataSource: isWcBdlSource(event.source) ? "balldontlie" : "default",
    ...(isWcBdlSource(event.source)
      ? { source: "balldontlie", booksUsed: ["balldontlie"] }
      : {}),
  };
}
