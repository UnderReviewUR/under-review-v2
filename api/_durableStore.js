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

async function kvGet(key) {
  const endpoint = `${KV_URL.replace(/\/$/, "")}/get/${encodeURIComponent(key)}`;
  const res = await fetch(endpoint, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${KV_TOKEN}`,
    },
  });

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

  const res = await fetch(endpoint, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${KV_TOKEN}`,
    },
  });

  if (!res.ok) {
    throw new Error(`KV set failed: HTTP ${res.status}`);
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
