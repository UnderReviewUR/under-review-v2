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

async function kvGet(key) {
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
    throw new Error(`KV set failed: HTTP ${res.status}`);
  }
}

/** @returns {Promise<boolean>} true when key was created (Redis SET NX) */
async function kvSetNx(key, value, ttlSeconds) {
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
    throw new Error(`KV set NX failed: HTTP ${res.status}`);
  }

  const payload = await res.json();
  const raw = payload?.result;
  return raw === "OK" || raw === true;
}

async function kvDel(key) {
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
    throw new Error(`KV del failed: HTTP ${res.status}`);
  }
}

export async function getDurableJson(key) {
  if (hasKvConfig()) {
    try {
      return await kvGet(key);
    } catch (err) {
      console.warn("[durableStore] KV get failed, using memory fallback:", err.message);
    }
  }

  return getMemEntry(key);
}

export async function setDurableJson(key, value, options = {}) {
  const ttlSeconds = Number(options.ttlSeconds || 0);

  if (hasKvConfig()) {
    try {
      await kvSet(key, value, ttlSeconds);
      return;
    } catch (err) {
      console.warn("[durableStore] KV set failed, using memory fallback:", err.message);
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

  if (hasKvConfig()) {
    try {
      return await kvSetNx(key, value, ttlSeconds);
    } catch (err) {
      console.warn("[durableStore] KV set NX failed, using memory fallback:", err.message);
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

  if (!hasKvConfig()) {
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
    console.warn("[durableStore] KV scan failed:", err?.message || err);
    return [];
  }

  return keys;
}

/** Best-effort delete (KV + in-memory fallback). */
export async function deleteDurableJson(key) {
  if (hasKvConfig()) {
    try {
      await kvDel(key);
    } catch (err) {
      console.warn("[durableStore] KV del failed, clearing memory fallback:", err.message);
    }
  }

  memStore.delete(key);
}
