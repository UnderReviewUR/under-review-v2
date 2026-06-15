/**
 * BallDontLie GOAT trial — one-time seed into durable KV (persists after trial ends).
 */

import { getDurableJson, setDurableJson } from "./_durableStore.js";
import { getEnv } from "./_env.js";
import {
  bdlFifaFetch,
  bdlFifaFetchPaginated,
  fetchAllMatchesBdl,
  getBdlRequestDelayMs,
  normalizeBdlPlayerRow,
  normalizeBdlRosterRow,
} from "./_wcBdlFifa.js";
import {
  WC_BDL_GOAT_SEED_KV_KEY,
  WC_BDL_GOAT_SEED_TTL_SECONDS,
} from "../shared/wc2026Constants.js";
import { buildBdlFuturesIndex, summarizeBdlFuturesSeed } from "../shared/wcBdlFutures.js";

/**
 * @param {number} [nowMs]
 */
export async function readWcBdlGoatSeedFromKv(nowMs = Date.now()) {
  const raw = await getDurableJson(WC_BDL_GOAT_SEED_KV_KEY);
  if (!raw || typeof raw !== "object") return null;
  return {
    ...raw,
    summary: summarizeBdlFuturesSeed(raw),
    ageMs: raw.lastUpdated ? Math.max(0, nowMs - Number(raw.lastUpdated)) : null,
  };
}

/**
 * @param {{ includeMatches?: boolean, includePlayers?: boolean, includeRosters?: boolean, delayMs?: number }} [opts]
 */
export async function scrapeAndCacheWcBdlGoatSeed(opts = {}) {
  const started = Date.now();
  const delayMs = opts.delayMs ?? getBdlRequestDelayMs();
  const apiKey = getEnv("BALLDONTLIE_API_KEY") || "";
  if (!apiKey) {
    return { ok: false, error: "missing_api_key", hint: "Set BALLDONTLIE_API_KEY for GOAT trial" };
  }

  /** @type {string[]} */
  const errors = [];
  let requestCount = 0;

  // Futures — single request, highest priority for R16 vs outright separation
  const futuresRes = await bdlFifaFetch("/odds/futures", { "seasons[]": 2026 });
  requestCount += 1;
  if (!futuresRes.ok) {
    errors.push(`futures: ${futuresRes.error}`);
  }
  const futuresRows = Array.isArray(futuresRes.data?.data) ? futuresRes.data.data : [];
  const futuresIndex = buildBdlFuturesIndex(futuresRows);

  /** @type {Record<string, unknown>} */
  const payload = {
    lastUpdated: Date.now(),
    seededAt: Date.now(),
    source: "balldontlie_goat_seed",
    trialNote:
      "GOAT trial snapshot — futures/matches frozen in KV; live scrape refresh still primary on game day.",
    futures: futuresIndex,
    byMarketType: futuresIndex.byMarketType,
    stats: {
      requestCount,
      futuresRows: futuresRows.length,
      durationMs: Date.now() - started,
    },
    errors,
  };

  if (opts.includeMatches !== false) {
    await new Promise((r) => setTimeout(r, delayMs));
    const matchesFetched = await fetchAllMatchesBdl({ delayMs });
    requestCount += matchesFetched.pages || 1;
    if (matchesFetched.ok) {
      payload.matches = {
        count: matchesFetched.matches.length,
        matches: matchesFetched.matches,
        source: "balldontlie",
      };
    } else {
      errors.push(`matches: ${matchesFetched.error || "failed"}`);
    }
  }

  if (opts.includePlayers) {
    await new Promise((r) => setTimeout(r, delayMs));
    const playersPaginated = await bdlFifaFetchPaginated(
      "/players",
      { "seasons[]": 2026, per_page: 100 },
      { maxPages: 30, delayMs },
    );
    requestCount += playersPaginated.pages;
    const players = [];
    for (const row of playersPaginated.rows) {
      const p = normalizeBdlPlayerRow(row);
      if (p) players.push(p);
    }
    payload.players = {
      count: players.length,
      players,
    };
    if (!playersPaginated.ok) {
      errors.push(`players: ${playersPaginated.error || "partial"}`);
    }
  }

  if (opts.includeRosters) {
    await new Promise((r) => setTimeout(r, delayMs));
    const rostersPaginated = await bdlFifaFetchPaginated(
      "/rosters",
      { "seasons[]": 2026, per_page: 100 },
      { maxPages: 20, delayMs },
    );
    requestCount += rostersPaginated.pages;
    const rosters = [];
    for (const row of rostersPaginated.rows) {
      const r = normalizeBdlRosterRow(row);
      if (r) rosters.push(r);
    }
    payload.rosters = {
      count: rosters.length,
      rosters,
    };
    if (!rostersPaginated.ok) {
      errors.push(`rosters: ${rostersPaginated.error || "partial"}`);
    }
  }

  payload.stats = {
    ...payload.stats,
    requestCount,
    durationMs: Date.now() - started,
    marketTeamCounts: futuresIndex.marketTypes.reduce((acc, mt) => {
      acc[mt] = Object.keys(futuresIndex.byMarketType[mt] || {}).length;
      return acc;
    }, /** @type {Record<string, number>} */ ({})),
  };
  payload.errors = errors;

  const ok = futuresRows.length > 0;
  if (ok) {
    await setDurableJson(WC_BDL_GOAT_SEED_KV_KEY, payload, {
      ttlSeconds: WC_BDL_GOAT_SEED_TTL_SECONDS,
    });
  }

  return {
    ok,
    ...summarizeBdlFuturesSeed(payload),
    matchesCount: payload.matches?.count ?? 0,
    playersCount: payload.players?.count ?? 0,
    rostersCount: payload.rosters?.count ?? 0,
    stats: payload.stats,
    errors,
  };
}
