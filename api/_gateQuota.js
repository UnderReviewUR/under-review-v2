/**
 * Free-tier gate quota — shared by api/gate.js and api/ur-take.js.
 * Anonymous: up to 3 questions per sessionId (wc_quota:session:*).
 * Identified: 3 questions per UTC calendar day per email (wc_quota:email:*).
 */

import { getDurableJson, setDurableJson } from "./_durableStore.js";
import { shouldRequireUrTakeAuth } from "./_urTakeAuth.js";

const GATE_TTL_SECONDS = 60 * 60 * 24 * 8;
const SESSION_KEY_PREFIX = "wc_quota:session:";
const EMAIL_KEY_PREFIX = "wc_quota:email:";
const LEGACY_EMAIL_KEY_PREFIX = "gate:";

export const FREE_QUERIES_PER_DAY = 3;
export const FREE_SESSION_QUERIES = 3;

export function isGateServerQuotaEnforce() {
  const v = String(process.env.GATE_SERVER_QUOTA_ENFORCE ?? "")
    .trim()
    .toLowerCase();
  return v === "1" || v === "true" || v === "yes" || v === "on";
}

export function utcDateKey(ms = Date.now()) {
  return new Date(ms).toISOString().slice(0, 10);
}

export function normalizeQuotaEmail(email) {
  return String(email || "")
    .trim()
    .toLowerCase();
}

export function normalizeSessionId(sessionId) {
  return String(sessionId || "")
    .trim()
    .slice(0, 128);
}

export function isValidSessionId(sessionId) {
  const s = normalizeSessionId(sessionId);
  return s.length >= 16 && s.length <= 128;
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
    scope: "email",
  };
}

/**
 * @param {unknown[]} queries
 */
export function buildSessionQuotaPayload(queries) {
  const used = Array.isArray(queries) ? queries.length : 0;
  const capped = Math.min(used, FREE_SESSION_QUERIES);
  return {
    used: capped,
    limit: FREE_SESSION_QUERIES,
    remaining: Math.max(0, FREE_SESSION_QUERIES - capped),
    scope: "session",
  };
}

function sessionStorageKey(sessionId) {
  return SESSION_KEY_PREFIX + normalizeSessionId(sessionId);
}

function emailStorageKey(email) {
  return EMAIL_KEY_PREFIX + normalizeQuotaEmail(email);
}

function legacyEmailStorageKey(email) {
  return LEGACY_EMAIL_KEY_PREFIX + normalizeQuotaEmail(email);
}

async function getSessionRecord(sessionId) {
  const key = sessionStorageKey(sessionId);
  return (await getDurableJson(key)) || { queries: [] };
}

async function setSessionRecord(sessionId, record) {
  await setDurableJson(sessionStorageKey(sessionId), record, {
    ttlSeconds: GATE_TTL_SECONDS,
  });
}

async function getEmailRecord(email) {
  const normalized = normalizeQuotaEmail(email);
  if (!normalized) return { queries: [] };
  const modern = await getDurableJson(emailStorageKey(normalized));
  if (modern) return modern;
  const legacy = await getDurableJson(legacyEmailStorageKey(normalized));
  return legacy || { queries: [] };
}

async function setEmailRecord(email, record) {
  const normalized = normalizeQuotaEmail(email);
  if (!normalized) return;
  await setDurableJson(emailStorageKey(normalized), record, {
    ttlSeconds: GATE_TTL_SECONDS,
  });
}

/**
 * @param {string} email
 * @param {number} [nowMs]
 */
export async function getFreeQuotaStatus(email, nowMs = Date.now()) {
  try {
    const normalized = normalizeQuotaEmail(email);
    if (!normalized) {
      return buildFreeQuotaPayload([], nowMs);
    }
    const record = await getEmailRecord(normalized);
    return buildFreeQuotaPayload(record.queries || [], nowMs);
  } catch (err) {
    console.warn("[gate-quota] getFreeQuotaStatus failed open:", err?.message || err);
    return buildFreeQuotaPayload([], nowMs);
  }
}

/**
 * @param {string} sessionId
 */
export async function getSessionQuotaStatus(sessionId) {
  try {
    if (!isValidSessionId(sessionId)) {
      return buildSessionQuotaPayload([]);
    }
    const record = await getSessionRecord(sessionId);
    return buildSessionQuotaPayload(record.queries || []);
  } catch (err) {
    console.warn("[gate-quota] getSessionQuotaStatus failed open:", err?.message || err);
    return buildSessionQuotaPayload([]);
  }
}

/**
 * @param {object} opts
 * @param {boolean} [opts.enforceFlag]
 * @param {boolean} [opts.dailyTakePipeline]
 * @param {{ ok?: boolean, email?: string | null, sessionId?: string | null, tier?: string } | null} [opts.urAuth]
 */
export function shouldEnforceGateQuotaForTake(opts = {}) {
  const enforceFlag = opts.enforceFlag ?? isGateServerQuotaEnforce();
  if (!enforceFlag) return false;
  if (opts.dailyTakePipeline) return false;
  if (!shouldRequireUrTakeAuth()) return false;
  const urAuth = opts.urAuth;
  if (!urAuth?.ok) return false;
  const tier = String(urAuth.tier || "free").toLowerCase();
  if (tier === "pro" || tier === "owner" || tier === "friend") return false;
  if (urAuth.email || urAuth.sessionId) return true;
  return false;
}

/**
 * @param {string} email
 * @param {number} [nowMs]
 */
export async function reserveGateQuota(email, nowMs = Date.now()) {
  try {
    const normalized = normalizeQuotaEmail(email);
    const record = (await getEmailRecord(normalized)) || { queries: [], emailVerified: true };
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
    await setEmailRecord(normalized, { ...record, queries, lastSeen: nowMs });

    return {
      limitReached: false,
      reservationTs,
      freeQuota: buildFreeQuotaPayload(queries, nowMs),
    };
  } catch (err) {
    console.warn("[gate-quota] reserve failed closed:", err?.message || err);
    return {
      limitReached: false,
      reservationTs: null,
      storageUnavailable: true,
      freeQuota: buildFreeQuotaPayload([], nowMs),
    };
  }
}

/**
 * @param {string} sessionId
 * @param {number} [nowMs]
 */
export async function reserveSessionQuota(sessionId, nowMs = Date.now()) {
  try {
    if (!isValidSessionId(sessionId)) {
      return {
        limitReached: true,
        emailRequired: true,
        reservationTs: null,
        freeQuota: buildSessionQuotaPayload([]),
      };
    }
    const record = (await getSessionRecord(sessionId)) || { queries: [] };
    const queries = Array.isArray(record.queries) ? [...record.queries] : [];

    if (queries.length >= FREE_SESSION_QUERIES) {
      return {
        limitReached: true,
        emailRequired: true,
        reservationTs: null,
        freeQuota: buildSessionQuotaPayload(queries),
      };
    }

    const reservationTs = nowMs;
    queries.push(reservationTs);
    await setSessionRecord(sessionId, { ...record, queries, lastSeen: nowMs });

    return {
      limitReached: false,
      emailRequired: false,
      reservationTs,
      freeQuota: buildSessionQuotaPayload(queries),
    };
  } catch (err) {
    console.warn("[gate-quota] reserveSession failed closed:", err?.message || err);
    return {
      limitReached: false,
      emailRequired: false,
      reservationTs: null,
      storageUnavailable: true,
      freeQuota: buildSessionQuotaPayload([]),
    };
  }
}

/**
 * Reserve free-tier quota once per /api/ur-take request (before any answer path).
 * Caller sets `delivered` on success responses; otherwise release in `finally`.
 *
 * @param {{ urAuth: { ok?: boolean, email?: string | null, sessionId?: string | null, tier?: string } | null, dailyTakePipeline?: boolean }} opts
 */
export async function reserveUrTakeGateQuota(opts = {}) {
  const { urAuth, dailyTakePipeline = false } = opts;
  const enforce = shouldEnforceGateQuotaForTake({
    enforceFlag: isGateServerQuotaEnforce(),
    dailyTakePipeline,
    urAuth,
  });

  if (!enforce) {
    return { ok: true, enforced: false };
  }

  const gateQuotaEmail =
    urAuth?.ok && urAuth.email ? String(urAuth.email).toLowerCase().trim() : null;
  const gateQuotaSessionId =
    urAuth?.ok && !gateQuotaEmail && urAuth.sessionId
      ? String(urAuth.sessionId).trim()
      : null;

  if (gateQuotaEmail) {
    const reserved = await reserveGateQuota(gateQuotaEmail);
    if (reserved.storageUnavailable) {
      return { ok: false, reason: "storage_unavailable" };
    }
    if (reserved.limitReached) {
      return {
        ok: false,
        reason: "limit_reached",
        statusBody: {
          limitReached: true,
          code: "limit_reached",
          freeQuota: reserved.freeQuota,
        },
      };
    }
    const reservation =
      reserved.reservationTs != null
        ? { kind: "email", id: gateQuotaEmail, reservationTs: reserved.reservationTs }
        : null;
    return {
      ok: true,
      enforced: true,
      gateQuotaEmail,
      gateQuotaSessionId: null,
      reservation,
    };
  }

  if (gateQuotaSessionId) {
    const reserved = await reserveSessionQuota(gateQuotaSessionId);
    if (reserved.storageUnavailable) {
      return { ok: false, reason: "storage_unavailable" };
    }
    if (reserved.limitReached) {
      return {
        ok: false,
        reason: "email_required",
        statusBody: {
          limitReached: true,
          code: "email_required",
          reason: "email_required",
          freeQuota: reserved.freeQuota,
        },
      };
    }
    const reservation =
      reserved.reservationTs != null
        ? { kind: "session", id: gateQuotaSessionId, reservationTs: reserved.reservationTs }
        : null;
    return {
      ok: true,
      enforced: true,
      gateQuotaEmail: null,
      gateQuotaSessionId,
      reservation,
    };
  }

  return { ok: true, enforced: false };
}

/**
 * @param {{ gateQuotaEmail: string | null, gateQuotaSessionId: string | null }} ids
 */
export async function attachFreeQuotaMirrorToUrTakeResponse(body, ids) {
  if (ids.gateQuotaEmail) {
    try {
      body.freeQuota = await getFreeQuotaStatus(ids.gateQuotaEmail);
    } catch {
      /* optional mirror payload */
    }
  } else if (ids.gateQuotaSessionId) {
    try {
      body.freeQuota = await getSessionQuotaStatus(ids.gateQuotaSessionId);
    } catch {
      /* optional mirror payload */
    }
  }
}

/**
 * @param {string} email
 * @param {number | null} reservationTs
 * @param {number} [nowMs]
 */
export async function releaseGateQuota(email, reservationTs, nowMs = Date.now()) {
  if (reservationTs == null || !Number.isFinite(Number(reservationTs))) return;
  try {
    const normalized = normalizeQuotaEmail(email);
    const record = await getEmailRecord(normalized);
    if (!record) return;
    const target = Number(reservationTs);
    const queries = (record.queries || []).filter((ts) => Number(ts) !== target);
    await setEmailRecord(normalized, { ...record, queries, lastSeen: nowMs });
  } catch (err) {
    console.warn("[gate-quota] release failed:", err?.message || err);
  }
}

/**
 * @param {string} sessionId
 * @param {number | null} reservationTs
 * @param {number} [nowMs]
 */
export async function releaseSessionQuota(sessionId, reservationTs, nowMs = Date.now()) {
  if (reservationTs == null || !Number.isFinite(Number(reservationTs))) return;
  try {
    if (!isValidSessionId(sessionId)) return;
    const record = await getSessionRecord(sessionId);
    if (!record) return;
    const target = Number(reservationTs);
    const queries = (record.queries || []).filter((ts) => Number(ts) !== target);
    await setSessionRecord(sessionId, { ...record, queries, lastSeen: nowMs });
  } catch (err) {
    console.warn("[gate-quota] releaseSession failed:", err?.message || err);
  }
}

/**
 * Merge anonymous session usage into email quota (wc_quota:email).
 * @param {string} sessionId
 * @param {string} email
 * @param {number} [nowMs]
 */
export async function migrateSessionQuotaToEmail(sessionId, email, nowMs = Date.now()) {
  const normalizedEmail = normalizeQuotaEmail(email);
  const sid = normalizeSessionId(sessionId);
  if (!normalizedEmail || !isValidSessionId(sid)) {
    return { ok: false, freeQuota: buildFreeQuotaPayload([], nowMs) };
  }

  const sessionRecord = await getSessionRecord(sid);
  const emailRecord = (await getEmailRecord(normalizedEmail)) || { queries: [] };
  const sessionQueries = Array.isArray(sessionRecord?.queries) ? sessionRecord.queries : [];
  const emailQueries = Array.isArray(emailRecord.queries) ? [...emailRecord.queries] : [];
  const merged = [...new Set([...emailQueries.map(Number), ...sessionQueries.map(Number)])].filter(
    (n) => Number.isFinite(n) && n > 0,
  );
  merged.sort((a, b) => a - b);

  await setEmailRecord(normalizedEmail, {
    ...emailRecord,
    queries: merged,
    migratedFromSession: sid,
    migratedAt: nowMs,
    lastSeen: nowMs,
  });

  await setSessionRecord(sid, { queries: [], migratedToEmail: normalizedEmail, migratedAt: nowMs });

  return {
    ok: true,
    freeQuota: buildFreeQuotaPayload(merged, nowMs),
  };
}

/**
 * @param {string} email
 * @param {number} [nowMs]
 */
export async function appendGateQuery(email, nowMs = Date.now()) {
  return await reserveGateQuota(email, nowMs);
}

/**
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
 * @param {string} sessionId
 * @param {number} [nowMs]
 */
export async function consumeSessionQuery(sessionId, nowMs = Date.now()) {
  const r = await reserveSessionQuota(sessionId, nowMs);
  return {
    ok: !r.limitReached,
    used: r.freeQuota?.used ?? 0,
    remaining: r.freeQuota?.remaining ?? 0,
    freeQuota: r.freeQuota,
    emailRequired: Boolean(r.emailRequired),
  };
}

/**
 * @param {string} email
 * @param {number} [nowMs]
 */
export async function checkGateQuotaAllowed(email, nowMs = Date.now()) {
  try {
    const normalized = normalizeQuotaEmail(email);
    const record = (await getEmailRecord(normalized)) || { queries: [] };
    const freeQuota = buildFreeQuotaPayload(record.queries || [], nowMs);
    if (freeQuota.used >= FREE_QUERIES_PER_DAY) {
      return { allowed: false, reason: "limit_reached", freeQuota };
    }
    return { allowed: true, freeQuota };
  } catch (err) {
    console.warn("[gate-quota] check failed closed:", err?.message || err);
    return {
      allowed: false,
      reason: "storage_unavailable",
      freeQuota: buildFreeQuotaPayload([], nowMs),
      storageUnavailable: true,
    };
  }
}

/**
 * @param {string} sessionId
 */
export async function checkSessionQuotaAllowed(sessionId) {
  try {
    const freeQuota = await getSessionQuotaStatus(sessionId);
    if (freeQuota.used >= FREE_SESSION_QUERIES) {
      return { allowed: false, reason: "email_required", freeQuota };
    }
    return { allowed: true, freeQuota };
  } catch (err) {
    console.warn("[gate-quota] checkSession failed closed:", err?.message || err);
    return {
      allowed: false,
      reason: "storage_unavailable",
      freeQuota: buildSessionQuotaPayload([]),
      storageUnavailable: true,
    };
  }
}
