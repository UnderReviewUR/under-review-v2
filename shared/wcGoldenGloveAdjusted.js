/**
 * Minutes-weighted Golden Glove model — path depth from tournament sim + GK registry.
 */

import {
  parseAmericanOddsNumber,
  impliedProbFromAmerican,
  americanFromImpliedProb,
  formatAmericanOdds,
} from "./wcGoldenBootConsensus.js";
import { normalizeWcPlayerName } from "./wcPlayerRegistry.js";

const MIN_GAMES = 3;
const GK_MINUTES_PER_GAME = 90;
const BASELINE_GK_MINUTES = 4.0 * GK_MINUTES_PER_GAME;

/**
 * @param {{ advancePct?: number, r32Pct?: number, r16Pct?: number, qfPct?: number, sfPct?: number, finalPct?: number }} simStats
 */
function expectedGamesFromSim(simStats) {
  if (!simStats) return MIN_GAMES;
  const knockoutGames =
    (Number(simStats.r32Pct) || 0) / 100 +
    (Number(simStats.r16Pct) || 0) / 100 +
    (Number(simStats.qfPct) || 0) / 100 +
    (Number(simStats.sfPct) || 0) / 100 +
    (Number(simStats.finalPct) || 0) / 100;
  return MIN_GAMES + knockoutGames;
}

/**
 * @param {string | null | undefined} position
 */
export function isRegistryGoalkeeperPosition(position) {
  const p = String(position || "").trim().toLowerCase();
  if (!p) return false;
  return p === "gk" || p === "g" || p.includes("goalkeeper") || p === "goalie";
}

/**
 * @param {Record<string, unknown> | null | undefined} registry
 * @param {string} nationAbbr
 */
export function lookupStarterGoalkeeper(registry, nationAbbr) {
  const abbr = String(nationAbbr || "").trim().toUpperCase();
  const players = registry?.teams?.[abbr]?.players || [];
  const gks = players.filter((p) => isRegistryGoalkeeperPosition(p?.position));
  if (!gks.length) return null;
  const starter = gks.find((p) => p.isStarterLikely);
  return starter || gks[0];
}

/**
 * @param {Array<{ name: string, americanOdds: string, nationAbbr?: string }>} goldenGloveRows
 * @param {{ teamStats?: Record<string, Record<string, unknown>>, playerRegistry?: Record<string, { players?: Array<Record<string, unknown>> }> }} context
 */
export function adjustGoldenGloveOdds(goldenGloveRows, context = {}) {
  const { teamStats = {}, playerRegistry = {} } = context;
  /** @type {Array<Record<string, unknown>>} */
  const adjusted = [];

  for (const row of goldenGloveRows || []) {
    const rawAmerican = parseAmericanOddsNumber(row.americanOdds);
    if (rawAmerican == null) continue;
    const rawProb = impliedProbFromAmerican(rawAmerican);
    const nation = String(row.nationAbbr || "").trim().toUpperCase();
    const simStats = nation ? teamStats[nation] : null;
    const expectedGames = expectedGamesFromSim(simStats);
    const gk = lookupStarterGoalkeeper(playerRegistry, nation);
    const isStarterLikely = gk ? Boolean(gk.isStarterLikely) || gk.name === row.name : true;
    const expectedMinutes = expectedGames * GK_MINUTES_PER_GAME * (isStarterLikely ? 1 : 0.15);
    const minutesMultiplier = Math.max(0.35, expectedMinutes / BASELINE_GK_MINUTES);

    let adjustedProb = rawProb * minutesMultiplier;
    adjustedProb = Math.min(adjustedProb, 0.92);
    adjustedProb = Math.max(adjustedProb, 0.001);
    const adjustedAmerican = americanFromImpliedProb(adjustedProb);

    adjusted.push({
      name: row.name,
      nationAbbr: nation || row.nationAbbr,
      rawOdds: row.americanOdds,
      rawImpliedProb: Math.round(rawProb * 10000) / 100,
      minutesMultiplier: Math.round(minutesMultiplier * 100) / 100,
      adjustedImpliedProb: Math.round(adjustedProb * 10000) / 100,
      adjustedOdds: formatAmericanOdds(adjustedAmerican) || row.americanOdds,
      adjustedRank: 0,
      expectedGames: Math.round(expectedGames * 10) / 10,
      isStarterLikely,
      registryGk: gk?.name ? normalizeWcPlayerName(String(gk.name)) : null,
    });
  }

  adjusted.sort((a, b) => b.adjustedImpliedProb - a.adjustedImpliedProb);
  adjusted.forEach((r, i) => {
    r.adjustedRank = i + 1;
  });

  return { rows: adjusted, method: "gk_minutes_weighted_poisson_elo" };
}

/**
 * @param {{ rows: Array<Record<string, unknown>> }} adjusted
 * @param {number} [maxRows]
 */
export function formatGoldenGloveOddsForPrompt(kvGoldenGlove, maxRows = 12) {
  const rows = Array.isArray(kvGoldenGlove?.rows) ? kvGoldenGlove.rows : [];
  if (!rows.length) {
    return [
      "GOLDEN GLOVE / BEST GOALKEEPER ODDS: No rows in KV — name a starter GK with structural path reasoning only; do not invent prices.",
    ].join("\n");
  }
  const fresh = kvGoldenGlove?.freshness;
  const lines = [
    "GOLDEN GLOVE / BEST GOALKEEPER ODDS (binding when answering Golden Glove / best goalkeeper slots):",
    `  Source: ${String(kvGoldenGlove?.source || "goal.com")}`,
    `  Freshness: ${fresh?.ageText || "unknown"}${fresh?.isStale ? " — STALE" : ""}`,
    "  Cite only goalkeeper names and American prices listed below.",
  ];
  for (const r of rows.slice(0, maxRows)) {
    const team = r.nationAbbr ? ` (${r.nationAbbr})` : "";
    lines.push(`  ${r.name}${team}: ${r.americanOdds}`);
  }
  return lines.join("\n");
}

/**
 * @param {{ rows: Array<Record<string, unknown>> }} adjusted
 * @param {number} [maxRows]
 */
export function formatAdjustedGoldenGloveForPrompt(adjusted, maxRows = 10) {
  if (!adjusted?.rows?.length) return "";
  const lines = [
    "ADJUSTED GOLDEN GLOVE (GK minutes model — Poisson + Elo path depth):",
    "  Method: raw Golden Glove market odds × (expected GK minutes / baseline). Deep knockout runs boost keepers on favorites.",
  ];
  for (const r of adjusted.rows.slice(0, maxRows)) {
    const bench = r.isStarterLikely ? "" : " [backup GK]";
    lines.push(
      `  ${r.adjustedRank}. ${r.name} (${r.nationAbbr || "?"}) ${r.adjustedOdds} (raw: ${r.rawOdds}) — ${r.expectedGames} exp team games${bench}`,
    );
  }
  return lines.join("\n");
}
