/**
 * NBA Finals outrights — freshness + UR Take prompt blocks.
 */

import { NBA_INTENT } from "./nbaUrTakeIntent.js";

export const NBA_OUTRIGHTS_MAX_AGE_MS = 6 * 60 * 60 * 1000;

const NBA_SERIES_MISPRICED_RULE =
  'When claiming a team is "mispriced" to win the Finals series, you MUST cite the exact odds from NBA FINALS SERIES ODDS above (team abbreviation + price).';

const NBA_SERIES_NO_MISPRICED_RULE =
  'If NBA FINALS SERIES ODDS is missing, stale, or says no live odds are available, never use the word "mispriced". Use structural language instead.';

const NBA_MVP_MISPRICED_RULE =
  'When claiming a player is "mispriced" for Finals MVP, you MUST cite the exact odds from NBA FINALS MVP ODDS above (player name + price).';

const NBA_MVP_NO_MISPRICED_RULE =
  'If NBA FINALS MVP ODDS is missing, stale, or says no live odds are available, never use the word "mispriced". Use structural language instead.';

const NBA_NO_INVENT_RULE = "Do not invent Finals series or MVP odds under any circumstances.";

/**
 * @param {number | string | null | undefined} lastUpdatedMs
 * @param {number} [maxAgeMs]
 * @param {number} [nowMs]
 */
export function calculateOddsFreshness(
  lastUpdatedMs,
  maxAgeMs = NBA_OUTRIGHTS_MAX_AGE_MS,
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
        "NBA outrights timestamp unavailable — do not cite specific American prices as current live lines; use structural framing only.",
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
      ? `NBA outrights are more than ${maxAgeMinutes} minutes old — do not use "mispriced" language or cite specific American prices as current live lines.`
      : null,
  };
}

/**
 * @param {Record<string, unknown> | null | undefined} kvRow
 * @param {number} [nowMs]
 */
export function attachNbaOutrightsFreshness(kvRow, nowMs = Date.now()) {
  if (!kvRow) return null;

  const hasOutrights =
    kvRow.outrights &&
    typeof kvRow.outrights === "object" &&
    Object.keys(kvRow.outrights).length > 0;

  if (!hasOutrights) {
    return {
      ...kvRow,
      stale: true,
      freshness: calculateOddsFreshness(null, NBA_OUTRIGHTS_MAX_AGE_MS, nowMs),
    };
  }

  const freshness = calculateOddsFreshness(
    kvRow.lastUpdated,
    NBA_OUTRIGHTS_MAX_AGE_MS,
    nowMs,
  );

  return {
    ...kvRow,
    stale: freshness.isStale,
    freshness,
  };
}

/**
 * @param {Record<string, string>} outrights
 * @param {string[]} [focusAbbrevs]
 */
export function filterNbaSeriesOutrightsForQuestion(outrights, focusAbbrevs = []) {
  if (!outrights || typeof outrights !== "object") return {};
  const focus = (focusAbbrevs || []).map((t) => String(t || "").toUpperCase()).filter(Boolean);
  if (!focus.length) return { ...outrights };
  /** @type {Record<string, string>} */
  const out = {};
  for (const abbr of focus) {
    if (outrights[abbr]) out[abbr] = outrights[abbr];
  }
  return Object.keys(out).length ? out : { ...outrights };
}

/**
 * @param {Array<{ name?: string, odds?: string }>} candidates
 * @param {string} question
 * @param {string[]} [requiredEntities]
 */
export function filterNbaMvpCandidatesForQuestion(candidates, question, requiredEntities = []) {
  const rows = Array.isArray(candidates) ? candidates : [];
  const ql = String(question || "").toLowerCase();
  const focusTeams = new Set(
    (requiredEntities || []).map((t) => String(t || "").toUpperCase()).filter(Boolean),
  );

  let filtered = rows;
  if (focusTeams.size) {
    filtered = rows.filter((r) => focusTeams.has(String(r?.team || "").toUpperCase()));
    if (!filtered.length) filtered = rows;
  }

  const nameHit = rows.find((r) => {
    const n = String(r?.name || "").toLowerCase();
    return n && ql.includes(n);
  });
  if (nameHit) {
    const n = String(nameHit.name || "").toLowerCase();
    const byName = rows.filter((r) => String(r?.name || "").toLowerCase().includes(n.split(" ")[0]));
    if (byName.length) filtered = byName;
  }

  return filtered.slice(0, 8);
}

function buildSeriesBlock(seriesKv, focusAbbrevs) {
  const scoped = filterNbaSeriesOutrightsForQuestion(seriesKv?.outrights || {}, focusAbbrevs);
  if (!Object.keys(scoped).length) return null;

  const freshness =
    seriesKv?.freshness ||
    calculateOddsFreshness(seriesKv?.lastUpdated, NBA_OUTRIGHTS_MAX_AGE_MS);
  const isStale = Boolean(seriesKv?.stale ?? freshness.isStale);

  const lines = Object.entries(scoped)
    .sort((a, b) => {
      const oddsA = Number.parseInt(String(a[1]).replace(/[+-]/, ""), 10) || 99999;
      const oddsB = Number.parseInt(String(b[1]).replace(/[+-]/, ""), 10) || 99999;
      return oddsA - oddsB;
    })
    .slice(0, 8)
    .map(([abbr, odds]) => `  ${abbr}: ${odds}`);

  const block = [
    "NBA FINALS SERIES ODDS (ESPN primary + Odds API fallback, refreshed ~every 4 hours):",
    ...lines,
    `Last updated: ${freshness.fetchedAt || "unknown"}`,
    `Freshness: ${freshness.ageText} (max ${freshness.maxAgeMinutes} min)`,
    `Source: ${String(seriesKv?.source || "espn").toUpperCase()}`,
  ];

  if (isStale) {
    block.push(`ODDS FRESHNESS (mandatory): ${freshness.staleWarning}`);
    block.push(NBA_SERIES_NO_MISPRICED_RULE);
  } else {
    block.push(NBA_SERIES_MISPRICED_RULE);
  }
  block.push(NBA_NO_INVENT_RULE);
  return block.join("\n");
}

function buildMvpBlock(mvpKv, question, requiredEntities) {
  const candidates = filterNbaMvpCandidatesForQuestion(
    mvpKv?.candidates || [],
    question,
    requiredEntities,
  );
  const outrights = mvpKv?.outrights || {};
  if (!candidates.length && !Object.keys(outrights).length) return null;

  const freshness =
    mvpKv?.freshness || calculateOddsFreshness(mvpKv?.lastUpdated, NBA_OUTRIGHTS_MAX_AGE_MS);
  const isStale = Boolean(mvpKv?.stale ?? freshness.isStale);

  const lines = candidates.length
    ? candidates.map((r) => {
        const team = r?.team ? ` (${r.team})` : "";
        return `  ${r.name}${team}: ${r.odds}`;
      })
    : Object.entries(outrights)
        .slice(0, 8)
        .map(([name, odds]) => `  ${name}: ${odds}`);

  const block = [
    "NBA FINALS MVP ODDS (ESPN futures, refreshed ~every 4 hours):",
    ...lines,
    `Last updated: ${freshness.fetchedAt || "unknown"}`,
    `Freshness: ${freshness.ageText} (max ${freshness.maxAgeMinutes} min)`,
    `Source: ${String(mvpKv?.source || "espn").toUpperCase()}`,
  ];

  if (isStale) {
    block.push(`ODDS FRESHNESS (mandatory): ${freshness.staleWarning}`);
    block.push(NBA_MVP_NO_MISPRICED_RULE);
  } else {
    block.push(NBA_MVP_MISPRICED_RULE);
  }
  block.push(NBA_NO_INVENT_RULE);
  return block.join("\n");
}

/**
 * @param {object} opts
 * @param {string} opts.nbaIntent
 * @param {string} opts.question
 * @param {string[]} [opts.requiredEntities]
 * @param {{ outrights?: Record<string, string>, lastUpdated?: number, source?: string, stale?: boolean, freshness?: object } | null} [opts.seriesKv]
 * @param {{ candidates?: Array<{ name?: string, odds?: string, team?: string }>, outrights?: Record<string, string>, lastUpdated?: number, source?: string, stale?: boolean, freshness?: object } | null} [opts.mvpKv]
 * @returns {string | null}
 */
export function formatNbaOutrightsForPrompt({
  nbaIntent,
  question = "",
  requiredEntities = [],
  seriesKv = null,
  mvpKv = null,
} = {}) {
  const blocks = [];
  if (
    nbaIntent === NBA_INTENT.SERIES_WINNER ||
    nbaIntent === NBA_INTENT.PREGAME_MATCHUP ||
    nbaIntent === NBA_INTENT.LIVE_IN_GAME
  ) {
    const seriesBlock = buildSeriesBlock(seriesKv, requiredEntities);
    if (seriesBlock) blocks.push(seriesBlock);
  }
  if (nbaIntent === NBA_INTENT.FINALS_MVP) {
    const mvpBlock = buildMvpBlock(mvpKv, question, requiredEntities);
    if (mvpBlock) blocks.push(mvpBlock);
  }
  if (nbaIntent === NBA_INTENT.SERIES_WINNER && blocks.length === 0) {
    const mvpBlock = buildMvpBlock(mvpKv, question, requiredEntities);
    if (mvpBlock) blocks.push(mvpBlock);
  }
  return blocks.length ? blocks.join("\n\n") : null;
}

/**
 * @param {object | null | undefined} seriesKv
 * @param {object | null | undefined} mvpKv
 */
export function nbaOutrightsInjectedForContext(seriesKv, mvpKv) {
  const hasSeries =
    seriesKv?.outrights && typeof seriesKv.outrights === "object" && Object.keys(seriesKv.outrights).length > 0;
  const hasMvp =
    (mvpKv?.outrights && Object.keys(mvpKv.outrights).length > 0) ||
    (Array.isArray(mvpKv?.candidates) && mvpKv.candidates.length > 0);
  return Boolean(hasSeries || hasMvp);
}
