/**
 * BallDontLie NFL GOAT client (scaffold).
 * Live hydrate flips on when BALLDONTLIE has NFL GOAT odds/props access.
 * Until then, board stays on Action Network; this module is ready to plug in.
 */
import { getEnv } from "./_env.js";
import { bdlFetch } from "./_balldontlie.js";
import {
  createEmptyNflGoatBriefcase,
  auditNflGoatBriefcaseCoverage,
} from "../shared/nflGoatExtractionContract.js";

const NFL_BDL_PREFIX = "/nfl/v1";

/**
 * Feature flag — set NFL_BDL_PRIMARY=1 when GOAT odds/props are live on the key.
 */
export function isNflBdlPrimaryEnabled() {
  const flag = String(getEnv("NFL_BDL_PRIMARY") || "").trim().toLowerCase();
  if (flag === "1" || flag === "true" || flag === "yes") return true;
  return false;
}

/**
 * @returns {string}
 */
export function getNflBdlApiKey() {
  return String(getEnv("BALLDONTLIE_API_KEY") || "").trim();
}

/**
 * @param {string} path
 * @param {Record<string, unknown>} [params]
 * @param {{ apiKey?: string, timeoutMs?: number }} [opts]
 */
export async function nflBdlFetch(path, params = {}, opts = {}) {
  const apiKey = opts.apiKey || getNflBdlApiKey();
  if (!apiKey) return { ok: false, status: 0, data: null, error: "missing_bdl_key" };
  const p = path.startsWith("/") ? path : `/${path}`;
  const full = p.startsWith("/nfl/") ? p : `${NFL_BDL_PREFIX}${p.startsWith("/") ? p : `/${p}`}`;
  return bdlFetch(full, params, { apiKey, timeoutMs: opts.timeoutMs ?? 15000 });
}

/**
 * Normalize BDL player_props rows → board-ish propLines.
 * Mirrors MLB `fetchBdlMlbPlayerPropsForSlate` shape.
 * @param {Array<Record<string, unknown>>} rows
 * @param {{ gameLabel?: string, eventId?: string|number }} [ctx]
 */
export function normalizeNflBdlPlayerPropRows(rows, ctx = {}) {
  const allowedVendors = new Set([
    "draftkings",
    "fanduel",
    "betmgm",
    "caesars",
    "fanatics",
    "betrivers",
  ]);
  /** @type {Array<Record<string, unknown>>} */
  const out = [];
  for (const row of rows || []) {
    const vendor = String(row.vendor || "").toLowerCase();
    if (vendor && !allowedVendors.has(vendor)) continue;
    const player = String(
      row.player?.full_name ||
        [row.player?.first_name, row.player?.last_name].filter(Boolean).join(" ") ||
        "",
    ).trim();
    if (!player && row.player_id == null) continue;
    const propRaw = String(row.prop_type || "prop").trim();
    const prop = propRaw.replace(/_/g, " ");
    const market = row.market && typeof row.market === "object" ? row.market : {};
    const lineVal = row.line_value != null ? Number.parseFloat(String(row.line_value)) : NaN;
    const eventId = ctx.eventId ?? row.game_id ?? null;
    const game = ctx.gameLabel || "NFL";

    if (market.type === "over_under" && Number.isFinite(lineVal)) {
      out.push({
        game,
        player: player || `player_${row.player_id}`,
        playerId: row.player_id ?? null,
        prop,
        propRaw,
        line: lineVal,
        overOdds: market.over_odds ?? null,
        underOdds: market.under_odds ?? null,
        book: vendor || "unknown",
        eventId: eventId != null ? String(eventId) : null,
        source: "balldontlie_nfl",
      });
    } else if (market.type === "milestone" && market.odds != null) {
      out.push({
        game,
        player: player || `player_${row.player_id}`,
        playerId: row.player_id ?? null,
        prop,
        propRaw,
        line: Number.isFinite(lineVal) ? lineVal : 0.5,
        overOdds: market.odds,
        underOdds: null,
        book: vendor || "unknown",
        eventId: eventId != null ? String(eventId) : null,
        source: "balldontlie_nfl",
        marketType: "milestone",
      });
    }
  }
  return out;
}

/**
 * Fetch props for one BDL game id (GOAT). Returns [] if unauthorized/empty.
 * @param {number|string} gameId
 * @param {{ apiKey?: string, gameLabel?: string }} [opts]
 */
export async function fetchNflBdlPlayerPropsForGame(gameId, opts = {}) {
  const gid = Number(gameId);
  if (!Number.isFinite(gid)) return [];
  const res = await nflBdlFetch(
    "/odds/player_props",
    { game_id: gid },
    { apiKey: opts.apiKey, timeoutMs: 20000 },
  );
  if (!res.ok || !Array.isArray(res.data?.data)) return [];
  return normalizeNflBdlPlayerPropRows(res.data.data, {
    gameLabel: opts.gameLabel,
    eventId: gid,
  });
}

/**
 * Fetch week game odds (GOAT). Returns [] if unauthorized/empty.
 * @param {{ season: number, week: number, apiKey?: string }} opts
 */
export async function fetchNflBdlWeekOdds(opts) {
  const res = await nflBdlFetch(
    "/odds",
    { season: opts.season, week: opts.week },
    { apiKey: opts.apiKey, timeoutMs: 20000 },
  );
  if (!res.ok || !Array.isArray(res.data?.data)) return [];
  return res.data.data;
}

/**
 * Build a GOAT briefcase shell. Live fills arrive when primary flag + key work.
 * Safe to call now — returns empty coverage until GOAT is active.
 * @param {{ week?: number, season?: number, gameIds?: Array<number|string> }} [opts]
 */
export async function buildNflGoatBriefcase(opts = {}) {
  const briefcase = createEmptyNflGoatBriefcase({
    week: opts.week ?? null,
    season: opts.season ?? null,
    asOf: new Date().toISOString(),
    primarySource: isNflBdlPrimaryEnabled() ? "balldontlie_nfl" : "action_network",
  });

  if (!isNflBdlPrimaryEnabled() || !getNflBdlApiKey()) {
    briefcase.coverage = {
      ...briefcase.coverage,
      ...auditNflGoatBriefcaseCoverage(briefcase),
      note: "BDL NFL primary off or key missing — AN board remains live path",
    };
    return briefcase;
  }

  // Minimal hydrate: week odds + props for provided game ids (expand later).
  if (opts.season != null && opts.week != null) {
    briefcase.slate.odds = await fetchNflBdlWeekOdds({
      season: opts.season,
      week: opts.week,
    });
  }

  for (const gid of opts.gameIds || []) {
    const props = await fetchNflBdlPlayerPropsForGame(gid);
    briefcase.slate.playerProps.push(...props);
  }

  const audit = auditNflGoatBriefcaseCoverage(briefcase);
  briefcase.coverage = { ...briefcase.coverage, ...audit };
  return briefcase;
}
