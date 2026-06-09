/**
 * Client-side World Cup fallbacks — board always renders; never surfaces fetch failures.
 */

import { WC_2026_TEAMS } from "../src/data/wc2026Teams.js";
import { buildWcOutrightsSeedMap } from "./wcOutrightsSeed.js";
import { sanitizeWcTournamentWinnerOutrights } from "./wc2026OutrightOdds.js";
import { buildStaticGroupsFallback } from "./wcStaticGroupsFallback.js";
import { buildStaticPromoMatchesFallback } from "./wc2026PromoFixtures.js";
import { formatWcMarketsStatusChip } from "./wcProductVoice.js";

/**
 * @param {Record<string, unknown> | null | undefined} groupsData
 */
export function resolveClientWcGroups(groupsData) {
  if (groupsData?.groups && Object.keys(groupsData.groups).length >= 12) {
    return groupsData.groups;
  }
  return buildStaticGroupsFallback();
}

/**
 * @param {Record<string, unknown> | null | undefined} matchesData
 * @param {number} [nowMs]
 */
export function resolveClientWcMatches(matchesData, nowMs = Date.now()) {
  const rows = Array.isArray(matchesData?.matches) ? matchesData.matches : [];
  const real = rows.filter((m) => m?.id != null && !String(m.id).startsWith("wc-promo-"));
  if (real.length >= 8) return rows;
  const promo = buildStaticPromoMatchesFallback(nowMs);
  return promo.length ? promo : rows;
}

/**
 * @param {Record<string, unknown> | null | undefined} outrightsData
 */
export function resolveClientWcOutrightsKv(outrightsData) {
  const kv = outrightsData?.outrights;
  if (kv && typeof kv === "object" && Object.keys(kv).length >= 12) {
    const sanitized = sanitizeWcTournamentWinnerOutrights(kv);
    if (Object.keys(sanitized).length >= 12) return sanitized;
  }
  return buildWcOutrightsSeedMap();
}

/**
 * @param {Record<string, unknown> | null | undefined} outrightsData
 */
export function resolveClientWcOutrightsMeta(outrightsData) {
  const raw = outrightsData?.outrights;
  const sanitized =
    raw && typeof raw === "object" ? sanitizeWcTournamentWinnerOutrights(raw) : {};
  const referenceOnly =
    Boolean(outrightsData?.marketsReference) ||
    Object.keys(sanitized).length < Object.keys(raw || {}).length;

  return {
    marketsChip: formatWcMarketsStatusChip({
      ageMinutes: outrightsData?.ageMinutes ?? outrightsData?.freshness?.ageMinutes,
      lastUpdated: outrightsData?.lastUpdated ?? outrightsData?.updatedAt,
      referenceOnly,
    }),
    referenceOnly,
    lastUpdated: outrightsData?.lastUpdated ?? outrightsData?.updatedAt ?? Date.now(),
  };
}

/**
 * @param {Array<Record<string, unknown>>} teams
 */
export function stripWcTeamInternalMeta(teams) {
  return (teams || []).map((t) => {
    const row = { ...t };
    delete row.outrightOddsSource;
    return row;
  });
}
