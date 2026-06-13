/**
 * WC advance misprice snapshots — sim vs BDL book implied % (monitoring / drift diff).
 */

import {
  americanToImpliedProbPct,
  WC_ADVANCEMENT_MARKET,
  wcAdvancementMarketMeta,
} from "./wcAdvancementMarket.js";
import { WC_ADVANCEMENT_TO_BDL_MARKET } from "./wcBdlFutures.js";
import { wcTeamsByGroupLetter } from "./wcGroupMispriceRanking.js";

export const WC_MISPRICE_DRIFT_DELTA_THRESHOLD = 5;

/**
 * @param {number} delta
 * @returns {"pass" | "lean" | "neutral"}
 */
export function classifyAdvanceMispriceLean(delta) {
  const d = Number(delta);
  if (!Number.isFinite(d)) return "neutral";
  if (d < 0) return "pass";
  if (d > 0) return "lean";
  return "neutral";
}

/**
 * All teams with both sim advance % and BDL qualify_from_group price.
 * @param {{
 *   teamStats?: Record<string, Record<string, unknown>>,
 *   bdlFutures?: { byMarketType?: Record<string, Record<string, { american?: number }>> },
 * }} inputs
 */
export function computeAllAdvanceMisprices(inputs = {}) {
  const teamStats = inputs.teamStats || {};
  const marketRows = inputs.bdlFutures?.byMarketType?.qualify_from_group || {};
  const meta = wcAdvancementMarketMeta(WC_ADVANCEMENT_MARKET.GROUP_ESCAPE);
  const teamsByGroup = wcTeamsByGroupLetter();

  /** @type {Array<{ teamAbbr: string, group: string, simPct: number, impliedPct: number, delta: number, magnitude: number, american: number, lean: ReturnType<typeof classifyAdvanceMispriceLean> }>} */
  const rows = [];

  for (const letter of Object.keys(teamsByGroup).sort()) {
    for (const abbr of teamsByGroup[letter] || []) {
      const stats = teamStats[abbr];
      const simPct = Number(stats?.[meta.key]);
      const priceRow = marketRows[abbr];
      const american = priceRow?.american ?? null;
      if (!Number.isFinite(simPct) || simPct <= 0 || american == null) continue;

      const impliedPct = americanToImpliedProbPct(american);
      if (impliedPct == null) continue;

      const delta = simPct - impliedPct;
      rows.push({
        teamAbbr: abbr,
        group: letter,
        simPct: round1(simPct),
        impliedPct: round1(impliedPct),
        delta: round1(delta),
        magnitude: round1(Math.abs(delta)),
        american: Number(american),
        lean: classifyAdvanceMispriceLean(delta),
      });
    }
  }

  rows.sort((a, b) => b.magnitude - a.magnitude);
  return rows;
}

/**
 * @param {Array<ReturnType<typeof computeAllAdvanceMisprices>[number]>} rows
 * @param {number} [topN]
 */
export function pickTopMispriceRows(rows, topN = 10) {
  return (rows || []).slice(0, topN);
}

/**
 * @param {Record<string, unknown>} snapshot
 */
export function buildTeamDeltaIndex(snapshot) {
  /** @type {Record<string, { delta: number, lean: string, simPct: number, impliedPct: number }>} */
  const byTeam = {};
  for (const row of snapshot?.teams || []) {
    byTeam[String(row.teamAbbr).toUpperCase()] = {
      delta: Number(row.delta),
      lean: String(row.lean),
      simPct: Number(row.simPct),
      impliedPct: Number(row.impliedPct),
    };
  }
  return byTeam;
}

/**
 * @param {Record<string, unknown>} current
 * @param {Record<string, unknown> | null | undefined} prior
 * @param {number} [deltaThreshold]
 */
export function diffMispriceSnapshots(current, prior, deltaThreshold = WC_MISPRICE_DRIFT_DELTA_THRESHOLD) {
  if (!prior?.teams?.length) {
    return { hasPrior: false, moved: [], leanFlips: [], threshold: deltaThreshold };
  }

  const prev = buildTeamDeltaIndex(prior);
  /** @type {Array<{ teamAbbr: string, priorDelta: number, delta: number, deltaMove: number, lean: string, priorLean: string }>} */
  const moved = [];
  /** @type {Array<{ teamAbbr: string, priorLean: string, lean: string, priorDelta: number, delta: number }>} */
  const leanFlips = [];

  for (const row of current?.teams || []) {
    const abbr = String(row.teamAbbr).toUpperCase();
    const prevRow = prev[abbr];
    if (!prevRow) continue;

    const deltaMove = Number(row.delta) - Number(prevRow.delta);
    if (Math.abs(deltaMove) >= deltaThreshold) {
      moved.push({
        teamAbbr: abbr,
        priorDelta: round1(prevRow.delta),
        delta: round1(row.delta),
        deltaMove: round1(deltaMove),
        lean: String(row.lean),
        priorLean: String(prevRow.lean),
      });
    }

    if (row.lean !== prevRow.lean && row.lean !== "neutral" && prevRow.lean !== "neutral") {
      leanFlips.push({
        teamAbbr: abbr,
        priorLean: String(prevRow.lean),
        lean: String(row.lean),
        priorDelta: round1(prevRow.delta),
        delta: round1(row.delta),
      });
    }
  }

  moved.sort((a, b) => Math.abs(b.deltaMove) - Math.abs(a.deltaMove));
  return { hasPrior: true, moved, leanFlips, threshold: deltaThreshold };
}

/**
 * @param {{
 *   capturedAt: string,
 *   sim: Record<string, unknown>,
 *   bdl: Record<string, unknown>,
 *   teams: Array<Record<string, unknown>>,
 *   top10: Array<Record<string, unknown>>,
 * }} payload
 */
export function formatSnapshotRecord(payload) {
  return {
    capturedAt: payload.capturedAt,
    sim: payload.sim,
    bdl: payload.bdl,
    teamCount: payload.teams.length,
    teams: payload.teams,
    top10: payload.top10,
  };
}

/**
 * @param {Record<string, unknown>} simRow
 * @param {{ byMarketType?: Record<string, unknown>, lastUpdated?: number, source?: string } | null} bdlFutures
 * @param {number} [nowMs]
 */
export function buildMispriceSnapshotFromInputs(simRow, bdlFutures, nowMs = Date.now()) {
  const teams = computeAllAdvanceMisprices({
    teamStats: simRow?.teamStats,
    bdlFutures,
  });
  const top10 = pickTopMispriceRows(teams, 10);

  return formatSnapshotRecord({
    capturedAt: new Date(nowMs).toISOString(),
    sim: {
      lastUpdated: simRow?.lastUpdated ?? null,
      fingerprint: simRow?.fingerprint ?? null,
      source: simRow?.source ?? null,
      eloMatchesApplied: Number(simRow?.eloMatchesApplied) || 0,
      strengthMatchesApplied: Number(simRow?.strengthMatchesApplied) || 0,
      xgMatchesApplied: Number(simRow?.xgMatchesApplied) || 0,
      completedMatchCount: Number(simRow?.completedMatchCount) || 0,
    },
    bdl: {
      lastUpdated: bdlFutures?.lastUpdated ?? null,
      source: bdlFutures?.source ?? null,
    },
    teams,
    top10,
  });
}

function round1(n) {
  return Math.round(Number(n) * 10) / 10;
}
