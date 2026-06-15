/**
 * Precomputed group misprice ranking for WC UR Take context injection.
 */

import { WC_2026_TEAMS } from "../src/data/wc2026Teams.js";
import {
  americanToImpliedProbPct,
  classifyWcAdvancementMarket,
  WC_ADVANCEMENT_MARKET,
  wcAdvancementMarketMeta,
} from "./wcAdvancementMarket.js";
import { WC_ADVANCEMENT_TO_BDL_MARKET } from "./wcBdlFutures.js";
import { calculateOddsFreshness, WC_OUTRIGHTS_MAX_AGE_MS } from "./wcOddsFreshness.js";
import {
  buildWcSimAttributionLabel,
  isWcCrossGroupMispriceQuestion,
  isWcGroupPathMispriceQuestion,
} from "./wcTakeRetentionQA.js";

const GROUP_LETTERS = "ABCDEFGHIJKL".split("");

/**
 * @returns {Record<string, string[]>}
 */
export function wcTeamsByGroupLetter() {
  /** @type {Record<string, string[]>} */
  const byGroup = {};
  for (const team of WC_2026_TEAMS) {
    const g = String(team.group || "").toUpperCase();
    const abbr = String(team.abbreviation || "").toUpperCase();
    if (!g || !abbr) continue;
    if (!byGroup[g]) byGroup[g] = [];
    byGroup[g].push(abbr);
  }
  return byGroup;
}

/**
 * @param {string} question
 * @param {WcAdvancementMarketKind} [overrideMarket]
 */
function resolveMarketForRanking(question, overrideMarket) {
  const classified = classifyWcAdvancementMarket(question);
  if (classified) return classified;
  if (overrideMarket) return overrideMarket;
  return WC_ADVANCEMENT_MARKET.GROUP_ESCAPE;
}

/**
 * @param {{
 *   teamAbbr: string,
 *   group: string,
 *   simPct: number,
 *   impliedPct: number,
 *   delta: number,
 *   magnitude: number,
 *   marketKey: string,
 *   american: number | null,
 *   confidence: string,
 * }} row
 */
function formatRankingRow(row) {
  const sign = row.delta >= 0 ? "+" : "";
  return `{group: "${row.group}", team: "${row.teamAbbr}", delta: ${sign}${row.delta.toFixed(1)}, sim: ${row.simPct.toFixed(1)}%, market: ${row.impliedPct.toFixed(1)}%, confidence: "${row.confidence}"}`;
}

/**
 * @param {{
 *   teamStats?: Record<string, Record<string, unknown>>,
 *   bdlFutures?: { byMarketType?: Record<string, Record<string, { american?: number, americanDisplay?: string }>>, lastUpdated?: number },
 *   question?: string,
 *   nowMs?: number,
 *   topN?: number,
 * }} opts
 */
export function computeGroupMispriceRankings(opts = {}) {
  const teamStats = opts.teamStats || {};
  const byMarketType = opts.bdlFutures?.byMarketType || {};
  const question = String(opts.question || "");
  const nowMs = opts.nowMs ?? Date.now();
  const topN = opts.topN ?? 2;
  const market = resolveMarketForRanking(question);
  const meta = wcAdvancementMarketMeta(market);
  const bdlType = WC_ADVANCEMENT_TO_BDL_MARKET[market] || "qualify_from_group";
  const marketRows = byMarketType[bdlType] || {};

  const freshness = calculateOddsFreshness(
    opts.bdlFutures?.lastUpdated,
    WC_OUTRIGHTS_MAX_AGE_MS,
    nowMs,
  );
  const confidence = freshness.isStale ? "LOW" : "HIGH";

  const teamsByGroup = wcTeamsByGroupLetter();
  /** @type {Array<{ group: string, teamAbbr: string, simPct: number, impliedPct: number, delta: number, magnitude: number, marketKey: string, american: number | null, confidence: string }>} */
  const perTeam = [];

  for (const letter of GROUP_LETTERS) {
    const abbrs = teamsByGroup[letter] || [];
    for (const abbr of abbrs) {
      const stats = teamStats[abbr];
      const simPct = Number(stats?.[meta.key]);
      const priceRow = marketRows[abbr];
      const american = priceRow?.american ?? null;
      if (!Number.isFinite(simPct) || simPct <= 0 || american == null) continue;

      const impliedPct = americanToImpliedProbPct(american);
      if (impliedPct == null) continue;

      const delta = simPct - impliedPct;
      perTeam.push({
        group: letter,
        teamAbbr: abbr,
        simPct,
        impliedPct,
        delta,
        magnitude: Math.abs(delta),
        marketKey: meta.key,
        american,
        confidence,
      });
    }
  }

  /** @type {Record<string, typeof perTeam[0]>} */
  const bestPerGroup = {};
  for (const row of perTeam) {
    const prev = bestPerGroup[row.group];
    if (!prev || row.magnitude > prev.magnitude) {
      bestPerGroup[row.group] = row;
    }
  }

  const ranked = Object.values(bestPerGroup).sort((a, b) => b.magnitude - a.magnitude);
  return ranked.slice(0, topN);
}

/**
 * Within-group path comparison for "Group D advancement path" questions.
 * @param {{
 *   groupLetter: string,
 *   teamStats?: Record<string, Record<string, unknown>>,
 *   bdlFutures?: { byMarketType?: Record<string, Record<string, { american?: number }>>, lastUpdated?: number },
 *   nowMs?: number,
 * }} opts
 */
export function computeGroupPathComparisons(opts = {}) {
  const letter = String(opts.groupLetter || "D").toUpperCase();
  const teamStats = opts.teamStats || {};
  const byMarketType = opts.bdlFutures?.byMarketType || {};
  const nowMs = opts.nowMs ?? Date.now();
  const abbrs = wcTeamsByGroupLetter()[letter] || [];

  const freshness = calculateOddsFreshness(
    opts.bdlFutures?.lastUpdated,
    WC_OUTRIGHTS_MAX_AGE_MS,
    nowMs,
  );
  const confidence = freshness.isStale ? "LOW" : "HIGH";

  /** @type {Array<{ teamAbbr: string, path: string, simPct: number, impliedPct: number | null, delta: number | null, confidence: string }>} */
  const rows = [];

  const paths = [
    { path: "advance from group", key: "advancePct", bdl: "qualify_from_group" },
    { path: "win group", key: "groupWinPct", bdl: "group_winner" },
    { path: "win all group games", key: "groupSweepPct", bdl: "win_all_group_games" },
    { path: "finish bottom", key: "finishBottomPct", bdl: "finish_bottom" },
    { path: "reach Round of 16", key: "r16Pct", bdl: "to_reach_round_of_16" },
  ];

  for (const abbr of abbrs) {
    const stats = teamStats[abbr];
    if (!stats) continue;
    for (const p of paths) {
      const simPct = Number(stats[p.key]);
      if (!Number.isFinite(simPct) || simPct <= 0) continue;
      const american = byMarketType[p.bdl]?.[abbr]?.american ?? null;
      const impliedPct = american != null ? americanToImpliedProbPct(american) : null;
      const delta = impliedPct != null ? simPct - impliedPct : null;
      rows.push({
        teamAbbr: abbr,
        path: p.path,
        simPct,
        impliedPct,
        delta,
        confidence,
      });
    }
  }

  return rows.sort((a, b) => Math.abs(Number(b.delta) || 0) - Math.abs(Number(a.delta) || 0));
}

/**
 * @param {{
 *   teamStats?: Record<string, Record<string, unknown>>,
 *   bdlFutures?: { byMarketType?: Record<string, unknown>, lastUpdated?: number },
 *   question?: string,
 *   simLastUpdated?: number,
 *   nowMs?: number,
 * }} opts
 * @returns {string | null}
 */
export function formatGroupMispriceContextBlock(opts = {}) {
  const question = String(opts.question || "").trim();
  if (!question) return null;

  const simLabel = buildWcSimAttributionLabel(opts.simLastUpdated, opts.nowMs);
  const needsCrossGroup = isWcCrossGroupMispriceQuestion(question);
  const needsGroupPath = isWcGroupPathMispriceQuestion(question);

  if (!needsCrossGroup && !needsGroupPath) return null;

  const lines = [
    `GROUP_MISPRICE_RANKING ${simLabel} (UR internal — Poisson + Elo, not market consensus):`,
    "  Use these precomputed deltas when claiming misprice — do not invent percentages.",
  ];

  if (needsCrossGroup) {
    const ranked = computeGroupMispriceRankings({
      teamStats: opts.teamStats,
      bdlFutures: opts.bdlFutures,
      question,
      nowMs: opts.nowMs,
      topN: 3,
    });
    if (!ranked.length) {
      lines.push("  No BDL advancement lines available — use structural language only; do not say mispriced.");
    } else {
      lines.push("  Top groups by sim-vs-market delta (advancePct vs qualify_from_group):");
      for (const row of ranked) {
        lines.push(`    ${formatRankingRow(row)}`);
      }
      if (ranked.length >= 2) {
        lines.push(
          `  Binding: #1 is Group ${ranked[0].group} (${ranked[0].teamAbbr} ${ranked[0].delta >= 0 ? "+" : ""}${ranked[0].delta.toFixed(1)}pt) — cite Group ${ranked[1].group} as runner-up when claiming "most mispriced group".`,
        );
      }
    }
  }

  if (needsGroupPath) {
    const groupMatch = question.match(/\bgroup\s+([a-l])\b/i);
    const letter = groupMatch?.[1]?.toUpperCase() || "D";
    const paths = computeGroupPathComparisons({
      groupLetter: letter,
      teamStats: opts.teamStats,
      bdlFutures: opts.bdlFutures,
      nowMs: opts.nowMs,
    });
    lines.push(`  Group ${letter} advancement paths (compare at least two before picking "most mispriced"):`);
    if (!paths.length) {
      lines.push("  No path deltas available — compare teams structurally without inventing prices.");
    } else {
      for (const row of paths.slice(0, 6)) {
        const deltaStr =
          row.delta != null
            ? `${row.delta >= 0 ? "+" : ""}${row.delta.toFixed(1)}pt`
            : "no market line";
        lines.push(
          `    ${row.teamAbbr} ${row.path}: sim ${row.simPct.toFixed(1)}% · market ${row.impliedPct != null ? `${row.impliedPct.toFixed(1)}%` : "—"} · delta ${deltaStr} · ${row.confidence}`,
        );
      }
    }
  }

  return lines.join("\n");
}
