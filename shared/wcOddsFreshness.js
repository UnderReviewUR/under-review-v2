/**
 * World Cup odds freshness — shared contract for API, UR Take, and UI.
 */

export const WC_OUTRIGHTS_MAX_AGE_MS = 6 * 60 * 60 * 1000;
export const WC_MATCH_ML_MAX_AGE_MS = 30 * 60 * 1000;

const WC_OUTRIGHTS_MISPRICED_RULE =
  'When claiming a team is "mispriced", you MUST cite the exact odds from CURRENT OUTRIGHT ODDS above (team abbreviation + price).';

const WC_OUTRIGHTS_NO_MISPRICED_RULE =
  'If CURRENT OUTRIGHT ODDS is missing, stale, or says no live odds are available, never use the word "mispriced". Use structural language instead (e.g. "Based on group strength and tournament structure, this team should be priced...").';

const WC_OUTRIGHTS_NO_INVENT_RULE = "Do not invent odds under any circumstances.";

/**
 * @param {number | string | null | undefined} lastUpdatedMs
 * @param {number} [maxAgeMs]
 * @param {number} [nowMs]
 */
export function calculateOddsFreshness(
  lastUpdatedMs,
  maxAgeMs = WC_OUTRIGHTS_MAX_AGE_MS,
  nowMs = Date.now(),
) {
  const at = Number(lastUpdatedMs);
  const maxAgeMinutes = Math.round(maxAgeMs / 60000);

  if (!Number.isFinite(at) || at <= 0) {
    return {
      fetchedAt: null,
      isStale: true,
      ageMinutes: null,
      ageText: "unknown age",
      maxAgeMinutes,
      staleWarning:
        "Odds timestamp unavailable — do not cite specific American prices as current live lines; use structural framing only.",
    };
  }

  const ageMs = Math.max(0, nowMs - at);
  const ageMinutes = Math.round(ageMs / 60000);
  const isStale = ageMs > maxAgeMs;

  return {
    fetchedAt: new Date(at).toISOString(),
    isStale,
    ageMinutes,
    ageText: isStale ? `STALE (${ageMinutes} min ago)` : `${ageMinutes} min ago`,
    maxAgeMinutes,
    staleWarning: isStale
      ? `Odds data is more than ${maxAgeMinutes} minutes old — do not use "mispriced" language or cite specific American prices as current live lines; use structural framing only.`
      : null,
  };
}

/**
 * @param {Record<string, unknown> | null | undefined} kvOutrights
 * @param {number} [nowMs]
 */
export function attachOutrightsFreshness(kvOutrights, nowMs = Date.now()) {
  if (!kvOutrights) return null;

  const hasOutrights =
    kvOutrights.outrights &&
    typeof kvOutrights.outrights === "object" &&
    Object.keys(kvOutrights.outrights).length > 0;

  if (!hasOutrights) {
    return {
      ...kvOutrights,
      stale: true,
      freshness: calculateOddsFreshness(null, WC_OUTRIGHTS_MAX_AGE_MS, nowMs),
    };
  }

  const freshness = calculateOddsFreshness(
    kvOutrights.lastUpdated,
    WC_OUTRIGHTS_MAX_AGE_MS,
    nowMs,
  );

  return {
    ...kvOutrights,
    stale: freshness.isStale,
    freshness,
  };
}

/**
 * @param {Record<string, unknown> | null | undefined} match
 * @param {number | null | undefined} [kvLastUpdatedMs]
 * @param {number} [nowMs]
 */
export function buildMatchOddsFreshness(match, kvLastUpdatedMs, nowMs = Date.now()) {
  if (!match?.odds) return null;

  const updatedAt = Number(match.oddsUpdatedAt ?? kvLastUpdatedMs);
  return calculateOddsFreshness(updatedAt, WC_MATCH_ML_MAX_AGE_MS, nowMs);
}

/**
 * @param {Array<Record<string, unknown>>} matches
 * @param {number | null | undefined} [kvLastUpdatedMs]
 * @param {number} [nowMs]
 */
export function attachMatchListOddsFreshness(matches, kvLastUpdatedMs, nowMs = Date.now()) {
  return (matches || []).map((m) => {
    const oddsFreshness = buildMatchOddsFreshness(m, kvLastUpdatedMs, nowMs);
    if (!oddsFreshness) return m;
    return {
      ...m,
      oddsFreshness,
      oddsStale: oddsFreshness.isStale,
    };
  });
}

/**
 * @param {{ outrights?: Record<string, string>, lastUpdated?: number, source?: string, stale?: boolean, freshness?: ReturnType<typeof calculateOddsFreshness> } | null | undefined} kvOutrights
 * @param {number} [nowMs]
 * @returns {string | null}
 */
export function buildWcOutrightsFreshnessPromptBlock(kvOutrights, nowMs = Date.now()) {
  if (!kvOutrights?.outrights || Object.keys(kvOutrights.outrights).length === 0) {
    return null;
  }

  const freshness =
    kvOutrights.freshness ||
    calculateOddsFreshness(kvOutrights.lastUpdated, WC_OUTRIGHTS_MAX_AGE_MS, nowMs);
  const isStale = Boolean(kvOutrights.stale ?? freshness.isStale);

  const lines = Object.entries(kvOutrights.outrights)
    .sort((a, b) => {
      const oddsA = Number.parseInt(String(a[1]).replace(/[+-]/, ""), 10) || 99999;
      const oddsB = Number.parseInt(String(b[1]).replace(/[+-]/, ""), 10) || 99999;
      return oddsA - oddsB;
    })
    .slice(0, 20)
    .map(([abbr, odds]) => `  ${abbr}: ${odds}`);

  const source = String(kvOutrights.source || "espn").toUpperCase();
  const block = [
    "CURRENT OUTRIGHT ODDS (ESPN primary + Odds API fallback, refreshed ~every 3 hours):",
    ...lines,
    `Last updated: ${freshness.fetchedAt || "unknown"}`,
    `Freshness: ${freshness.ageText} (max ${freshness.maxAgeMinutes} min)`,
    `Source: ${source}`,
  ];

  if (isStale) {
    block.push(`ODDS FRESHNESS (mandatory): ${freshness.staleWarning}`);
    block.push(WC_OUTRIGHTS_NO_MISPRICED_RULE);
  } else {
    block.push(WC_OUTRIGHTS_MISPRICED_RULE);
  }

  block.push(WC_OUTRIGHTS_NO_INVENT_RULE);
  return block.join("\n");
}

/**
 * @param {{ stale?: boolean, freshness?: ReturnType<typeof calculateOddsFreshness>, lastUpdated?: number } | null | undefined} meta
 */
export function formatWcOutrightsStaleChipLabel(meta) {
  if (!meta) return null;
  if (!meta.stale) return null;
  const age = meta.freshness?.ageMinutes ?? meta.ageMinutes;
  if (age != null) return `Outrights stale (${age} min old)`;
  return "Outrights stale";
}
