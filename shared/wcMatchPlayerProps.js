/**
 * World Cup per-event player props — KV helpers + freshness (Phase C).
 */

import {
  WC_MATCH_PLAYER_PROPS_MAX_AGE_MS,
} from "./wc2026PlayerConstants.js";
import { calculateOddsFreshness } from "./wcOddsFreshness.js";
import { normalizeWcPlayerName } from "./wcPlayerRegistry.js";
import { isWcBdlSource, isWcInPlayMatchStatus } from "./wcBdlPolicy.js";

export { WC_MATCH_PLAYER_PROPS_MAX_AGE_MS };

/** @typedef {"anytime_scorer" | "first_goalscorer" | "last_goalscorer" | "player_goal_or_assist" | "player_assists_ou" | "player_shots_ou" | "player_sot_ou" | "player_card" | "player_red_card"} WcMatchPlayerPropMarket */

/** Scorer + extended player prop markets (Phase 1 book scrape). */
export const WC_MATCH_PLAYER_PROP_MARKET_KEYS = [
  "anytime_scorer",
  "first_goalscorer",
  "last_goalscorer",
  "player_goal_or_assist",
  "player_assists_ou",
  "player_shots_ou",
  "player_sot_ou",
  "player_shots_each_half",
  "player_sot_each_half",
  "player_saves_ou",
  "player_tackles_ou",
  "player_card",
  "player_red_card",
];

/** @type {Record<WcMatchPlayerPropMarket, string>} */
export const WC_MATCH_PLAYER_PROP_PROMPT_LABELS = {
  anytime_scorer: "ANYTIME GOALSCORER",
  first_goalscorer: "FIRST GOALSCORER",
  last_goalscorer: "LAST GOALSCORER",
  player_goal_or_assist: "GOAL OR ASSIST",
  player_assists_ou: "PLAYER ASSISTS (O/U)",
  player_shots_ou: "PLAYER SHOTS (O/U)",
  player_sot_ou: "PLAYER SHOTS ON TARGET (O/U)",
  player_shots_each_half: "PLAYER SHOTS EACH HALF",
  player_sot_each_half: "PLAYER SOT EACH HALF",
  player_saves_ou: "PLAYER SAVES (O/U)",
  player_tackles_ou: "PLAYER TACKLES (O/U)",
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
/**
 * Parse American odds to a sortable number (lower = shorter / primary market line).
 * @param {string} odds
 */
function matchPlayerPropOddsRank(odds) {
  const raw = String(odds || "").trim().replace(/^\+/, "");
  const n = Number.parseInt(raw, 10);
  if (!Number.isFinite(n)) return 999999;
  if (String(odds).startsWith("-")) return n;
  return n;
}

function matchPlayerPropOuLineRank(line) {
  const n = Number.parseFloat(String(line ?? "").trim());
  return Number.isFinite(n) ? n : 99;
}

function isMatchPlayerPropOverSide(side) {
  const raw = String(side || "").trim().toLowerCase();
  return !raw || raw === "yes" || raw === "over";
}

/**
 * Drawer display keeps the primary O/U line (lowest threshold) per player.
 * @param {Record<string, unknown>} candidate
 * @param {Record<string, unknown>} incumbent
 */
function shouldPreferMatchPlayerPropOuRow(candidate, incumbent) {
  const candidateLine = matchPlayerPropOuLineRank(candidate?.line);
  const incumbentLine = matchPlayerPropOuLineRank(incumbent?.line);
  if (candidateLine !== incumbentLine) return candidateLine < incumbentLine;
  return (
    matchPlayerPropOddsRank(String(candidate.americanOdds || "")) <
    matchPlayerPropOddsRank(String(incumbent.americanOdds || ""))
  );
}

/**
 * One display row per player — drop duplicate scrape rows that repeat the same name
 * with wild alternate prices (+850 / +13000 / +70000).
 * @param {Array<{ name?: string, americanOdds?: string, line?: string, side?: string }>} rows
 * @param {string} [marketKey]
 */
export function collapseMatchPlayerPropRowsForDisplay(rows, marketKey = "") {
  const list = Array.isArray(rows) ? rows : [];
  if (!list.length) return [];

  const isOuMarket =
    String(marketKey || "").includes("_ou") || String(marketKey || "").includes("each_half");
  /** @type {Map<string, Record<string, unknown>>} */
  const byKey = new Map();

  for (const row of list) {
    const name = normalizeWcPlayerName(String(row?.name || ""));
    const odds = String(row?.americanOdds || "").trim();
    if (!name || !odds) continue;
    if (isOuMarket && !isMatchPlayerPropOverSide(row?.side)) continue;

    const dedupeKey = name.toLowerCase();
    const existing = byKey.get(dedupeKey);
    if (!existing) {
      byKey.set(dedupeKey, { ...row, name });
      continue;
    }

    if (isOuMarket) {
      if (shouldPreferMatchPlayerPropOuRow(row, existing)) {
        byKey.set(dedupeKey, { ...row, name });
      }
      continue;
    }

    const existingRank = matchPlayerPropOddsRank(String(existing.americanOdds || ""));
    const nextRank = matchPlayerPropOddsRank(odds);
    if (nextRank < existingRank) {
      byKey.set(dedupeKey, { ...row, name });
    }
  }

  return [...byKey.values()];
}

/**
 * @param {Record<string, Array<Record<string, unknown>>>} markets
 */
export function collapseMatchPlayerPropMarketsForDisplay(markets) {
  if (!markets || typeof markets !== "object") return {};
  return Object.fromEntries(
    Object.entries(markets).map(([key, rows]) => [
      key,
      collapseMatchPlayerPropRowsForDisplay(Array.isArray(rows) ? rows : [], key),
    ]),
  );
}

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
    out[key] = rows;
  }
  return out;
}

/**
 * @param {Record<string, unknown> | null | undefined} eventPayload
 */
/** Seed/demo props must never back UR Take answers when GOAT is primary. */
export function isWcUrTakeBlockedSeedPropsPayload(eventPayload) {
  if (!eventPayload || typeof eventPayload !== "object") return false;
  const source = String(eventPayload.source || "").toLowerCase();
  if (source === "seed") return true;
  const books = eventPayload.booksUsed;
  if (
    Array.isArray(books) &&
    books.length > 0 &&
    books.every((b) => String(b).toLowerCase() === "seed")
  ) {
    return true;
  }
  return false;
}

export function hasMatchPlayerPropRows(eventPayload) {
  if (!eventPayload?.markets || typeof eventPayload.markets !== "object") return false;
  return WC_MATCH_PLAYER_PROP_MARKET_KEYS.some((key) => {
    const rows = eventPayload.markets[key];
    return Array.isArray(rows) && rows.some((r) => r?.name && r?.americanOdds);
  });
}

/**
 * True when payload is a per-event record (readWcMatchPlayerPropsForEvent), not the KV index root.
 * @param {Record<string, unknown> | null | undefined} payload
 */
export function isMatchPlayerPropsEventPayload(payload) {
  return Boolean(payload?.markets && typeof payload.markets === "object");
}

/**
 * Resolve event id + payload from either KV index root or a single-event payload.
 * @param {Record<string, unknown> | null | undefined} kvOrEvent
 * @param {object} [opts]
 * @param {string} [opts.eventId]
 * @param {string[]} [opts.teams]
 * @returns {{ eventId: string, payload: Record<string, unknown> } | null}
 */
export function resolveMatchPlayerPropsPayload(kvOrEvent, opts = {}) {
  if (!kvOrEvent) return null;

  const eventId = String(opts.eventId || "").trim();
  const teams = Array.isArray(opts.teams) ? opts.teams : [];

  if (isMatchPlayerPropsEventPayload(kvOrEvent)) {
    const payload = /** @type {Record<string, unknown>} */ (kvOrEvent);
    const payloadEventId = String(payload.eventId || eventId || "").trim();
    if (eventId && payloadEventId && payloadEventId !== eventId) return null;
    if (teams.length >= 2) {
      const want = new Set(teams.map((t) => String(t).trim().toUpperCase()));
      const home = String(payload.homeTeam || "").trim().toUpperCase();
      const away = String(payload.awayTeam || "").trim().toUpperCase();
      if (!want.has(home) || !want.has(away)) return null;
    }
    return {
      eventId: payloadEventId || eventId,
      payload,
    };
  }

  if (eventId) {
    const payload = matchPlayerPropsForEvent(kvOrEvent, eventId);
    if (payload) return { eventId, payload: /** @type {Record<string, unknown>} */ (payload) };
  }

  if (teams.length >= 2) {
    return resolveMatchPlayerPropsEventForTeams(kvOrEvent, teams[0], teams[1]);
  }

  return null;
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
 * Resolve per-event player props payload from two FIFA team abbreviations.
 * @param {Record<string, unknown> | null | undefined} kvRoot
 * @param {string} teamA
 * @param {string} teamB
 * @returns {{ eventId: string, payload: Record<string, unknown> } | null}
 */
export function resolveMatchPlayerPropsEventForTeams(kvRoot, teamA, teamB) {
  const by = kvRoot?.byEventId;
  if (!by || typeof by !== "object") return null;
  const want = new Set(
    [teamA, teamB].map((t) => String(t || "").trim().toUpperCase()).filter(Boolean),
  );
  if (want.size < 2) return null;
  for (const [id, payload] of Object.entries(by)) {
    const home = String(payload?.homeTeam || "").trim().toUpperCase();
    const away = String(payload?.awayTeam || "").trim().toUpperCase();
    if (want.has(home) && want.has(away)) {
      return { eventId: String(id), payload: /** @type {Record<string, unknown>} */ (payload) };
    }
  }
  return null;
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
  const hasRows = hasMatchPlayerPropRows(eventPayload);

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
  return hasMatchPlayerPropRows(attached);
}

/**
 * UR Take may use pre-match BDL boards during live play when in-play lines are pulled.
 * @param {Record<string, unknown> | null | undefined} eventPayload
 * @param {{ nowMs?: number, matchStatus?: string }} [opts]
 */
export function matchPlayerPropsUsableForUrTake(eventPayload, opts = {}) {
  if (!eventPayload || !hasMatchPlayerPropRows(eventPayload)) return false;
  if (isWcUrTakeBlockedSeedPropsPayload(eventPayload)) return false;
  const nowMs = opts.nowMs ?? Date.now();
  if (isMatchPlayerPropsFresh(eventPayload, nowMs)) return true;
  const status = String(opts.matchStatus || eventPayload.matchStatus || "");
  return isWcInPlayMatchStatus(status) && isWcBdlSource(eventPayload.source);
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

/**
 * True when the KV index has at least one non-stale event with player-prop rows.
 * @param {Record<string, unknown> | null | undefined} kvRoot
 * @param {object} [opts]
 * @param {string} [opts.eventId]
 * @param {string} [opts.question]
 * @param {number} [nowMs]
 */
export function kvHasFreshMatchPlayerProps(kvRoot, opts = {}) {
  if (!kvRoot) return false;
  const resolved = resolveMatchPlayerPropsPayload(kvRoot, opts);
  if (resolved) {
    return matchPlayerPropsUsableForUrTake(resolved.payload, {
      nowMs: opts.nowMs,
      matchStatus: opts.matchStatus,
    });
  }

  const by = kvRoot.byEventId;
  if (!by || typeof by !== "object") return false;
  for (const payload of Object.values(by)) {
    if (
      matchPlayerPropsUsableForUrTake(payload, {
        nowMs: opts.nowMs,
        matchStatus: opts.matchStatus,
      })
    ) {
      return true;
    }
  }
  return false;
}

/** @type {Array<{ key: string, label: string }>} */
export const WC_FIXTURE_PROP_BOARD_MARKETS = [
  { key: "anytime_scorer", label: "anytime scorer" },
  { key: "player_goal_or_assist", label: "goal or assist" },
  { key: "player_sot_ou", label: "shots on target" },
  { key: "player_shots_ou", label: "shots" },
  { key: "player_assists_ou", label: "assists" },
];

/**
 * Higher = more interesting on the card face (avoid -2500 juice traps).
 * @param {string} americanOdds
 */
export function fixturePropBoardPlayabilityScore(americanOdds) {
  const raw = String(americanOdds || "").trim();
  const n = Number.parseInt(raw.replace(/^\+/, ""), 10);
  if (!Number.isFinite(n) || n === 0) return -999;
  if (raw.startsWith("+")) {
    if (n >= 250) return 90;
    if (n >= 120) return 80;
    return 65;
  }
  if (n <= -500) return 5;
  if (n <= -250) return 15;
  if (n <= -200) return 30;
  if (n <= -150) return 55;
  if (n <= -120) return 70;
  return 60;
}

/**
 * Rank posted rows for fixture boards — playable prices first, one row per player.
 * @param {Array<{ name?: string, americanOdds?: string, nationAbbr?: string, line?: string, side?: string }>} rows
 * @param {number} [limit]
 * @param {string} [marketKey]
 */
export function rankFixturePropBoardRows(rows, limit = 12, marketKey = "") {
  const list = Array.isArray(rows) ? rows : [];
  const deduped = collapseMatchPlayerPropRowsForDisplay(list, marketKey);
  return deduped
    .map((row) => ({
      row,
      score: fixturePropBoardPlayabilityScore(String(row.americanOdds || "")),
    }))
    .filter(({ score }) => score >= 20)
    .sort((a, b) => b.score - a.score || a.row.name.localeCompare(b.row.name))
    .map(({ row }) => row)
    .slice(0, limit);
}

/**
 * @param {{ name?: string, americanOdds?: string, line?: string }} row
 * @param {string} marketKey
 * @param {string} marketLabel
 */
export function formatFixturePropBoardRowLabel(row, marketKey, marketLabel) {
  const odds = String(row?.americanOdds || "").trim();
  const name = String(row?.name || "").trim();
  if (!name || !odds) return "";
  if (String(marketKey).includes("_ou") && row.line) {
    return `${name} over ${row.line} ${marketLabel} ${odds}`;
  }
  return `${name} ${marketLabel} ${odds}`;
}

/**
 * Pick the best posted market for a fixture prop board (anytime → shots → SOT → GOA).
 * @param {Record<string, unknown> | null | undefined} eventPayload
 * @param {number} [limit]
 */
export function pickFixturePropBoardFromEvent(eventPayload, limit = 24) {
  if (!eventPayload?.markets) return null;
  for (const entry of WC_FIXTURE_PROP_BOARD_MARKETS) {
    const rawRows = matchPlayerPropRowsFromEvent(eventPayload, entry.key, limit);
    const collapsed = collapseMatchPlayerPropRowsForDisplay(rawRows, entry.key);
    const rows = rankFixturePropBoardRows(collapsed, limit, entry.key);
    const boardRows = rows.length >= 2 ? rows : collapsed.slice(0, limit);
    if (boardRows.length >= 2) {
      return { ...entry, rows: boardRows };
    }
  }
  return null;
}
