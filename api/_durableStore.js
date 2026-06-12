import { getEnv } from "./_env.js";

const memStore = new Map();

const KV_URL =
  getEnv("KV_REST_API_URL") ||
  getEnv("VERCEL_KV_REST_API_URL") ||
  "";
const KV_TOKEN =
  getEnv("KV_REST_API_TOKEN") ||
  getEnv("VERCEL_KV_REST_API_TOKEN") ||
  "";

function hasKvConfig() {
  return Boolean(KV_URL && KV_TOKEN);
}

function getMemEntry(key) {
  const entry = memStore.get(key);
  if (!entry) return null;
  if (entry.expiresAt && Date.now() > entry.expiresAt) {
    memStore.delete(key);
    return null;
  }
  return entry.value;
}

function setMemEntry(key, value, ttlSeconds) {
  const expiresAt =
    Number.isFinite(ttlSeconds) && ttlSeconds > 0
      ? Date.now() + ttlSeconds * 1000
      : null;
  memStore.set(key, { value, expiresAt });
}

const KV_TIMEOUT_MS = 8000;

/** After quota/rate-limit errors, skip KV for this window (per warm instance). */
const KV_CIRCUIT_COOLDOWN_MS = 60 * 1000;
const KV_WARN_DEBOUNCE_MS = 30 * 1000;

let kvCircuitOpenUntil = 0;
let kvLastWarnAt = 0;

function kvCircuitOpen() {
  return Date.now() < kvCircuitOpenUntil;
}

/**
 * @param {number} status
 */
function isKvQuotaOrRateLimitStatus(status) {
  return status === 400 || status === 429;
}

/**
 * @param {string} op
 * @param {number} status
 * @param {string} [bodySnippet]
 */
function tripKvCircuit(op, status, bodySnippet = "") {
  if (!isKvQuotaOrRateLimitStatus(status)) return;
  kvCircuitOpenUntil = Date.now() + KV_CIRCUIT_COOLDOWN_MS;
  const now = Date.now();
  if (now - kvLastWarnAt < KV_WARN_DEBOUNCE_MS) return;
  kvLastWarnAt = now;
  const detail = bodySnippet ? `${op} HTTP ${status}: ${bodySnippet}` : `${op} HTTP ${status}`;
  console.warn("[durableStore] KV quota/rate limit — circuit open, memory fallback:", detail);
}

/**
 * @param {string} op
 * @param {unknown} err
 */
function warnKvFallback(op, err) {
  const now = Date.now();
  if (now - kvLastWarnAt < KV_WARN_DEBOUNCE_MS) return;
  kvLastWarnAt = now;
  const msg = err instanceof Error ? err.message : String(err);
  console.warn(`[durableStore] KV ${op} failed, using memory fallback:`, msg);
}

/** @returns {{ ok: boolean, circuitOpen: boolean }} */
export function getKvStoreHealth() {
  return {
    ok: hasKvConfig() && !kvCircuitOpen(),
    circuitOpen: kvCircuitOpen(),
  };
}

async function kvGet(key) {
  if (kvCircuitOpen()) {
    throw new Error("KV circuit open");
  }

  const endpoint = `${KV_URL.replace(/\/$/, "")}/get/${encodeURIComponent(key)}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), KV_TIMEOUT_MS);
  let res;
  try {
    res = await fetch(endpoint, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${KV_TOKEN}`,
      },
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
  }

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    const snippet = body.slice(0, 120).replace(/\s+/g, " ").trim();
    tripKvCircuit("get", res.status, snippet);
    throw new Error(`KV get failed: HTTP ${res.status}`);
  }

  const payload = await res.json();
  const raw = payload?.result;
  if (raw == null) return null;
  if (typeof raw !== "string") return raw;

  try {
    return JSON.parse(raw);
  } catch {
    return raw;
  }
}

async function kvSet(key, value, ttlSeconds) {
  if (kvCircuitOpen()) {
    throw new Error("KV circuit open");
  }

  const encodedValue = encodeURIComponent(JSON.stringify(value));
  let endpoint = `${KV_URL.replace(/\/$/, "")}/set/${encodeURIComponent(key)}/${encodedValue}`;

  if (Number.isFinite(ttlSeconds) && ttlSeconds > 0) {
    endpoint += `?EX=${Math.floor(ttlSeconds)}`;
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), KV_TIMEOUT_MS);
  let res;
  try {
    res = await fetch(endpoint, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${KV_TOKEN}`,
      },
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
  }

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    const snippet = body.slice(0, 120).replace(/\s+/g, " ").trim();
    tripKvCircuit("set", res.status, snippet);
    throw new Error(`KV set failed: HTTP ${res.status}`);
  }
}

/** @returns {Promise<boolean>} true when key was created (Redis SET NX) */
async function kvSetNx(key, value, ttlSeconds) {
  if (kvCircuitOpen()) {
    throw new Error("KV circuit open");
  }

  const encodedValue = encodeURIComponent(JSON.stringify(value));
  let endpoint = `${KV_URL.replace(/\/$/, "")}/set/${encodeURIComponent(key)}/${encodedValue}/NX`;
  if (Number.isFinite(ttlSeconds) && ttlSeconds > 0) {
    endpoint += `/EX/${Math.floor(ttlSeconds)}`;
  }

  const res = await fetch(endpoint, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${KV_TOKEN}`,
    },
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    const snippet = body.slice(0, 120).replace(/\s+/g, " ").trim();
    tripKvCircuit("setNx", res.status, snippet);
    throw new Error(`KV set NX failed: HTTP ${res.status}`);
  }

  const payload = await res.json();
  const raw = payload?.result;
  return raw === "OK" || raw === true;
}

async function kvDel(key) {
  if (kvCircuitOpen()) {
    throw new Error("KV circuit open");
  }

  const endpoint = `${KV_URL.replace(/\/$/, "")}/del/${encodeURIComponent(key)}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), KV_TIMEOUT_MS);
  let res;
  try {
    res = await fetch(endpoint, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${KV_TOKEN}`,
      },
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
  }

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    const snippet = body.slice(0, 120).replace(/\s+/g, " ").trim();
    tripKvCircuit("del", res.status, snippet);
    throw new Error(`KV del failed: HTTP ${res.status}`);
  }
}

export async function getDurableJson(key) {
  if (hasKvConfig() && !kvCircuitOpen()) {
    try {
      return await kvGet(key);
    } catch (err) {
      if (!kvCircuitOpen()) warnKvFallback("get", err);
    }
  }

  return getMemEntry(key);
}

export async function setDurableJson(key, value, options = {}) {
  const ttlSeconds = Number(options.ttlSeconds || 0);

  if (hasKvConfig() && !kvCircuitOpen()) {
    try {
      await kvSet(key, value, ttlSeconds);
      return;
    } catch (err) {
      if (!kvCircuitOpen()) warnKvFallback("set", err);
    }
  }

  setMemEntry(key, value, ttlSeconds);
}

/**
 * Set JSON only if the key is absent (SET NX). Used for one-time claims (e.g. magic-link verify).
 * @param {string} key
 * @param {unknown} value
 * @param {{ ttlSeconds?: number }} [options]
 * @returns {Promise<boolean>} true if the key was created
 */
export async function setDurableJsonIfAbsent(key, value, options = {}) {
  const ttlSeconds = Number(options.ttlSeconds || 0);

  if (hasKvConfig() && !kvCircuitOpen()) {
    try {
      return await kvSetNx(key, value, ttlSeconds);
    } catch (err) {
      if (!kvCircuitOpen()) warnKvFallback("setNx", err);
    }
  }

  if (getMemEntry(key) != null) return false;
  setMemEntry(key, value, ttlSeconds);
  return true;
}

/** List keys with prefix (memory map or Redis SCAN). Used for aggregate-only server metrics. */
export async function listKeysWithPrefix(prefix) {
  const p = String(prefix || "");
  if (!p) return [];

  if (!hasKvConfig() || kvCircuitOpen()) {
    const keys = [];
    for (const k of memStore.keys()) {
      if (String(k).startsWith(p)) keys.push(String(k));
    }
    return keys;
  }

  let cursor = "0";
  const keys = [];
  const base = KV_URL.replace(/\/$/, "");
  const matchPattern = `${p}*`;

  try {
    do {
      const url = `${base}/scan/${encodeURIComponent(cursor)}?match=${encodeURIComponent(matchPattern)}&count=500`;
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), KV_TIMEOUT_MS);
      let res;
      try {
        res = await fetch(url, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${KV_TOKEN}`,
          },
          signal: controller.signal,
        });
      } finally {
        clearTimeout(timer);
      }
      if (!res.ok) {
        const body = await res.text().catch(() => "");
        const snippet = body.slice(0, 120).replace(/\s+/g, " ").trim();
        tripKvCircuit("scan", res.status, snippet);
        throw new Error(`KV scan failed: HTTP ${res.status}`);
      }
      const payload = await res.json();
      const result = payload?.result;
      const nextCursor = Array.isArray(result) ? result[0] : result?.[0];
      const batch = Array.isArray(result) ? result[1] : result?.[1];
      cursor = nextCursor != null ? String(nextCursor) : "0";
      if (Array.isArray(batch)) {
        for (const k of batch) {
          if (k) keys.push(String(k));
        }
      }
    } while (cursor !== "0");
  } catch (err) {
    warnKvFallback("scan", err);
    return [];
  }

  return keys;
}

/** Best-effort delete (KV + in-memory fallback). */
export async function deleteDurableJson(key) {
  if (hasKvConfig() && !kvCircuitOpen()) {
    try {
      await kvDel(key);
    } catch (err) {
      if (!kvCircuitOpen()) warnKvFallback("del", err);
    }
  }

  memStore.delete(key);
}
