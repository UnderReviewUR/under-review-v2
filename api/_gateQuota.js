/**
 * Free-tier gate quota — shared by api/gate.js and api/ur-take.js.
 * Daily window: UTC calendar day (matches historical gate.js behavior).
 */

import { getDurableJson, setDurableJson } from "./_durableStore.js";
import { shouldRequireUrTakeAuth } from "./_urTakeAuth.js";

const GATE_TTL_SECONDS = 60 * 60 * 24 * 8;

export const FREE_QUERIES_PER_DAY = 3;

export function isGateServerQuotaEnforce() {
  const v = String(process.env.GATE_SERVER_QUOTA_ENFORCE ?? "")
    .trim()
    .toLowerCase();
  return v === "1" || v === "true" || v === "yes" || v === "on";
}

export function utcDateKey(ms = Date.now()) {
  return new Date(ms).toISOString().slice(0, 10);
}

export function countQueriesToday(queries, nowMs = Date.now()) {
  const day = utcDateKey(nowMs);
  return (queries || []).filter((ts) => {
    const n = Number(ts);
    return Number.isFinite(n) && n > 0 && utcDateKey(n) === day;
  }).length;
}

/**
 * @param {unknown[]} queries
 * @param {number} [nowMs]
 */
export function buildFreeQuotaPayload(queries, nowMs = Date.now()) {
  const used = countQueriesToday(queries, nowMs);
  return {
    used,
    limit: FREE_QUERIES_PER_DAY,
    remaining: Math.max(0, FREE_QUERIES_PER_DAY - used),
    dayKey: utcDateKey(nowMs),
  };
}

async function getRecord(email) {
  const key = "gate:" + String(email || "").toLowerCase().trim();
  return await getDurableJson(key);
}

async function setRecord(email, record) {
  const key = "gate:" + String(email || "").toLowerCase().trim();
  await setDurableJson(key, record, { ttlSeconds: GATE_TTL_SECONDS });
}

/**
 * @param {string} email
 * @param {number} [nowMs]
 */
export async function getFreeQuotaStatus(email, nowMs = Date.now()) {
  try {
    const normalized = String(email || "")
      .trim()
      .toLowerCase();
    if (!normalized) {
      return buildFreeQuotaPayload([], nowMs);
    }
    const record = (await getRecord(normalized)) || { queries: [] };
    return buildFreeQuotaPayload(record.queries || [], nowMs);
  } catch (err) {
    console.warn("[gate-quota] getFreeQuotaStatus failed open:", err?.message || err);
    return buildFreeQuotaPayload([], nowMs);
  }
}

/**
 * @param {object} opts
 * @param {boolean} [opts.enforceFlag]
 * @param {boolean} [opts.dailyTakePipeline]
 * @param {{ ok?: boolean, email?: string | null, tier?: string } | null} [opts.urAuth]
 */
export function shouldEnforceGateQuotaForTake(opts = {}) {
  const enforceFlag = opts.enforceFlag ?? isGateServerQuotaEnforce();
  if (!enforceFlag) return false;
  if (opts.dailyTakePipeline) return false;
  if (!shouldRequireUrTakeAuth()) return false;
  const urAuth = opts.urAuth;
  if (!urAuth?.ok || !urAuth.email) return false;
  const tier = String(urAuth.tier || "free").toLowerCase();
  if (tier === "pro" || tier === "owner" || tier === "friend") return false;
  return true;
}

/**
 * Reserve one free-tier unit before an Anthropic call.
 * Fail open on infra errors (skipped reservation).
 *
 * @param {string} email
 * @param {number} [nowMs]
 * @returns {Promise<{ limitReached: boolean, reservationTs: number | null, skipped?: boolean, freeQuota: ReturnType<typeof buildFreeQuotaPayload> }>}
 */
export async function reserveGateQuota(email, nowMs = Date.now()) {
  try {
    const normalized = String(email || "")
      .trim()
      .toLowerCase();
    const record = (await getRecord(normalized)) || { queries: [], emailVerified: true };
    const queries = Array.isArray(record.queries) ? [...record.queries] : [];
    const used = countQueriesToday(queries, nowMs);

    if (used >= FREE_QUERIES_PER_DAY) {
      return {
        limitReached: true,
        reservationTs: null,
        freeQuota: buildFreeQuotaPayload(queries, nowMs),
      };
    }

    const reservationTs = nowMs;
    queries.push(reservationTs);
    await setRecord(normalized, { ...record, queries, lastSeen: nowMs });

    return {
      limitReached: false,
      reservationTs,
      freeQuota: buildFreeQuotaPayload(queries, nowMs),
    };
  } catch (err) {
    console.warn("[gate-quota] reserve failed open:", err?.message || err);
    return {
      limitReached: false,
      reservationTs: null,
      skipped: true,
      freeQuota: buildFreeQuotaPayload([], nowMs),
    };
  }
}

/**
 * Refund a reserved unit when the take was not delivered.
 *
 * @param {string} email
 * @param {number | null} reservationTs
 * @param {number} [nowMs]
 */
export async function releaseGateQuota(email, reservationTs, nowMs = Date.now()) {
  if (reservationTs == null || !Number.isFinite(Number(reservationTs))) return;
  try {
    const normalized = String(email || "")
      .trim()
      .toLowerCase();
    const record = await getRecord(normalized);
    if (!record) return;
    const target = Number(reservationTs);
    const queries = (record.queries || []).filter((ts) => Number(ts) !== target);
    await setRecord(normalized, { ...record, queries, lastSeen: nowMs });
  } catch (err) {
    console.warn("[gate-quota] release failed:", err?.message || err);
  }
}

/**
 * @param {string} email
 * @param {number} [nowMs]
 */
export async function appendGateQuery(email, nowMs = Date.now()) {
  const r = await reserveGateQuota(email, nowMs);
  return r;
}

/**
 * Legacy consume — append without prior reserve (gate action: consume).
 * @param {string} email
 * @param {number} [nowMs]
 */
export async function consumeGateQuery(email, nowMs = Date.now()) {
  const r = await reserveGateQuota(email, nowMs);
  return {
    ok: !r.limitReached,
    used: r.freeQuota?.used ?? 0,
    remaining: r.freeQuota?.remaining ?? 0,
    freeQuota: r.freeQuota,
  };
}

/**
 * @param {string} email
 * @param {number} [nowMs]
 */
export async function checkGateQuotaAllowed(email, nowMs = Date.now()) {
  try {
    const normalized = String(email || "")
      .trim()
      .toLowerCase();
    const record = (await getRecord(normalized)) || { queries: [] };
    const freeQuota = buildFreeQuotaPayload(record.queries || [], nowMs);
    if (freeQuota.used >= FREE_QUERIES_PER_DAY) {
      return { allowed: false, reason: "limit_reached", freeQuota };
    }
    return { allowed: true, freeQuota };
  } catch (err) {
    console.warn("[gate-quota] check failed open:", err?.message || err);
    return { allowed: true, freeQuota: buildFreeQuotaPayload([], nowMs), skipped: true };
  }
}
