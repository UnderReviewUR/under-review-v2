/**
 * NFL live board from Action Network — game O/U, spreads, ML + player props.
 * No The Odds API credits.
 */
import { impliedTwoWayFromAmerican, roundProb } from "../shared/nflOddsImplied.js";
import {
  NFL_PROPS_MARKET_LABELS,
  NFL_PROPS_WIRE_MARKETS,
  nflBoardCacheKey,
  nflPropsBookLabel,
} from "../shared/nflPropsConstants.js";
import { NFL_BOARD_TTL_MS, NFL_BOARD_LIVE_TTL_MS } from "../shared/nflPropsCachePolicy.js";
import { nflScoreboardNeedsFastPoll } from "../shared/nflGameState.js";
import {
  fetchActionNetworkNflScoreboard,
  nflEtDateYmd,
} from "./_nflPropsFetch.js";
import { normalizeNflScoreboardGame } from "./_nflBoardNormalize.js";
import { getNflPropsForBoard } from "./_nflProps.js";

export {
  normalizeNflMoneylineMarket,
  normalizeNflScoreboardGame,
  normalizeNflSpreadMarket,
  normalizeNflTotalMarket,
  pickNflBookEventMarkets,
} from "./_nflBoardNormalize.js";

/** @type {Map<string, { fetchedAtMs: number, payload: Record<string, unknown> }>} */
const boardMem = new Map();

function nflBoardTtlMs(payload, nowMs = Date.now()) {
  if (nflScoreboardNeedsFastPoll(payload?.games, nowMs)) return NFL_BOARD_LIVE_TTL_MS;
  return NFL_BOARD_TTL_MS;
}

/**
 * @param {{ dateYmd?: string, week?: number | string, season?: number | string }} [opts]
 */
export async function fetchNormalizedNflScoreboard(opts = {}) {
  const raw = await fetchActionNetworkNflScoreboard(opts);
  const games = Array.isArray(raw?.games) ? raw.games.map(normalizeNflScoreboardGame) : [];
  return {
    source: "action_network",
    dateYmd: opts.dateYmd || (opts.week != null ? null : nflEtDateYmd()),
    week: opts.week != null ? Number(opts.week) : games[0]?.week ?? null,
    season: opts.season != null ? Number(opts.season) : games[0]?.season ?? null,
    seasonType: games[0]?.seasonType || null,
    gameCount: games.length,
    games,
  };
}

/**
 * @param {{ dateYmd?: string, week?: number | string, season?: number | string }} [opts]
 */
export async function getNflBoardCached(opts = {}) {
  const keyPart =
    opts.week != null
      ? `week_${opts.week}_${opts.season || "cur"}`
      : String(opts.dateYmd || nflEtDateYmd()).replace(/-/g, "");
  const cacheKey = nflBoardCacheKey(keyPart);
  const hit = boardMem.get(cacheKey);
  if (hit && Date.now() - hit.fetchedAtMs < nflBoardTtlMs(hit.payload)) {
    return { ...hit.payload, cache: "memory" };
  }

  const board = await fetchNormalizedNflScoreboard(opts);
  const payload = {
    ...board,
    asOf: new Date().toISOString(),
  };
  boardMem.set(cacheKey, { fetchedAtMs: Date.now(), payload });
  return { ...payload, cache: "fresh" };
}

/**
 * Flatten cached/parsed props into board propLines with implied probs.
 * @param {Record<string, unknown>} propsPayload
 * @param {{ awayAbbr?: string | null, homeAbbr?: string | null }} game
 */
export function nflPropsPayloadToPropLines(propsPayload, game = {}) {
  const matchup =
    game.awayAbbr && game.homeAbbr ? `${game.awayAbbr} @ ${game.homeAbbr}` : "NFL";
  /** @type {Array<Record<string, unknown>>} */
  const out = [];
  for (const p of propsPayload?.players || []) {
    const player = String(p.fullName || p.playerAbbr || "").trim();
    if (!player) continue;
    const propKeys = Object.keys(p.props || {});
    // Prefer known headline order, then any extended markets ingested via pass-through.
    const markets = [
      ...NFL_PROPS_WIRE_MARKETS.filter((m) => propKeys.includes(m)),
      ...propKeys.filter((m) => !NFL_PROPS_WIRE_MARKETS.includes(m)),
    ];
    for (const market of markets) {
      const block = p.props?.[market];
      if (!block || (!block.over && !block.under)) continue;
      const overOdds = block.over?.odds ?? null;
      const underOdds = block.under?.odds ?? null;
      const line = block.over?.line ?? block.under?.line ?? null;
      const bookId = block.over?.bookId ?? block.under?.bookId ?? null;
      const tw = impliedTwoWayFromAmerican(overOdds, underOdds);
      out.push({
        game: matchup,
        player,
        playerAbbr: p.playerAbbr || null,
        prop: NFL_PROPS_MARKET_LABELS[market] || market.replace(/_/g, " "),
        propRaw: market,
        line,
        overOdds,
        underOdds,
        overImplied: roundProb(tw?.aRaw),
        underImplied: roundProb(tw?.bRaw),
        overImpliedDevig: roundProb(tw?.aDevig),
        underImpliedDevig: roundProb(tw?.bDevig),
        bookId,
        book: nflPropsBookLabel(bookId),
        eventId: propsPayload.providerGameId ?? propsPayload.gameId ?? null,
      });
    }
  }
  return out;
}

/**
 * Full board response for API.
 * @param {{
 *   dateYmd?: string,
 *   week?: number | string,
 *   season?: number | string,
 *   gameId?: number | string,
 *   includeProps?: boolean,
 *   maxPropGames?: number,
 * }} [opts]
 */
export async function buildNflLiveBoard(opts = {}) {
  const board = await getNflBoardCached({
    dateYmd: opts.dateYmd,
    week: opts.week,
    season: opts.season,
  });

  /** @type {Array<Record<string, unknown>>} */
  let propLines = [];
  /** @type {Record<string, unknown> | null} */
  let propsMeta = null;

  const wantProps = Boolean(opts.includeProps) || opts.gameId != null;
  if (wantProps) {
    let targets = board.games || [];
    if (opts.gameId != null) {
      const gid = Number(opts.gameId);
      targets = targets.filter((g) => Number(g.providerGameId) === gid);
      if (!targets.length) {
        targets = [{ providerGameId: gid, awayAbbr: null, homeAbbr: null, tipoffMs: null }];
      }
    } else {
      const now = Date.now();
      const maxGames = Math.max(1, Math.min(Number(opts.maxPropGames) || 4, 8));
      targets = targets
        .filter((g) => g.providerGameId && (g.tipoffMs == null || g.tipoffMs > now - 4 * 3600_000))
        .slice(0, maxGames);
    }

    for (const g of targets) {
      try {
        const props = await getNflPropsForBoard(g.providerGameId, {
          tipoffMs: g.tipoffMs,
          isLive: String(g.status || "").toLowerCase() === "inprogress",
        });
        propLines = propLines.concat(nflPropsPayloadToPropLines(props, g));
        if (!propsMeta) {
          propsMeta = {
            source: props.source,
            fetchedAt: props.fetchedAt,
            freshness: props.freshness,
            playerCount: props.playerCount,
            hasPostedLines: props.hasPostedLines,
          };
        }
      } catch (err) {
        console.warn(
          JSON.stringify({
            event: "nfl_board_props_failed",
            gameId: g.providerGameId,
            error: err?.message || String(err),
          }),
        );
      }
    }
  }

  return {
    ok: true,
    source: "action_network",
    asOf: board.asOf,
    cache: board.cache,
    dateYmd: board.dateYmd,
    week: board.week,
    season: board.season,
    seasonType: board.seasonType,
    gameCount: board.gameCount,
    games: board.games,
    propLines,
    propLineCount: propLines.length,
    props: propsMeta,
  };
}
