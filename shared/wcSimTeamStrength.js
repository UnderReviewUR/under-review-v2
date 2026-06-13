/**
 * Phase 2a — rolling xG/form strength multipliers for WC tournament sim λ.
 * Built from completed FT match detail KV (BDL shot-map xG preferred; goals fallback).
 */

/** Last N tournament FTs per team. */
export const WC_SIM_STRENGTH_ROLLING_WINDOW = 2;

export const WC_SIM_ATTACK_CLAMP = 0.1;
export const WC_SIM_DEFENSE_CLAMP = 0.08;
export const WC_SIM_MULT_MIN = 0.88;
export const WC_SIM_MULT_MAX = 1.12;

/**
 * @param {number} n
 * @param {number} min
 * @param {number} max
 */
function clamp(n, min, max) {
  return Math.min(max, Math.max(min, n));
}

function round4(n) {
  return Math.round(Number(n) * 10000) / 10000;
}

/**
 * @param {Record<string, unknown>} match
 */
function matchSortKey(match) {
  const ts = Number(match?.commenceTs);
  if (Number.isFinite(ts) && ts > 0) return ts;
  const parsed = Date.parse(String(match?.date || "").slice(0, 10));
  return Number.isFinite(parsed) ? parsed : 0;
}

/**
 * @param {Record<string, unknown>} match
 * @param {Record<string, unknown> | null | undefined} detail
 * @returns {Record<string, { xgFor: number, xgAgainst: number, source: "bdl_xg" | "goals_proxy" }> | null}
 */
export function extractMatchTeamXgSignals(match, detail) {
  const home = String(match?.homeTeam || "").toUpperCase();
  const away = String(match?.awayTeam || "").toUpperCase();
  if (!home || !away) return null;

  const xg = detail?.bdlGoat?.xgSummary;
  if (xg && Number.isFinite(Number(xg.home)) && Number.isFinite(Number(xg.away))) {
    return {
      [home]: { xgFor: Number(xg.home), xgAgainst: Number(xg.away), source: "bdl_xg" },
      [away]: { xgFor: Number(xg.away), xgAgainst: Number(xg.home), source: "bdl_xg" },
    };
  }

  const homeScore = Number(match?.homeScore);
  const awayScore = Number(match?.awayScore);
  if (!Number.isFinite(homeScore) || !Number.isFinite(awayScore)) return null;

  const marginHome = homeScore - awayScore;
  const marginAway = awayScore - homeScore;
  return {
    [home]: {
      xgFor: 1.3 + marginHome * 0.35,
      xgAgainst: 1.3 - marginHome * 0.35,
      source: "goals_proxy",
    },
    [away]: {
      xgFor: 1.3 + marginAway * 0.35,
      xgAgainst: 1.3 - marginAway * 0.35,
      source: "goals_proxy",
    },
  };
}

/**
 * @param {{ attackMult?: number, defenseMult?: number } | null | undefined} attackRow
 * @param {{ attackMult?: number, defenseMult?: number } | null | undefined} defenseRow
 */
export function applyStrengthMultipliers(lambda, attackRow, defenseRow) {
  const base = Number(lambda);
  if (!Number.isFinite(base) || base <= 0) return base;
  const attackMult = Number(attackRow?.attackMult);
  const defenseMult = Number(defenseRow?.defenseMult);
  const a = Number.isFinite(attackMult) ? attackMult : 1;
  const d = Number.isFinite(defenseMult) ? defenseMult : 1;
  return base * a / d;
}

/**
 * @param {Array<Record<string, unknown>>} completedMatches
 * @param {Record<string, Record<string, unknown>>} detailByEventId
 * @param {{ rollingWindow?: number }} [opts]
 */
export function buildTeamStrengthMap(completedMatches, detailByEventId = {}, opts = {}) {
  const window = opts.rollingWindow ?? WC_SIM_STRENGTH_ROLLING_WINDOW;
  /** @type {Map<string, Array<{ xgFor: number, xgAgainst: number, source: string, sortKey: number }>>} */
  const byTeam = new Map();

  const sorted = [...(completedMatches || [])].sort((a, b) => matchSortKey(a) - matchSortKey(b));
  for (const m of sorted) {
    const eventId = String(m?.id || "");
    const detail = detailByEventId[eventId] || null;
    const signals = extractMatchTeamXgSignals(m, detail);
    if (!signals) continue;
    const sortKey = matchSortKey(m);
    for (const [abbr, sig] of Object.entries(signals)) {
      if (!byTeam.has(abbr)) byTeam.set(abbr, []);
      byTeam.get(abbr).push({ ...sig, sortKey });
    }
  }

  /** @type {Record<string, { attackMult: number, defenseMult: number, sampleMatches: number, xgMatches: number }>} */
  const teamStrength = {};
  let strengthMatchesApplied = 0;
  let xgMatchesApplied = 0;

  for (const [abbr, rows] of byTeam) {
    const recent = [...rows].sort((a, b) => b.sortKey - a.sortKey).slice(0, window);
    if (!recent.length) continue;

    const avgXgDiff = recent.reduce((s, r) => s + (r.xgFor - r.xgAgainst), 0) / recent.length;
    const avgXgAgainst = recent.reduce((s, r) => s + r.xgAgainst, 0) / recent.length;

    let attackMult = 1 + clamp(0.12 * avgXgDiff, -WC_SIM_ATTACK_CLAMP, WC_SIM_ATTACK_CLAMP);
    let defenseMult = 1 + clamp(0.08 * (avgXgAgainst - 1.0), -WC_SIM_DEFENSE_CLAMP, WC_SIM_DEFENSE_CLAMP);
    attackMult = clamp(attackMult, WC_SIM_MULT_MIN, WC_SIM_MULT_MAX);
    defenseMult = clamp(defenseMult, WC_SIM_MULT_MIN, WC_SIM_MULT_MAX);

    const xgCount = recent.filter((r) => r.source === "bdl_xg").length;
    strengthMatchesApplied += recent.length;
    xgMatchesApplied += xgCount;

    teamStrength[abbr] = {
      attackMult: round4(attackMult),
      defenseMult: round4(defenseMult),
      sampleMatches: recent.length,
      xgMatches: xgCount,
    };
  }

  return {
    teamStrength,
    strengthMatchesApplied,
    xgMatchesApplied,
    teamsWithStrength: Object.keys(teamStrength).length,
  };
}

/**
 * @param {{ teamStrength?: Record<string, { attackMult: number, defenseMult: number }> }} strengthResult
 */
export function buildSimStrengthFingerprintSuffix(strengthResult) {
  const xg = Number(strengthResult?.xgMatchesApplied) || 0;
  const teams = Number(strengthResult?.teamsWithStrength) || 0;
  return `str:${xg}:${teams}`;
}
