/**
 * Free-tier quota: 2 UR Takes per calendar week (Monday–Sunday, America/New_York).
 * Shared by api/gate.js and the client (src/lib/freeTierUsage.js).
 */

import { getEtYmdAt } from "./golfOddsCachePolicy.js";

export const FREE_QUESTIONS_PER_WEEK = 2;

/** @deprecated Use FREE_QUESTIONS_PER_WEEK — kept for imports named FREE_QUESTION_LIMIT */
export const FREE_QUESTION_LIMIT = FREE_QUESTIONS_PER_WEEK;

/**
 * @param {string} ymd
 */
function parseYmd(ymd) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(ymd || "").trim());
  if (!m) return null;
  return { y: parseInt(m[1], 10), mo: parseInt(m[2], 10), da: parseInt(m[3], 10) };
}

/**
 * Monday calendar date (YYYY-MM-DD) for the ET week containing nowMs.
 * @param {number} [nowMs]
 */
export function getEtWeekStartYmd(nowMs = Date.now()) {
  const etYmd = getEtYmdAt(nowMs);
  const parts = parseYmd(etYmd);
  if (!parts) return etYmd;

  const weekdayShort = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    weekday: "short",
  }).format(new Date(nowMs));

  const monOffset =
    { Mon: 0, Tue: 1, Wed: 2, Thu: 3, Fri: 4, Sat: 5, Sun: 6 }[weekdayShort] ?? 0;

  const base = new Date(Date.UTC(parts.y, parts.mo - 1, parts.da));
  base.setUTCDate(base.getUTCDate() - monOffset);
  return base.toISOString().slice(0, 10);
}

/**
 * @param {string} weekStartYmd Monday YYYY-MM-DD
 */
export function getNextEtWeekStartYmd(weekStartYmd) {
  const parts = parseYmd(weekStartYmd);
  if (!parts) return weekStartYmd;
  const base = new Date(Date.UTC(parts.y, parts.mo - 1, parts.da));
  base.setUTCDate(base.getUTCDate() + 7);
  return base.toISOString().slice(0, 10);
}

/**
 * @param {Array<number>} queries Unix ms timestamps
 * @param {number} [nowMs]
 */
export function countQueriesInCurrentEtWeek(queries, nowMs = Date.now()) {
  const weekId = getEtWeekStartYmd(nowMs);
  return (queries || []).filter((ts) => {
    const n = Number(ts);
    return Number.isFinite(n) && n > 0 && getEtWeekStartYmd(n) === weekId;
  }).length;
}

/**
 * @param {number} used
 * @param {number} [limit]
 */
export function isWithinFreeTierQuota(used, limit = FREE_QUESTIONS_PER_WEEK) {
  return used < limit;
}

/**
 * @param {number} used
 * @param {number} [limit]
 */
export function freeTierRemaining(used, limit = FREE_QUESTIONS_PER_WEEK) {
  return Math.max(0, limit - Math.max(0, used));
}

/**
 * True when ≥80% of allowance used but at least one remains (warn band).
 * @param {number} used
 * @param {number} [limit]
 */
export function freeTierApproachingLimit(used, limit = FREE_QUESTIONS_PER_WEEK) {
  const lim = Math.max(0, Number(limit) || 0);
  if (lim <= 0) return false;
  const u = Math.min(Math.max(0, Number(used) || 0), lim);
  const remaining = lim - u;
  if (remaining <= 0) return false;
  const maxRemainingInWarnBand = Math.ceil(lim * 0.2);
  return remaining <= maxRemainingInWarnBand;
}
