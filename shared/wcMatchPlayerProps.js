/**
 * World Cup per-event player props — KV helpers + freshness (Phase C).
 */

import {
  WC_MATCH_PLAYER_PROPS_MAX_AGE_MS,
} from "./wc2026PlayerConstants.js";
import { calculateOddsFreshness } from "./wcOddsFreshness.js";
import { normalizeWcPlayerName } from "./wcPlayerRegistry.js";

export { WC_MATCH_PLAYER_PROPS_MAX_AGE_MS };

/** @typedef {"anytime_scorer" | "first_goalscorer" | "last_goalscorer" | "player_assists_ou" | "player_shots_ou" | "player_sot_ou" | "player_card" | "player_red_card"} WcMatchPlayerPropMarket */

/** Scorer + extended player prop markets (Phase 1 book scrape). */
export const WC_MATCH_PLAYER_PROP_MARKET_KEYS = [
  "anytime_scorer",
  "first_goalscorer",
  "last_goalscorer",
  "player_assists_ou",
  "player_shots_ou",
  "player_sot_ou",
  "player_card",
  "player_red_card",
];

/** @type {Record<WcMatchPlayerPropMarket, string>} */
export const WC_MATCH_PLAYER_PROP_PROMPT_LABELS = {
  anytime_scorer: "ANYTIME GOALSCORER",
  first_goalscorer: "FIRST GOALSCORER",
  last_goalscorer: "LAST GOALSCORER",
  player_assists_ou: "PLAYER ASSISTS (O/U)",
  player_shots_ou: "PLAYER SHOTS (O/U)",
  player_sot_ou: "PLAYER SHOTS ON TARGET (O/U)",
  player_card: "PLAYER TO RECEIVE A CARD",
  player_red_card: "PLAYER TO RECEIVE A RED CARD",
};

/**
 * @returns {Record<string, Array<Record<string, unknown>>>}
 */
export function createEmptyMatchPlayerPropMarkets() {
  /** @type {Record<string, Array<Record<string, unknown>>>} */
  const out = {};
  for (const key of WC_MATCH_PLAYER_PROP_MARKET_KEYS) {
    out[key] = [];
  }
  return out;
}

/**
 * @param {Record<string, Array<Record<string, unknown>>>} a
 * @param {Record<string, Array<Record<string, unknown>>>} b
 */
export function mergeMatchPlayerPropMarketMaps(a, b) {
  const out = createEmptyMatchPlayerPropMarkets();
  for (const key of WC_MATCH_PLAYER_PROP_MARKET_KEYS) {
    const seen = new Set();
    const rows = [...(a?.[key] || []), ...(b?.[key] || [])].filter((row) => {
      const k = `${row?.name}|${row?.americanOdds}|${row?.line || ""}|${row?.side || ""}`;
      if (seen.has(k)) return false;
      seen.add(k);
      return Boolean(row?.name && row?.americanOdds);
    });
    out[key] = rows.slice(0, 40);
  }
  return out;
}

/**
 * @param {Record<string, unknown> | null | undefined} eventPayload
 */
export function hasMatchPlayerPropRows(eventPayload) {
  if (!eventPayload?.markets || typeof eventPayload.markets !== "object") return false;
  return WC_MATCH_PLAYER_PROP_MARKET_KEYS.some((key) => {
    const rows = eventPayload.markets[key];
    return Array.isArray(rows) && rows.some((r) => r?.name && r?.americanOdds);
  });
}

/**
 * @param {Record<string, unknown> | null | undefined} kvRoot
 * @param {string} eventId
 */
export function matchPlayerPropsForEvent(kvRoot, eventId) {
  const id = String(eventId || "").trim();
  if (!id || !kvRoot) return null;
  const by = kvRoot.byEventId;
  if (!by || typeof by !== "object") return null;
  return /** @type {Record<string, unknown>} */ (by)[id] || null;
}

/**
 * @param {Record<string, unknown> | null | undefined} eventPayload
 * @param {number} [nowMs]
 */
export function attachMatchPlayerPropsFreshness(eventPayload, nowMs = Date.now()) {
  if (!eventPayload) return null;
  const markets = eventPayload.markets && typeof eventPayload.markets === "object"
    ? eventPayload.markets
    : {};
  const anytime = Array.isArray(markets.anytime_scorer) ? markets.anytime_scorer : [];
  const hasRows = anytime.length > 0;

  if (!hasRows) {
    return {
      ...eventPayload,
      stale: true,
      freshness: calculateOddsFreshness(null, WC_MATCH_PLAYER_PROPS_MAX_AGE_MS, nowMs),
    };
  }

  const freshness = calculateOddsFreshness(
    eventPayload.lastUpdated,
    WC_MATCH_PLAYER_PROPS_MAX_AGE_MS,
    nowMs,
  );

  return {
    ...eventPayload,
    stale: freshness.isStale,
    freshness,
  };
}

/**
 * @param {Record<string, unknown> | null | undefined} eventPayload
 * @param {WcMatchPlayerPropMarket} [market]
 * @param {number} [limit]
 */
export function matchPlayerPropRowsFromEvent(eventPayload, market = "anytime_scorer", limit = 20) {
  const markets = eventPayload?.markets;
  if (!markets || typeof markets !== "object") return [];
  const rows = Array.isArray(markets[market]) ? markets[market] : [];
  return rows
    .filter((r) => r?.name && r?.americanOdds)
    .map((r) => ({
      name: String(r.name),
      americanOdds: String(r.americanOdds),
      nationAbbr: r.nationAbbr ? String(r.nationAbbr).toUpperCase().slice(0, 3) : undefined,
      market: r.market ? String(r.market) : market,
      line: r.line != null ? String(r.line) : undefined,
      side: r.side ? String(r.side) : undefined,
    }))
    .slice(0, limit);
}

/**
 * @param {WcMatchPlayerPropMarket} market
 * @param {{ name: string, nationAbbr?: string, americanOdds: string, line?: string, side?: string }} row
 */
export function formatMatchPlayerPropRowForPrompt(market, row) {
  const team = row.nationAbbr ? ` (${row.nationAbbr})` : "";
  const lineBit =
    row.line && row.side
      ? ` ${String(row.side).charAt(0).toUpperCase()}${String(row.side).slice(1)} ${row.line}`
      : row.side === "yes"
        ? " Yes"
        : "";
  return `${row.name}${team}${lineBit}: ${row.americanOdds}`;
}

/**
 * @param {Record<string, unknown> | null | undefined} eventPayload
 * @param {number} [nowMs]
 */
export function isMatchPlayerPropsFresh(eventPayload, nowMs = Date.now()) {
  const attached = attachMatchPlayerPropsFreshness(eventPayload, nowMs);
  if (!attached || attached.stale) return false;
  return matchPlayerPropRowsFromEvent(attached, "anytime_scorer", 3).length >= 3;
}

/**
 * @param {Array<{ name?: string, nationAbbr?: string }>} rows
 * @param {string} [homeTeam]
 * @param {string} [awayTeam]
 */
export function filterMatchPropRowsByFixtureTeams(rows, homeTeam, awayTeam) {
  const home = String(homeTeam || "").toUpperCase().slice(0, 3);
  const away = String(awayTeam || "").toUpperCase().slice(0, 3);
  if (!home && !away) return rows;

  return (rows || []).filter((r) => {
    const abbr = String(r.nationAbbr || "").toUpperCase().slice(0, 3);
    if (abbr && (abbr === home || abbr === away)) return true;
    const name = normalizeWcPlayerName(String(r.name || ""));
    if (!name) return false;
    return true;
  });
}

/**
 * @param {Record<string, unknown> | null | undefined} kvRoot
 * @param {string} eventId
 * @param {number} [nowMs]
 */
export function readFreshMatchPlayerPropsForEvent(kvRoot, eventId, nowMs = Date.now()) {
  const raw = matchPlayerPropsForEvent(kvRoot, eventId);
  return attachMatchPlayerPropsFreshness(raw, nowMs);
}
