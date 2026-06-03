/**
 * Free-tier question allowance for the client (`App.jsx` `canAsk`, localStorage daily keys).
 * Anonymous: 3 questions per sessionId before email is required.
 * Identified: 3 questions per UTC day per email when GATE_SERVER_QUOTA_ENFORCE=1.
 */

import { getOrCreateUrSessionId } from "./urSessionId.js";

export const FREE_QUESTION_LIMIT = 3;
export const FREE_SESSION_QUESTION_LIMIT = 3;

const FREE_USED_KEY_PREFIX = "ur_free_used_";
const FREE_QUOTA_SNAPSHOT_KEY = "ur_free_quota_snapshot";
const SESSION_QUOTA_SNAPSHOT_KEY = "ur_session_quota_snapshot";
export const UR_FREE_QUOTA_LIMIT_EVENT = "ur-free-quota-limit";
export const UR_EMAIL_GATE_EVENT = "ur-email-gate-required";

/**
 * UTC calendar day key (matches api/_gateQuota.js).
 * @param {Date} [date]
 * @returns {string}
 */
export function getUtcDateKey(date = new Date()) {
  const d = date instanceof Date ? date : new Date(date);
  return d.toISOString().slice(0, 10);
}

/**
 * @deprecated Local timezone key — legacy reads only.
 * @param {Date} [date]
 * @returns {string} YYYY-MM-DD in local timezone
 */
export function getLocalDateKey(date = new Date()) {
  const d = date instanceof Date ? date : new Date(date);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/**
 * @param {string} dayKey
 * @returns {string}
 */
export function getFreeUsedStorageKeyForDay(dayKey) {
  return `${FREE_USED_KEY_PREFIX}${dayKey}`;
}

/**
 * @param {Date} [date]
 * @returns {string}
 */
export function getFreeUsedStorageKey(date = new Date()) {
  return getFreeUsedStorageKeyForDay(getUtcDateKey(date));
}

/**
 * @returns {number}
 */
export function readFreeTierUsedToday() {
  try {
    if (typeof localStorage === "undefined") return 0;
    const snapRaw = localStorage.getItem(FREE_QUOTA_SNAPSHOT_KEY);
    if (snapRaw) {
      const snap = JSON.parse(snapRaw);
      if (snap && snap.dayKey === getUtcDateKey()) {
        const n = parseInt(String(snap.used ?? "0"), 10);
        if (Number.isFinite(n) && n > 0) return Math.min(FREE_QUESTION_LIMIT, n);
        return 0;
      }
    }
    const raw = localStorage.getItem(getFreeUsedStorageKey());
    const n = parseInt(String(raw ?? "0"), 10);
    return Number.isFinite(n) && n > 0 ? Math.min(FREE_QUESTION_LIMIT, n) : 0;
  } catch {
    return 0;
  }
}

/**
 * @returns {number}
 */
export function readSessionQuotaUsed() {
  try {
    if (typeof localStorage === "undefined") return 0;
    const sessionId = getOrCreateUrSessionId();
    const snapRaw = localStorage.getItem(SESSION_QUOTA_SNAPSHOT_KEY);
    if (snapRaw) {
      const snap = JSON.parse(snapRaw);
      if (snap && snap.sessionId === sessionId) {
        const n = parseInt(String(snap.used ?? "0"), 10);
        if (Number.isFinite(n) && n > 0) return Math.min(FREE_SESSION_QUESTION_LIMIT, n);
        return 0;
      }
    }
    return 0;
  } catch {
    return 0;
  }
}

/**
 * @returns {boolean}
 */
export function hasStoredFreeTierEmail() {
  try {
    if (typeof localStorage === "undefined") return false;
    const email = String(localStorage.getItem("ur_email") || "").trim();
    return email.includes("@");
  } catch {
    return false;
  }
}

/**
 * Mirror server session quota into localStorage.
 * @param {{ used?: number, limit?: number, remaining?: number, scope?: string } | null | undefined} freeQuota
 * @returns {number}
 */
export function syncSessionQuotaFromServer(freeQuota) {
  if (!freeQuota || typeof freeQuota !== "object") {
    return readSessionQuotaUsed();
  }
  const limit = Math.max(0, Number(freeQuota.limit) || FREE_SESSION_QUESTION_LIMIT);
  const used = Math.min(limit, Math.max(0, Number(freeQuota.used) || 0));
  try {
    if (typeof localStorage !== "undefined") {
      const sessionId = getOrCreateUrSessionId();
      localStorage.setItem(
        SESSION_QUOTA_SNAPSHOT_KEY,
        JSON.stringify({ sessionId, used, limit, scope: "session" }),
      );
    }
  } catch {
    /* ignore */
  }
  return used;
}

/**
 * @param {{ used?: number, limit?: number, remaining?: number, dayKey?: string, scope?: string } | null | undefined} freeQuota
 * @returns {number}
 */
export function syncQuotaFromServer(freeQuota) {
  if (freeQuota?.scope === "session") {
    return syncSessionQuotaFromServer(freeQuota);
  }
  return syncFreeTierFromServer(freeQuota);
}

/**
 * Mirror server-authoritative quota into localStorage.
 * @param {{ used?: number, limit?: number, remaining?: number, dayKey?: string, scope?: string } | null | undefined} freeQuota
 * @returns {number}
 */
export function syncFreeTierFromServer(freeQuota) {
  if (freeQuota?.scope === "session") {
    return syncSessionQuotaFromServer(freeQuota);
  }
  if (!freeQuota || typeof freeQuota !== "object") {
    return readFreeTierUsedToday();
  }
  const dayKey = String(freeQuota.dayKey || getUtcDateKey());
  const limit = Math.max(0, Number(freeQuota.limit) || FREE_QUESTION_LIMIT);
  const used = Math.min(limit, Math.max(0, Number(freeQuota.used) || 0));
  try {
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(getFreeUsedStorageKeyForDay(dayKey), String(used));
      localStorage.setItem(
        FREE_QUOTA_SNAPSHOT_KEY,
        JSON.stringify({ dayKey, used, limit }),
      );
    }
  } catch {
    /* ignore */
  }
  return used;
}

/** Force client cache to daily limit and open the existing upgrade modal. */
export function applyFreeTierLimitReachedFromServer(freeQuota) {
  if (freeQuota?.scope === "session") {
    syncSessionQuotaFromServer(freeQuota);
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent(UR_EMAIL_GATE_EVENT));
    }
    return;
  }
  const payload =
    freeQuota && typeof freeQuota === "object"
      ? freeQuota
      : {
          used: FREE_QUESTION_LIMIT,
          limit: FREE_QUESTION_LIMIT,
          remaining: 0,
          dayKey: getUtcDateKey(),
        };
  syncFreeTierFromServer(payload);
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(UR_FREE_QUOTA_LIMIT_EVENT));
  }
}

/**
 * @returns {number}
 */
export function incrementFreeTierUsedToday() {
  const used = readFreeTierUsedToday();
  const next = Math.min(FREE_QUESTION_LIMIT, used + 1);
  try {
    if (typeof localStorage !== "undefined") {
      const dayKey = getUtcDateKey();
      localStorage.setItem(getFreeUsedStorageKeyForDay(dayKey), String(next));
      localStorage.setItem(
        FREE_QUOTA_SNAPSHOT_KEY,
        JSON.stringify({ dayKey, used: next, limit: FREE_QUESTION_LIMIT }),
      );
    }
  } catch {
    /* ignore */
  }
  return next;
}

/**
 * @returns {number}
 */
export function incrementSessionQuotaUsed() {
  const used = readSessionQuotaUsed();
  const next = Math.min(FREE_SESSION_QUESTION_LIMIT, used + 1);
  try {
    if (typeof localStorage !== "undefined") {
      const sessionId = getOrCreateUrSessionId();
      localStorage.setItem(
        SESSION_QUOTA_SNAPSHOT_KEY,
        JSON.stringify({
          sessionId,
          used: next,
          limit: FREE_SESSION_QUESTION_LIMIT,
          scope: "session",
        }),
      );
    }
  } catch {
    /* ignore */
  }
  return next;
}

/**
 * @param {number} [used]
 * @param {number} [limit]
 * @returns {boolean}
 */
export function isSessionQuotaAvailable(
  used = readSessionQuotaUsed(),
  limit = FREE_SESSION_QUESTION_LIMIT,
) {
  const lim = Math.max(0, Number(limit) || 0);
  const u = Math.min(Math.max(0, Number(used) || 0), lim);
  return u < lim;
}

/**
 * @param {number} [used]
 * @param {number} [limit]
 * @returns {boolean}
 */
export function isFreeTierQuotaAvailable(
  used = readFreeTierUsedToday(),
  limit = FREE_QUESTION_LIMIT,
) {
  const lim = Math.max(0, Number(limit) || 0);
  const u = Math.min(Math.max(0, Number(used) || 0), lim);
  return u < lim;
}

/**
 * True when ≥80% of the free allowance is used but at least one question remains today.
 */
export function freeTierApproachingLimit(used, limit) {
  const lim = Math.max(0, Number(limit) || 0);
  if (lim <= 0) return false;
  const u = Math.min(Math.max(0, Number(used) || 0), lim);
  const remaining = lim - u;
  if (remaining <= 0) return false;
  const maxRemainingInWarnBand = Math.ceil(lim * 0.2);
  return remaining <= maxRemainingInWarnBand;
}

/**
 * Hydrate quota from POST /api/gate action:check (optional startup sync).
 * @param {string} email
 * @returns {Promise<number | null>}
 */
export async function hydrateFreeTierFromGateCheck(email) {
  const e = String(email || "").trim();
  if (!e.includes("@")) return null;
  try {
    const r = await fetch("/api/gate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "check", email: e }),
    });
    const d = await r.json().catch(() => ({}));
    if (d?.freeQuota) return syncFreeTierFromServer(d.freeQuota);
    if (d?.used != null) {
      return syncFreeTierFromServer({
        used: d.used,
        limit: d.limit ?? FREE_QUESTION_LIMIT,
        remaining: d.remaining,
        dayKey: getUtcDateKey(),
      });
    }
  } catch {
    /* ignore */
  }
  return null;
}

/**
 * Hydrate anonymous session quota from POST /api/gate action:check.
 * @param {string} [sessionId]
 * @returns {Promise<number | null>}
 */
export async function hydrateSessionQuotaFromGateCheck(sessionId) {
  const sid = String(sessionId || getOrCreateUrSessionId()).trim();
  if (sid.length < 16) return null;
  try {
    const r = await fetch("/api/gate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "check", sessionId: sid }),
    });
    const d = await r.json().catch(() => ({}));
    if (d?.freeQuota) return syncSessionQuotaFromServer(d.freeQuota);
    if (d?.used != null) {
      return syncSessionQuotaFromServer({
        used: d.used,
        limit: d.limit ?? FREE_SESSION_QUESTION_LIMIT,
        remaining: d.remaining,
        scope: "session",
      });
    }
  } catch {
    /* ignore */
  }
  return null;
}
