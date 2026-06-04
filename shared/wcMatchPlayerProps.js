/**
 * World Cup per-event player props — KV helpers + freshness (Phase C).
 */

import {
  WC_MATCH_PLAYER_PROPS_MAX_AGE_MS,
} from "./wc2026PlayerConstants.js";
import { calculateOddsFreshness } from "./wcOddsFreshness.js";
import { normalizeWcPlayerName } from "./wcPlayerRegistry.js";

export { WC_MATCH_PLAYER_PROPS_MAX_AGE_MS };

/** @typedef {"anytime_scorer" | "first_goalscorer" | "last_goalscorer"} WcMatchPlayerPropMarket */

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
    }))
    .slice(0, limit);
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
