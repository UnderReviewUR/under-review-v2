/**
 * Daily API-Football request budget tracker (free tier 100/day).
 */

import { getEtYmdAt } from "./wc2026Constants.js";
import {
  WC_API_FOOTBALL_DAILY_LIMIT,
  wcApiFootballBudgetRemaining,
} from "./wcApiFootballPolicy.js";

/**
 * @param {Record<string, unknown> | null | undefined} kvRoot
 * @param {number} [nowMs]
 */
export function wcApiFootballQuotaState(kvRoot, nowMs = Date.now()) {
  const ymd = getEtYmdAt(nowMs);
  const quota = kvRoot?.quota && typeof kvRoot.quota === "object" ? kvRoot.quota : {};
  const storedYmd = String(quota.dateYmd || "");
  const usedToday = storedYmd === ymd ? Number(quota.used) || 0 : 0;
  const apiRemaining =
    quota.apiRemaining != null && storedYmd === ymd ? Number(quota.apiRemaining) : null;

  return {
    dateYmd: ymd,
    usedToday,
    remainingBudget: wcApiFootballBudgetRemaining(usedToday),
    apiRemaining: Number.isFinite(apiRemaining) ? apiRemaining : null,
    dailyLimit: WC_API_FOOTBALL_DAILY_LIMIT,
  };
}

/**
 * @param {Record<string, unknown> | null | undefined} kvRoot
 * @param {number} cost
 * @param {number} [nowMs]
 * @param {{ apiRemaining?: number | null }} [meta]
 */
export function recordWcApiFootballQuota(kvRoot, cost, nowMs = Date.now(), meta = {}) {
  const ymd = getEtYmdAt(nowMs);
  const prev = wcApiFootballQuotaState(kvRoot, nowMs);
  const used = (prev.dateYmd === ymd ? prev.usedToday : 0) + Math.max(0, Number(cost) || 0);
  const apiRemaining =
    meta.apiRemaining != null && Number.isFinite(Number(meta.apiRemaining))
      ? Number(meta.apiRemaining)
      : prev.apiRemaining;

  return {
    dateYmd: ymd,
    used,
    apiRemaining,
    lastRequestAt: nowMs,
  };
}

/**
 * @param {Record<string, unknown> | null | undefined} kvRoot
 * @param {number} cost
 * @param {number} [nowMs]
 */
export function canSpendWcApiFootballQuota(kvRoot, cost, nowMs = Date.now()) {
  const state = wcApiFootballQuotaState(kvRoot, nowMs);
  return state.remainingBudget >= Math.max(0, Number(cost) || 0);
}
