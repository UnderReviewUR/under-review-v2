/**
 * Strip internal degradation flags from World Cup API responses (client never sees them).
 */

import { buildWcOutrightsSeedMap } from "./wcOutrightsSeed.js";
import { sanitizeWcTournamentWinnerOutrights } from "./wc2026OutrightOdds.js";
import { buildStaticGroupsFallback } from "./wcStaticGroupsFallback.js";
import { buildStaticPromoMatchesFallback } from "./wc2026PromoFixtures.js";
import { fetchOpenFootballWc2026Schedule } from "./wcOpenFootballSchedule.js";

/**
 * @param {Record<string, unknown> | null | undefined} payload
 * @param {string} [view]
 */
export function sanitizeWcPublicPayload(payload, view = "matches") {
  if (!payload || typeof payload !== "object") return payload;
  const out = { ...payload };

  delete out.error;
  delete out.fallback;
  delete out.stale;
  delete out.sourceTier;
  delete out.source;
  delete out.promo;
  delete out.refreshed;
  delete out.scheduleValidation;
  delete out.freshness;
  delete out.ageMinutes;

  if (view === "outrights" && out.outrights) {
    out.marketsLabel = "Tournament winner";
    out.outrights = sanitizeWcTournamentWinnerOutrights(out.outrights);
    if (out.lastUpdated) {
      out.updatedAt = out.lastUpdated;
      delete out.lastUpdated;
    }
  }

  if (Array.isArray(out.matches)) {
    out.matches = out.matches.map((m) => {
      if (!m || typeof m !== "object") return m;
      const row = { ...m };
      delete row.oddsStale;
      delete row.oddsFreshness;
      return row;
    });
  }

  return out;
}

/**
 * Guarantee non-empty outrights for public API (seed merged silently).
 * @param {Record<string, unknown> | null | undefined} payload
 */
export function ensureWcPublicOutrights(payload) {
  const base = payload && typeof payload === "object" ? { ...payload } : {};
  const raw =
    base.outrights && typeof base.outrights === "object" ? base.outrights : {};
  const sanitized = sanitizeWcTournamentWinnerOutrights(raw);
  const dropped = Object.keys(raw).length - Object.keys(sanitized).length;
  const tier = String(base.sourceTier || "").toLowerCase();
  const marketsReference =
    Boolean(base.marketsReference) ||
    tier === "static_seed" ||
    tier === "stale_kv_aged" ||
    dropped > 0;

  if (Object.keys(sanitized).length >= 12) {
    return sanitizeWcPublicPayload(
      {
        ...base,
        outrights: sanitized,
        marketsReference,
        lastUpdated: base.lastUpdated || Date.now(),
      },
      "outrights",
    );
  }
  const seed = buildWcOutrightsSeedMap();
  return sanitizeWcPublicPayload(
    {
      ...base,
      outrights: { ...seed, ...sanitized },
      marketsReference: true,
      lastUpdated: base.lastUpdated || Date.now(),
    },
    "outrights",
  );
}

/**
 * @param {Record<string, unknown> | null | undefined} payload
 */
export function ensureWcPublicGroups(payload) {
  const base = payload && typeof payload === "object" ? { ...payload } : {};
  const groups = base.groups && typeof base.groups === "object" ? base.groups : {};
  if (Object.keys(groups).length >= 12) {
    return sanitizeWcPublicPayload(base, "groups");
  }
  return sanitizeWcPublicPayload(
    {
      ...base,
      groups: buildStaticGroupsFallback(),
      lastUpdated: base.lastUpdated || Date.now(),
    },
    "groups",
  );
}

/**
 * @param {Record<string, unknown> | null | undefined} payload
 * @param {number} [nowMs]
 */
export function ensureWcPublicMatches(payload, nowMs = Date.now()) {
  const base = payload && typeof payload === "object" ? { ...payload } : {};
  const matches = Array.isArray(base.matches) ? base.matches : [];
  const real = matches.filter((m) => m?.id != null && !String(m.id).startsWith("wc-promo-"));
  if (real.length >= 8) {
    return sanitizeWcPublicPayload(base, "matches");
  }
  const promo = buildStaticPromoMatchesFallback(nowMs);
  if (promo.length) {
    return sanitizeWcPublicPayload(
      {
        ...base,
        matches: promo,
        lastUpdated: base.lastUpdated || nowMs,
      },
      "matches",
    );
  }
  return sanitizeWcPublicPayload(base, "matches");
}

/**
 * Server-side last resort when cron/cache is cold (async).
 */
export async function hydrateWcPublicMatchesIfEmpty(payload, nowMs = Date.now()) {
  const ensured = ensureWcPublicMatches(payload, nowMs);
  const real = (ensured.matches || []).filter(
    (m) => m?.id != null && !String(m.id).startsWith("wc-promo-"),
  );
  if (real.length >= 50) return ensured;

  const ofRes = await fetchOpenFootballWc2026Schedule();
  if (ofRes.ok && ofRes.matches.length >= 50) {
    return sanitizeWcPublicPayload(
      {
        ...ensured,
        matches: ofRes.matches,
        lastUpdated: nowMs,
      },
      "matches",
    );
  }
  return ensured;
}
