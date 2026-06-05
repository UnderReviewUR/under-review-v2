/**
 * Minutes-weighted Golden Boot model.
 *
 * Adjusts raw market implied probabilities by:
 *   1. Team path depth (from Monte Carlo sim → expected games played)
 *   2. Starter likelihood (from player registry)
 *   3. Penalty taker bonus (from set piece seed)
 *
 * Output: adjusted Golden Boot ranking alongside raw market odds.
 */

import { WC_2026_TEAMS } from "../src/data/wc2026Teams.js";
import { getSetPieceTakersForNation } from "../src/data/wc2026SetPieceTakers.js";
import {
  parseAmericanOddsNumber,
  impliedProbFromAmerican,
  americanFromImpliedProb,
  formatAmericanOdds,
} from "./wcGoldenBootConsensus.js";
import { normalizeWcPlayerName } from "./wcPlayerRegistry.js";

// ── Constants ──

/** Baseline expected games: 3 group + 0 knockout = 3 (minimum for any team) */
const MIN_GAMES = 3;
/** Maximum games: 3 group + 4 knockout (R32, R16, QF, SF, Final) = 7 */
const MAX_GAMES = 7;
/** Expected minutes per game for a starter */
const STARTER_MINUTES = 85;
/** Expected minutes per game for a bench player */
const BENCH_MINUTES = 25;
/** PK taker bonus multiplier on goal expectation */
const PK_TAKER_BONUS = 1.12;

// ── Helpers ──

/**
 * Estimate expected tournament games for a team given sim results.
 * 3 group games guaranteed. Knockout games = probability of reaching each round.
 *
 * @param {{ advancePct: number, r32Pct: number, r16Pct: number, qfPct: number, sfPct: number, finalPct: number }} simStats
 * @returns {number} expected total games (3–7)
 */
function expectedGamesFromSim(simStats) {
  if (!simStats) return MIN_GAMES;
  // 3 group games + expected knockout games
  const knockoutGames =
    (simStats.r32Pct / 100) +
    (simStats.r16Pct / 100) +
    (simStats.qfPct / 100) +
    (simStats.sfPct / 100) +
    (simStats.finalPct / 100);
  return MIN_GAMES + knockoutGames;
}

/**
 * Estimate expected minutes for a player in the tournament.
 *
 * @param {number} expectedGames — team's expected total games
 * @param {boolean} isStarterLikely
 * @returns {number}
 */
function expectedMinutes(expectedGames, isStarterLikely) {
  const perGame = isStarterLikely ? STARTER_MINUTES : BENCH_MINUTES;
  return expectedGames * perGame;
}

/**
 * Baseline expected minutes for a starter on the median team (advance ~60%, ~4 games).
 */
const BASELINE_MINUTES = 4.0 * STARTER_MINUTES;

// ── Main ──

/**
 * @typedef {object} AdjustedGoldenBootRow
 * @property {string} name
 * @property {string} [nationAbbr]
 * @property {string} rawOdds — original market consensus
 * @property {number} rawImpliedProb
 * @property {number} minutesMultiplier
 * @property {boolean} pkTaker
 * @property {number} adjustedImpliedProb
 * @property {string} adjustedOdds
 * @property {number} adjustedRank
 * @property {number} expectedGames
 * @property {boolean} isStarterLikely
 */

/**
 * @param {Array<{ name: string, americanOdds: string, nationAbbr?: string }>} goldenBootRows
 * @param {{ teamStats?: Record<string, { advancePct: number, r32Pct: number, r16Pct: number, qfPct: number, sfPct: number, finalPct: number }>, playerRegistry?: Record<string, { players?: Array<{ name: string, isStarterLikely?: boolean }> }> }} context
 * @returns {{ rows: AdjustedGoldenBootRow[], method: string }}
 */
export function adjustGoldenBootOdds(goldenBootRows, context = {}) {
  const { teamStats = {}, playerRegistry = {} } = context;

  /** @type {AdjustedGoldenBootRow[]} */
  const adjusted = [];

  for (const row of goldenBootRows || []) {
    const american = parseAmericanOddsNumber(row.americanOdds);
    if (american == null) continue;
    const rawProb = impliedProbFromAmerican(american);
    if (rawProb == null || rawProb <= 0) continue;

    const abbr = String(row.nationAbbr || "").toUpperCase();
    const simTeam = teamStats[abbr];
    const expectedGames = expectedGamesFromSim(simTeam);

    // Look up starter status from registry
    const teamPlayers = playerRegistry[abbr]?.players || [];
    const normalizedName = normalizeWcPlayerName(row.name).toLowerCase();
    const registryMatch = teamPlayers.find(
      (p) => normalizeWcPlayerName(p.name).toLowerCase() === normalizedName,
    );
    const isStarterLikely = registryMatch?.isStarterLikely ?? true; // assume starter if unknown

    const playerMinutes = expectedMinutes(expectedGames, isStarterLikely);
    const minutesMultiplier = playerMinutes / BASELINE_MINUTES;

    // PK taker bonus
    const setPiece = getSetPieceTakersForNation(abbr);
    const isPkTaker = setPiece && normalizeWcPlayerName(setPiece.penaltyTaker).toLowerCase() === normalizedName;

    let adjustedProb = rawProb * minutesMultiplier;
    if (isPkTaker) adjustedProb *= PK_TAKER_BONUS;

    // Clamp to valid range
    adjustedProb = Math.min(adjustedProb, 0.95);
    adjustedProb = Math.max(adjustedProb, 0.001);

    const adjustedAmerican = americanFromImpliedProb(adjustedProb);

    adjusted.push({
      name: row.name,
      nationAbbr: row.nationAbbr,
      rawOdds: row.americanOdds,
      rawImpliedProb: Math.round(rawProb * 10000) / 100,
      minutesMultiplier: Math.round(minutesMultiplier * 100) / 100,
      pkTaker: Boolean(isPkTaker),
      adjustedImpliedProb: Math.round(adjustedProb * 10000) / 100,
      adjustedOdds: formatAmericanOdds(adjustedAmerican) || row.americanOdds,
      adjustedRank: 0,
      expectedGames: Math.round(expectedGames * 10) / 10,
      isStarterLikely,
    });
  }

  adjusted.sort((a, b) => b.adjustedImpliedProb - a.adjustedImpliedProb);
  adjusted.forEach((r, i) => {
    r.adjustedRank = i + 1;
  });

  return { rows: adjusted, method: "minutes_weighted_poisson_elo" };
}

/**
 * Format adjusted Golden Boot for UR Take prompt.
 * @param {{ rows: AdjustedGoldenBootRow[] }} adjusted
 * @param {number} [maxRows]
 * @returns {string}
 */
export function formatAdjustedGoldenBootForPrompt(adjusted, maxRows = 12) {
  if (!adjusted?.rows?.length) return "";

  const lines = [
    "ADJUSTED GOLDEN BOOT (minutes-weighted model — Poisson + Elo path depth + PK status):",
    "  Method: raw market odds × (expected tournament minutes / baseline) × PK taker bonus",
  ];

  for (const r of adjusted.rows.slice(0, maxRows)) {
    const pk = r.pkTaker ? " [PK]" : "";
    const starter = r.isStarterLikely ? "" : " [bench]";
    lines.push(
      `  ${r.adjustedRank}. ${r.name} (${r.nationAbbr || "?"}) ${r.adjustedOdds} (raw: ${r.rawOdds}) — ${r.expectedGames} exp games${pk}${starter}`,
    );
  }

  return lines.join("\n");
}
