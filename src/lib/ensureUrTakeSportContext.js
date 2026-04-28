import {
  getTournamentFetchParam,
  isConfirmedAtpBoardFixture,
  normalizeTennisMatch,
  preferredTournamentScore,
} from "../features/app/helpers.jsx";
import { normalizeText } from "./normalizeText.js";

const CACHE_TTL_MS = 90_000;
const FETCH_TIMEOUT_MS = 5000;

/** @type {Map<string, { payload: unknown; ts: number }>} */
const memory = new Map();

/** Coalesce concurrent network fetches per sport key */
const inFlight = new Map();

/**
 * Empty MLB/NBA board payloads are not cached — otherwise a midnight empty slate
 * can stick for CACHE_TTL_MS and block fresh games/props after hooks refresh.
 * @param {string} sport
 * @param {unknown} payload
 */
function isEmptySportPayload(sport, payload) {
  if (payload == null || typeof payload !== "object") return true;
  if (sport === "mlb") {
    const o = /** @type {{ games?: unknown[]; propLines?: unknown[] }} */ (payload);
    const g = o.games;
    const p = o.propLines;
    const hasGames = Array.isArray(g) && g.length > 0;
    const hasProps = Array.isArray(p) && p.length > 0;
    return !hasGames && !hasProps;
  }
  if (sport === "nba") {
    const p = /** @type {Record<string, unknown>} */ (payload);
    const g = p.todaysGames;
    const pl = p.propLines;
    const stats = p.playerStats;
    const meta = p.todaysGamesSlateMeta;
    const hasGames = Array.isArray(g) && g.length > 0;
    const hasProps = Array.isArray(pl) && pl.length > 0;
    const hasStats = Array.isArray(stats) && stats.length > 0;
    const hasSlateNote = !!(meta && String(meta.note || "").trim());
    return !hasGames && !hasProps && !hasStats && !hasSlateNote;
  }
  return false;
}

function fetchWithTimeout(url, init = {}) {
  const c = new AbortController();
  const id = window.setTimeout(() => c.abort(), FETCH_TIMEOUT_MS);
  return fetch(url, { ...init, signal: c.signal, cache: "no-store" }).finally(() =>
    window.clearTimeout(id),
  );
}

async function fetchJson(url) {
  const res = await fetchWithTimeout(url);
  if (!res.ok) throw new Error(String(res.status));
  return res.json();
}

async function buildAtpLiveMatches(activeContext) {
  let atpData = [];
  try {
    const tournamentParam = getTournamentFetchParam(activeContext);
    const atpRes = await fetchWithTimeout(
      `/api/tennis?tour=atp&activeTournament=${encodeURIComponent(tournamentParam)}`,
    );
    const data = await atpRes.json();
    atpData = atpRes.ok && Array.isArray(data) ? data : [];
  } catch {
    atpData = [];
  }

  const confirmedAtp = atpData.filter(isConfirmedAtpBoardFixture);
  const merged = confirmedAtp
    .map((m) => normalizeTennisMatch(m, "ATP", activeContext))
    .filter(Boolean);
  const seen = new Set();
  const deduped = [];
  for (const m of merged) {
    const key = [
      normalizeText(m.league),
      normalizeText(m.raw?.home),
      normalizeText(m.raw?.away),
      normalizeText(m.network),
      normalizeText(m.raw?.round),
      normalizeText(m.raw?.event_date),
    ].join("|");
    if (!seen.has(key)) {
      seen.add(key);
      deduped.push(m);
    }
  }
  return deduped.sort((a, b) => {
    const aLive = String(a?.raw?.live || "0") === "1" ? 1 : 0;
    const bLive = String(b?.raw?.live || "0") === "1" ? 1 : 0;
    if (aLive !== bLive) return bLive - aLive;
    const aPref = preferredTournamentScore(a, activeContext);
    const bPref = preferredTournamentScore(b, activeContext);
    if (aPref !== bPref) return bPref - aPref;
    const aTime = Number.isFinite(a.commenceTs) ? a.commenceTs : Number.MAX_SAFE_INTEGER;
    const bTime = Number.isFinite(b.commenceTs) ? b.commenceTs : Number.MAX_SAFE_INTEGER;
    return aTime - bTime;
  });
}

function readCache(key) {
  const e = memory.get(key);
  if (!e) return null;
  if (Date.now() - e.ts > CACHE_TTL_MS) {
    memory.delete(key);
    return null;
  }
  return e.payload;
}

function writeCache(key, payload) {
  memory.set(key, { payload, ts: Date.now() });
}

function nowMs() {
  return typeof performance !== "undefined" ? performance.now() : Date.now();
}

function packTennisWta(players, context) {
  return { players, context };
}

function packTennisAtp(players, context, liveMatches) {
  return { players, context, liveMatches };
}

/**
 * @param {string} sport
 * @param {Record<string, unknown>} hooks
 * @returns {unknown | null}
 */
function payloadFromHooks(sport, hooks) {
  if (sport === "nba") {
    const p = hooks.nbaData || null;
    if (!p) return null;
    return isEmptySportPayload("nba", p) ? null : p;
  }
  if (sport === "mlb") {
    const p = hooks.mlbData || null;
    if (!p) return null;
    return isEmptySportPayload("mlb", p) ? null : p;
  }
  if (sport === "golf") return hooks.golfData || null;
  if (sport === "f1") return hooks.f1Data || null;
  if (sport === "nfl") return hooks.nflContextData || null;
  if (sport === "tennis_wta_profile") {
    if (hooks.players && hooks.context) return packTennisWta(hooks.players, hooks.context);
    return null;
  }
  if (sport === "tennis") {
    if (hooks.players && hooks.context && Array.isArray(hooks.liveMatches)) {
      return packTennisAtp(hooks.players, hooks.context, hooks.liveMatches);
    }
    return null;
  }
  return null;
}

async function fetchPayloadForSport(sport) {
  if (sport === "nba") return fetchJson("/api/nba?view=board");
  if (sport === "mlb") return fetchJson("/api/mlb?view=board");
  if (sport === "golf") return fetchJson("/api/golf?view=board");
  if (sport === "f1") return fetchJson("/api/f1");
  if (sport === "nfl") return fetchJson("/api/nfl-context");
  if (sport === "tennis_wta_profile") {
    const [players, context] = await Promise.all([
      fetchJson("/api/tennis-players"),
      fetchJson("/api/tennis-context"),
    ]);
    return packTennisWta(players, context);
  }
  if (sport === "tennis") {
    const [players, context] = await Promise.all([
      fetchJson("/api/tennis-players"),
      fetchJson("/api/tennis-context"),
    ]);
    const liveMatches = await buildAtpLiveMatches(context);
    return packTennisAtp(players, context, liveMatches);
  }
  return null;
}

export function overridesFromPayload(sport, payload) {
  if (payload == null) return {};
  if (sport === "nba") return { nbaData: payload };
  if (sport === "mlb") return { mlbData: payload };
  if (sport === "golf") return { golfData: payload };
  if (sport === "f1") return { f1Data: payload };
  if (sport === "nfl") return { nflContextData: payload };
  if (sport === "tennis_wta_profile") {
    return { tennisPlayers: payload.players, tennisContext: payload.context };
  }
  if (sport === "tennis") {
    return {
      tennisPlayers: payload.players,
      tennisContext: payload.context,
      tennisLiveMatches: payload.liveMatches,
    };
  }
  return {};
}

/**
 * @returns {{ cacheHit: boolean, fetchMs: number, overrides: Record<string, unknown> }}
 */
export async function ensureUrTakeSportContext(sportHint, hooks) {
  const sport = String(sportHint || "").trim() || "generic";
  const t0 = nowMs();

  if (!sport || sport === "generic" || sport === "image_review") {
    return { cacheHit: false, fetchMs: 0, overrides: {} };
  }

  const cached = readCache(sport);
  if (cached != null) {
    if (isEmptySportPayload(sport, cached)) {
      memory.delete(sport);
    } else {
      return {
        cacheHit: true,
        fetchMs: 0,
        overrides: overridesFromPayload(sport, cached),
      };
    }
  }

  const hookPayload = payloadFromHooks(sport, hooks);
  if (hookPayload != null) {
    if (!isEmptySportPayload(sport, hookPayload)) {
      writeCache(sport, hookPayload);
    }
    return {
      cacheHit: true,
      fetchMs: Math.round(nowMs() - t0),
      overrides: overridesFromPayload(sport, hookPayload),
    };
  }

  const cacheKey = sport;

  if (inFlight.has(cacheKey)) {
    return inFlight.get(cacheKey);
  }

  const promise = (async () => {
    try {
      const fetched = await fetchPayloadForSport(sport);
      if (fetched != null && !isEmptySportPayload(sport, fetched)) {
        writeCache(sport, fetched);
      }
      return {
        cacheHit: false,
        fetchMs: Math.round(nowMs() - t0),
        overrides: overridesFromPayload(sport, fetched),
      };
    } catch {
      return {
        cacheHit: false,
        fetchMs: Math.round(nowMs() - t0),
        overrides: {},
      };
    }
  })();

  inFlight.set(cacheKey, promise);
  promise.finally(() => {
    inFlight.delete(cacheKey);
  });

  return promise;
}
