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
  createEmptyMatchPlayerPropMarkets,
  matchPlayerPropsForEvent,
  mergeMatchPlayerPropMarketMaps,
  readFreshMatchPlayerPropsForEvent,
  WC_MATCH_PLAYER_PROP_MARKET_KEYS,
} from "../shared/wcMatchPlayerProps.js";
import { normalizeWcPlayerName } from "../shared/wcPlayerRegistry.js";
import { WC_MATCH_PLAYER_PROPS_SEED_BY_EVENT } from "../src/data/wc2026MatchPlayerPropsSeed.js";

const MIN_ANYTIME_ROWS = 3;
const MIN_ANYTIME_ROWS_PER_BOOK = 2;

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
    markets[marketKey] = [...map.values()].slice(0, 40);
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
 */
export async function readWcMatchPlayerPropsForEvent(eventId, nowMs = Date.now()) {
  const kv = await readWcMatchPlayerPropsKv(nowMs);
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
    };
  }

  const event = readFreshMatchPlayerPropsForEvent(kv, String(eventId));
  if (!event) {
    return { ok: false, error: "not_found", eventId: String(eventId) };
  }

  return {
    ok: true,
    eventId: String(eventId),
    ...event,
    anytimeCount: (event.markets?.anytime_scorer || []).length,
  };
}
