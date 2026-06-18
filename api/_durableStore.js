import { getEnv } from "./_env.js";

const memStore = new Map();

function resolveKvRestCredentials() {
  const url =
    getEnv("KV_REST_API_URL") ||
    getEnv("VERCEL_KV_REST_API_URL") ||
    getEnv("UPSTASH_REDIS_REST_URL") ||
    getEnv("STORAGE_REST_API_URL") ||
    "";
  const token =
    getEnv("KV_REST_API_TOKEN") ||
    getEnv("VERCEL_KV_REST_API_TOKEN") ||
    getEnv("UPSTASH_REDIS_REST_TOKEN") ||
    getEnv("STORAGE_REST_API_TOKEN") ||
    "";
  return { url, token };
}

const { url: KV_URL, token: KV_TOKEN } = resolveKvRestCredentials();

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

/** After transient quota/rate-limit errors, skip KV briefly (per warm instance). */
const KV_CIRCUIT_COOLDOWN_MS = 60 * 1000;
/** Monthly cap hit — stop hammering Upstash until the window resets. */
const KV_MONTHLY_QUOTA_COOLDOWN_MS = 6 * 60 * 60 * 1000;
/** Dedupe hot-path reads within one warm lambda (WC context does 20+ gets/request). */
const KV_READ_CACHE_TTL_MS = 45 * 1000;
const KV_WARN_DEBOUNCE_MS = 30 * 1000;

let kvCircuitOpenUntil = 0;
let kvLastWarnAt = 0;
let kvMonthlyQuotaExhausted = false;

/** @type {Map<string, { value: unknown, expiresAt: number }>} */
const kvReadCache = new Map();

function kvCircuitOpen() {
  return Date.now() < kvCircuitOpenUntil;
}

/**
 * @param {string} bodySnippet
 */
function isKvMonthlyQuotaBody(bodySnippet) {
  return /max requests limit exceeded/i.test(String(bodySnippet || ""));
}

function readCacheGet(key) {
  const row = kvReadCache.get(key);
  if (!row) return { hit: false, value: null };
  if (Date.now() > row.expiresAt) {
    kvReadCache.delete(key);
    return { hit: false, value: null };
  }
  return { hit: true, value: row.value };
}

function readCacheSet(key, value) {
  kvReadCache.set(key, { value, expiresAt: Date.now() + KV_READ_CACHE_TTL_MS });
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
  const monthly = isKvMonthlyQuotaBody(bodySnippet);
  if (monthly) kvMonthlyQuotaExhausted = true;
  const cooldownMs = monthly ? KV_MONTHLY_QUOTA_COOLDOWN_MS : KV_CIRCUIT_COOLDOWN_MS;
  kvCircuitOpenUntil = Math.max(kvCircuitOpenUntil, Date.now() + cooldownMs);
  const now = Date.now();
  if (now - kvLastWarnAt < KV_WARN_DEBOUNCE_MS) return;
  kvLastWarnAt = now;
  const detail = bodySnippet ? `${op} HTTP ${status}: ${bodySnippet}` : `${op} HTTP ${status}`;
  const label = monthly ? "KV monthly quota exhausted" : "KV quota/rate limit";
  console.warn(`[durableStore] ${label} — circuit open, memory/cache fallback:`, detail);
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

/** @returns {{ ok: boolean, circuitOpen: boolean, monthlyQuotaExhausted: boolean }} */
export function getKvStoreHealth() {
  return {
    ok: hasKvConfig() && !kvCircuitOpen(),
    circuitOpen: kvCircuitOpen(),
    monthlyQuotaExhausted: kvMonthlyQuotaExhausted,
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

async function kvPostCommand(args) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), KV_TIMEOUT_MS);
  let res;
  try {
    res = await fetch(KV_URL.replace(/\/$/, ""), {
      method: "POST",
      headers: {
        Authorization: `Bearer ${KV_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(args),
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
  }

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    const snippet = body.slice(0, 120).replace(/\s+/g, " ").trim();
    tripKvCircuit("post", res.status, snippet);
    const err = new Error(`KV post failed: HTTP ${res.status}`);
    if (res.status === 431) {
      err.code = "KV_HEADER_FIELDS_TOO_LARGE";
      err.payloadBytes = Buffer.byteLength(JSON.stringify(args), "utf8");
    }
    throw err;
  }

  const payload = await res.json();
  return payload?.result;
}

async function kvSet(key, value, ttlSeconds) {
  if (kvCircuitOpen()) {
    throw new Error("KV circuit open");
  }

  const serialized = JSON.stringify(value);
  /** @type {Array<string | number>} */
  const args = ["SET", key, serialized];
  if (Number.isFinite(ttlSeconds) && ttlSeconds > 0) {
    args.push("EX", Math.floor(ttlSeconds));
  }

  try {
    await kvPostCommand(args);
  } catch (err) {
    if (err instanceof Error && err.code === "KV_HEADER_FIELDS_TOO_LARGE") {
      console.error(
        JSON.stringify({
          event: "kv_set_431",
          key,
          payloadBytes: Buffer.byteLength(serialized, "utf8"),
          transport: "post_body",
        }),
      );
    }
    throw err;
  }
}

/** @returns {Promise<boolean>} true when key was created (Redis SET NX) */
async function kvSetNx(key, value, ttlSeconds) {
  if (kvCircuitOpen()) {
    throw new Error("KV circuit open");
  }

  const serialized = JSON.stringify(value);
  /** @type {Array<string | number>} */
  const args = ["SET", key, serialized, "NX"];
  if (Number.isFinite(ttlSeconds) && ttlSeconds > 0) {
    args.splice(args.length - 1, 0, "EX", Math.floor(ttlSeconds));
  }

  const result = await kvPostCommand(args);
  return result === "OK" || result === true;
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
  const cacheHit = readCacheGet(key);
  if (cacheHit.hit) return cacheHit.value;

  if (hasKvConfig() && !kvCircuitOpen()) {
    try {
      const value = await kvGet(key);
      readCacheSet(key, value);
      return value;
    } catch (err) {
      if (!kvCircuitOpen()) warnKvFallback("get", err);
    }
  }

  const mem = getMemEntry(key);
  if (mem !== null) readCacheSet(key, mem);
  return mem;
}

export async function setDurableJson(key, value, options = {}) {
  const ttlSeconds = Number(options.ttlSeconds || 0);

  if (hasKvConfig() && !kvCircuitOpen()) {
    try {
      await kvSet(key, value, ttlSeconds);
      readCacheSet(key, value);
      return;
    } catch (err) {
      if (!kvCircuitOpen()) warnKvFallback("set", err);
    }
  }

  setMemEntry(key, value, ttlSeconds);
  readCacheSet(key, value);
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
