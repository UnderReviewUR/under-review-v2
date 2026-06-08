/**
 * World Cup odds freshness — shared contract for API, UR Take, and UI.
 */

export const WC_OUTRIGHTS_MAX_AGE_MS = 6 * 60 * 60 * 1000;
export const WC_MATCH_ML_MAX_AGE_MS = 30 * 60 * 1000;
export const WC_MATCH_ML_RAMP_TIGHT_MAX_AGE_MS = 10 * 60 * 1000;
export const WC_MATCH_ML_LIVE_MAX_AGE_MS = 5 * 60 * 1000;

const WC_RAMP_T90_MS = 90 * 60 * 1000;

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
    sourceTier: kvOutrights.sourceTier || null,
    stale: freshness.isStale,
    freshness,
  };
}

/**
 * @param {Record<string, unknown> | null | undefined} match
 * @param {number} [nowMs]
 */
export function resolveMatchMlMaxAgeMs(match, nowMs = Date.now()) {
  const status = String(match?.status || "").toLowerCase();
  if (["live", "ht", "1h", "2h", "in_progress"].includes(status)) {
    return WC_MATCH_ML_LIVE_MAX_AGE_MS;
  }

  const commenceTs = Number(match?.commenceTs);
  if (Number.isFinite(commenceTs)) {
    const untilKickMs = commenceTs - nowMs;
    if (untilKickMs > 0 && untilKickMs <= WC_RAMP_T90_MS) {
      return WC_MATCH_ML_RAMP_TIGHT_MAX_AGE_MS;
    }
  }

  return WC_MATCH_ML_MAX_AGE_MS;
}

/**
 * @param {Record<string, unknown> | null | undefined} odds
 * @param {string} [homeTeam]
 * @param {string} [awayTeam]
 */
export function formatMatchOddsForPrompt(odds, homeTeam = "HOME", awayTeam = "AWAY") {
  if (!odds || typeof odds !== "object") return null;

  const home = odds.home?.moneyline;
  const draw = odds.draw?.moneyline;
  const away = odds.away?.moneyline;
  const parts = [];

  if (home != null && String(home).trim()) parts.push(`${homeTeam} ${String(home).trim()}`);
  if (draw != null && String(draw).trim()) parts.push(`Draw ${String(draw).trim()}`);
  if (away != null && String(away).trim()) parts.push(`${awayTeam} ${String(away).trim()}`);

  return parts.length ? parts.join(" · ") : null;
}

/**
 * @param {Record<string, unknown> | null | undefined} match
 * @param {number | null | undefined} [kvLastUpdatedMs]
 * @param {number} [nowMs]
 */
export function buildMatchOddsFreshness(match, kvLastUpdatedMs, nowMs = Date.now()) {
  if (!match?.odds) return null;

  const updatedAt = Number(match.oddsUpdatedAt ?? kvLastUpdatedMs);
  const maxAgeMs = resolveMatchMlMaxAgeMs(match, nowMs);
  return calculateOddsFreshness(updatedAt, maxAgeMs, nowMs);
}

/**
 * @param {Record<string, unknown> | null | undefined} match
 * @param {number} [nowMs]
 * @returns {string | null}
 */
export function buildMatchOddsFreshnessPromptBlock(match, nowMs = Date.now()) {
  if (!match?.odds) return null;

  const updatedAt = Number(match.oddsUpdatedAt);
  if (!Number.isFinite(updatedAt) || updatedAt <= 0) return null;

  const maxAgeMs = resolveMatchMlMaxAgeMs(match, nowMs);
  const freshness = calculateOddsFreshness(updatedAt, maxAgeMs, nowMs);
  const line = formatMatchOddsForPrompt(match.odds, match.homeTeam, match.awayTeam);
  if (!line) return null;

  const block = [
    `MATCH ODDS — ${match.homeTeam} vs ${match.awayTeam} (ESPN 1X2 moneylines):`,
    `  ${line}`,
    `  Last updated: ${freshness.fetchedAt || "unknown"}`,
    `  Freshness: ${freshness.ageText} (max ${freshness.maxAgeMinutes} min)`,
  ];

  if (freshness.isStale) {
    block.push(`  ODDS FRESHNESS (mandatory): ${freshness.staleWarning}`);
    block.push(
      "  Do not cite these match odds as live lines — use Elo-derived win/draw/loss structure only.",
    );
  } else {
    block.push("  When citing match moneylines, quote only the prices listed above.");
  }

  return block.join("\n");
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
  const tier = String(kvOutrights.sourceTier || "").toLowerCase();
  const tierLabel =
    tier === "live_merge"
      ? "LIVE MERGE (ESPN + Odds API consensus)"
      : tier === "stale_kv_fresh"
        ? "CACHED (within TTL — not today's scrape)"
        : tier === "stale_kv_aged"
          ? "CACHED AGED (structural framing only — do not say mispriced)"
          : tier === "static_seed"
            ? "REFERENCE SEED (cold-start lines — structural framing only)"
            : null;

  const block = [
    "CURRENT OUTRIGHT ODDS (multi-source chain: live merge → cached KV → reference seed):",
    ...lines,
    `Last updated: ${freshness.fetchedAt || "unknown"}`,
    `Freshness: ${freshness.ageText} (max ${freshness.maxAgeMinutes} min)`,
    `Source: ${source}${tierLabel ? ` · ${tierLabel}` : ""}`,
  ];

  if (tier === "static_seed" || tier === "stale_kv_aged") {
    block.push(
      "  These lines are NOT verified live book prices — cite them only as reference context; never claim mispriced vs today's market.",
    );
  }

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
