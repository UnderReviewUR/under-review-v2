/**
 * Tournament winner outrights — multi-source chain with explicit provenance (not silent stale).
 *
 * Tier order when writing KV:
 *   1. live merge (ESPN + Odds API consensus per team)
 *   2. stale_kv_fresh — prior KV still inside TTL
 *   3. stale_kv_aged — prior KV past TTL but usable with warning
 *   4. static_seed — wc2026Teams cold start
 */

import { buildWcOutrightsSeedPayload } from "./wcOutrightsSeed.js";
import { WC_OUTRIGHTS_MAX_AGE_MS } from "./wcOddsFreshness.js";
import { sanitizeWcTournamentWinnerOutrights } from "./wc2026OutrightOdds.js";
import {
  americanFromImpliedProb,
  formatAmericanOdds,
  impliedProbFromAmerican,
  parseAmericanOddsNumber,
} from "./wcGoldenBootConsensus.js";

/** @typedef {"live_merge"|"stale_kv_fresh"|"stale_kv_aged"|"static_seed"} WcOutrightsSourceTier */

/**
 * Merge outright maps — per team pick median implied prob across sources.
 * @param {Array<{ source: string, outrights: Record<string, string> }>} layers
 */
export function mergeWcOutrightsLayers(layers) {
  /** @type {Map<string, { probs: number[], sources: string[], samples: string[] }>} */
  const byTeam = new Map();

  for (const layer of layers || []) {
    const src = String(layer.source || "unknown");
    for (const [abbr, odds] of Object.entries(layer.outrights || {})) {
      const team = String(abbr || "").trim().toUpperCase();
      const american = parseAmericanOddsNumber(odds);
      const prob = american != null ? impliedProbFromAmerican(american) : null;
      if (!team || prob == null) continue;
      const formatted = formatAmericanOdds(american);
      if (!formatted || !isPlausibleWcTournamentWinnerOdds(formatted)) continue;
      const row = byTeam.get(team) || { probs: [], sources: [], samples: [] };
      row.probs.push(prob);
      row.sources.push(src);
      row.samples.push(String(odds));
      byTeam.set(team, row);
    }
  }

  /** @type {Record<string, string>} */
  const outrights = {};
  /** @type {Record<string, { sources: string[], samples: string[] }>} */
  const provenance = {};

  for (const [team, row] of byTeam) {
    const sorted = [...row.probs].sort((a, b) => a - b);
    const mid = sorted[Math.floor(sorted.length / 2)];
    const american = americanFromImpliedProb(mid);
    const formatted = formatAmericanOdds(american);
    if (!formatted) continue;
    outrights[team] = formatted;
    provenance[team] = {
      sources: [...new Set(row.sources)],
      samples: row.samples,
    };
  }

  return { outrights, provenance };
}

const MIN_AGG_OUTRIGHTS_ROWS = 8;

/**
 * @param {{
 *   espn?: { ok?: boolean, outrights?: Record<string, string>, error?: string },
 *   oddsApi?: { ok?: boolean, outrights?: Record<string, string>, error?: string },
 *   aggregators?: Array<{ source?: string, ok?: boolean, outrights?: Record<string, string>, error?: string }>,
 *   cached?: { outrights?: Record<string, string>, lastUpdated?: number, source?: string } | null,
 *   nowMs?: number,
 * }} input
 */
export function resolveWcOutrightsSourceChain(input) {
  const nowMs = Number(input.nowMs) || Date.now();
  const cached = input.cached;
  const layers = [];
  const attempts = [];

  if (input.espn?.ok && Object.keys(input.espn.outrights || {}).length) {
    layers.push({ source: "espn", outrights: input.espn.outrights });
    attempts.push({ source: "espn", ok: true });
  } else {
    attempts.push({ source: "espn", ok: false, error: input.espn?.error || "empty" });
  }

  if (input.oddsApi?.ok && Object.keys(input.oddsApi.outrights || {}).length) {
    layers.push({ source: "odds_api", outrights: input.oddsApi.outrights });
    attempts.push({ source: "odds_api", ok: true });
  } else {
    attempts.push({ source: "odds_api", ok: false, error: input.oddsApi?.error || "empty" });
  }

  for (const agg of input.aggregators || []) {
    const src = String(agg.source || "aggregator");
    const count = Object.keys(agg.outrights || {}).length;
    if (agg.ok && count >= MIN_AGG_OUTRIGHTS_ROWS) {
      layers.push({ source: src, outrights: agg.outrights });
      attempts.push({ source: src, ok: true, rowCount: count });
    } else {
      attempts.push({
        source: src,
        ok: false,
        error: agg.error || (count ? `too_few_rows_${count}` : "empty"),
        rowCount: count || 0,
      });
    }
  }

  if (layers.length) {
    const merged = mergeWcOutrightsLayers(layers);
    const sourceLabel =
      layers.length > 1 ? `live_merge:${layers.map((l) => l.source).join("+")}` : layers[0].source;
    return {
      ok: true,
      outrights: sanitizeWcTournamentWinnerOutrights(merged.outrights),
      source: sourceLabel,
      sourceTier: /** @type {WcOutrightsSourceTier} */ ("live_merge"),
      provenance: merged.provenance,
      attempts,
      fetchedAt: nowMs,
      seeded: false,
      servedStale: false,
    };
  }

  const cacheAgeMs =
    cached?.lastUpdated && Number.isFinite(Number(cached.lastUpdated))
      ? Math.max(0, nowMs - Number(cached.lastUpdated))
      : null;
  const cacheFresh =
    cacheAgeMs != null && Number.isFinite(cacheAgeMs) && cacheAgeMs <= WC_OUTRIGHTS_MAX_AGE_MS;

  if (cached?.outrights && Object.keys(cached.outrights).length) {
    return {
      ok: false,
      outrights: cached.outrights,
      source: String(cached.source || "stale_kv"),
      sourceTier: cacheFresh
        ? /** @type {WcOutrightsSourceTier} */ ("stale_kv_fresh")
        : /** @type {WcOutrightsSourceTier} */ ("stale_kv_aged"),
      provenance: cached.provenance || null,
      attempts,
      fetchedAt: cached.lastUpdated,
      seeded: false,
      servedStale: true,
      cacheAgeMs,
      error: attempts.map((a) => a.error).filter(Boolean).join("; ") || "all_live_sources_empty",
    };
  }

  const seed = buildWcOutrightsSeedPayload(nowMs);
  return {
    ok: true,
    outrights: seed.outrights,
    source: seed.source,
    sourceTier: /** @type {WcOutrightsSourceTier} */ ("static_seed"),
    provenance: null,
    attempts,
    fetchedAt: nowMs,
    seeded: true,
    servedStale: false,
    error: attempts.map((a) => a.error).filter(Boolean).join("; ") || "all_sources_empty",
  };
}
